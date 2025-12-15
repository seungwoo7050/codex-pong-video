import { createClient, commandOptions } from 'redis'
import { spawn } from 'child_process'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { assertNonTrivialFrames, validateProbeOutput } from './validation'
import { buildEncoderPlan } from './encoderConfig'

/**
 * [엔트리] worker/src/index.ts
 * 설명:
 *   - Redis Streams에서 내보내기 요청을 소비하고 ffmpeg/ffprobe로 MP4·썸네일 산출물을 생성한다.
 *   - 진행률/결과를 Streams로 다시 발행하여 백엔드가 상태를 갱신하도록 한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
const REQUEST_STREAM = 'replay.export.request'
const PROGRESS_STREAM = 'replay.export.progress'
const RESULT_STREAM = 'replay.export.result'
const GROUP = 'export-worker'
const CONSUMER = `worker-${process.pid}`

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
const STORAGE_ROOT = process.env.APP_STORAGE_ROOT ?? '/tmp/codexpong-storage'
const EXPORT_DIR = process.env.APP_STORAGE_EXPORT ?? 'exports'
const PREFER_HW_ENV = (process.env.EXPORT_HW_ACCEL ?? 'false').toLowerCase() === 'true'

interface ExportMessage {
  jobId: string
  replayId: string
  ownerId: string
  type: 'MP4' | 'THUMBNAIL'
  eventPath: string
  outputDir: string
  durationMillis: number
  preferHw: boolean
}

let cachedEncoderList: string[] | null = null

async function main() {
  const client = createClient({ url: `redis://${REDIS_HOST}:6379` })
  client.on('error', (err) => console.error('Redis 오류', err))
  await client.connect()
  await ensureGroup(client)
  console.log('worker 시작, Redis 연결 완료')

  while (true) {
    const response = await client.xReadGroup(
      commandOptions({ isolated: true }),
      GROUP,
      CONSUMER,
      [{ key: REQUEST_STREAM, id: '>' }],
      { BLOCK: 5000, COUNT: 1 },
    )
    if (!response) {
      continue
    }
    await handleResponse(client, response)
  }
}

async function ensureGroup(client: ReturnType<typeof createClient>) {
  try {
    await client.xGroupCreate(REQUEST_STREAM, GROUP, '$', { MKSTREAM: true })
  } catch (err: any) {
    if (typeof err?.message === 'string' && err.message.includes('BUSYGROUP')) {
      return
    }
    console.error('소비자 그룹 생성 실패', err)
  }
}

async function handleResponse(client: ReturnType<typeof createClient>, response: Awaited<ReturnType<typeof client.xReadGroup>>) {
  for (const stream of response) {
    for (const message of stream.messages) {
      const fields = Object.fromEntries(message.message) as Record<string, string>
      const parsed = parseExportMessage(fields)
      try {
        await publishProgress(client, parsed.jobId, 5, '작업 수신')
        const result = parsed.type === 'MP4' ? await renderMp4(client, parsed) : await renderThumbnail(client, parsed)
        await publishResult(client, parsed.jobId, {
          status: 'SUCCEEDED',
          artifactPath: result.artifactPath,
          checksum: result.checksum,
          sizeBytes: result.sizeBytes,
          durationMillis: result.durationMillis,
        })
      } catch (err: any) {
        const errorCode = err?.message === 'EXPORT_TRIVIAL_FRAMES' ? 'EXPORT_TRIVIAL_FRAMES' : err?.message ?? 'UNKNOWN_ERROR'
        await publishResult(client, parsed.jobId, {
          status: 'FAILED',
          error_code: errorCode,
          error_message: err?.stack ?? String(err),
          logTail: Array.isArray(err?.logTail) ? err.logTail.join(' | ') : undefined,
        })
      } finally {
        await client.xAck(REQUEST_STREAM, GROUP, message.id)
      }
    }
  }
}

function parseExportMessage(fields: Record<string, string>): ExportMessage {
  return {
    jobId: fields.jobId,
    replayId: fields.replayId,
    ownerId: fields.ownerId,
    type: fields.type as 'MP4' | 'THUMBNAIL',
    eventPath: fields.eventPath,
    outputDir: fields.outputDir ?? path.join(STORAGE_ROOT, EXPORT_DIR, fields.ownerId, fields.replayId),
    durationMillis: Number(fields.durationMillis ?? '5000'),
    preferHw: fields.preferHw === 'true' || PREFER_HW_ENV,
  }
}

async function renderMp4(client: ReturnType<typeof createClient>, message: ExportMessage) {
  const exportDir = message.outputDir
  await fsp.mkdir(exportDir, { recursive: true })
  const tempPath = path.join(exportDir, `${message.jobId}.tmp.mp4`)
  const finalPath = path.join(exportDir, `${message.jobId}.mp4`)
  await publishProgress(client, message.jobId, 10, 'ffmpeg 시작')
  const logTail: string[] = []
  const encoderPlan = await resolveEncoderPlan(message.preferHw, logTail)
  const baseArgs = [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=640x360:d=${Math.max(message.durationMillis / 1000, 1)}`,
    '-vf',
    `drawtext=text='Replay ${message.replayId} %{eif\\:t\\:d}ms':fontcolor=white:fontsize=32:x=20:y=20`,
    '-pix_fmt',
    'yuv420p',
    '-progress',
    'pipe:1',
    '-nostats',
  ]
  let lastError: any = null
  for (let i = 0; i < encoderPlan.length; i += 1) {
    const encoder = encoderPlan[i]
    if (encoder.fallbackNote) {
      logTail.push(encoder.fallbackNote)
      console.warn('[hwaccel]', encoder.fallbackNote)
      if (encoder.fallbackNote === 'HWACCEL_HANDSHAKE_FAILED') {
        await publishProgress(client, message.jobId, 10, 'HW 가속 실패, 소프트웨어 폴백 중').catch(() => {})
      }
    }
    try {
      await runFfmpeg(
        client,
        [...encoder.preArgs, ...baseArgs, '-c:v', encoder.codec, tempPath],
        message.durationMillis,
        message.jobId,
        logTail,
      )
      lastError = null
      break
    } catch (err) {
      lastError = err
      if (i >= encoderPlan.length - 1) {
        throw err
      }
    }
  }
  if (lastError) {
    throw lastError
  }
  const probe = await probeFile(tempPath)
  const validated = validateProbeOutput(probe)
  const firstHash = await extractFrameHash(tempPath, validated.durationMs * 0.1)
  const lastHash = await extractFrameHash(tempPath, validated.durationMs * 0.9)
  assertNonTrivialFrames(firstHash, lastHash)
  await publishProgress(client, message.jobId, 95, '검증 중')
  await fsp.rename(tempPath, finalPath)
  const checksum = await sha256File(finalPath)
  const sizeBytes = (await fsp.stat(finalPath)).size
  await publishProgress(client, message.jobId, 100, '완료')
  return { artifactPath: finalPath, checksum, sizeBytes, durationMillis: validated.durationMs }
}

async function renderThumbnail(client: ReturnType<typeof createClient>, message: ExportMessage) {
  const exportDir = message.outputDir
  await fsp.mkdir(exportDir, { recursive: true })
  const tempPath = path.join(exportDir, `${message.jobId}.tmp.png`)
  const finalPath = path.join(exportDir, `${message.jobId}.png`)
  const logTail: string[] = []
  await runFfmpeg(
    client,
    ['-y', '-f', 'lavfi', '-i', `color=c=blue:s=640x360:d=1`, '-vf',
      `drawtext=text='Replay ${message.replayId} thumbnail':fontcolor=white:fontsize=28:x=20:y=20`,
      '-frames:v', '1', tempPath],
    1000,
    message.jobId,
    logTail,
  )
  const checksum = await sha256File(tempPath)
  await fsp.rename(tempPath, finalPath)
  const sizeBytes = (await fsp.stat(finalPath)).size
  return { artifactPath: finalPath, checksum, sizeBytes, durationMillis: 0 }
}

async function runFfmpeg(
  client: ReturnType<typeof createClient>,
  args: string[],
  durationMs: number,
  jobId: string,
  logTail: string[],
) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let killed = false
    const timer = setTimeout(() => {
      killed = true
      proc.kill('SIGKILL')
      const error: any = new Error('FFMPEG_TIMEOUT')
      error.logTail = [...logTail]
      reject(error)
    }, Math.max(durationMs * 2, 5000))

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      text.split('\n').forEach((line: string) => {
        if (line.startsWith('out_time_ms=')) {
          const out = Number(line.replace('out_time_ms=', '').trim())
          if (Number.isFinite(out)) {
            const pct = Math.min(90, Math.floor((out / (durationMs * 1000)) * 100))
            publishProgress(client, jobId, pct, 'ffmpeg 처리 중').catch(() => {})
          }
        }
      })
    })
    proc.stderr.on('data', (chunk) => {
      const line = chunk.toString().trim()
      if (!line) return
      logTail.push(line)
      if (logTail.length > 20) {
        logTail.shift()
      }
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      if (killed) return
      if (code !== 0) {
        const error: any = new Error('FFMPEG_EXIT_NONZERO')
        error.logTail = [...logTail]
        reject(error)
        return
      }
      resolve()
    })
  })
}

async function resolveEncoderPlan(preferHw: boolean, logTail: string[]) {
  const available = await detectHardwareEncoders()
  const plan = buildEncoderPlan(preferHw, available)
  if (plan[0]?.fallbackNote && plan.length === 1) {
    console.warn('[hwaccel]', plan[0].fallbackNote)
    logTail.push(plan[0].fallbackNote)
  }
  return plan
}

async function detectHardwareEncoders(): Promise<string[]> {
  if (cachedEncoderList) {
    return cachedEncoderList
  }
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-encoders'])
    const lines: string[] = []
    proc.stdout.on('data', (chunk) => {
      lines.push(...chunk.toString().split('\n'))
    })
    proc.on('close', () => {
      const targets = ['h264_nvenc', 'h264_vaapi', 'h264_qsv']
      const detected = targets.filter((name) => lines.some((line) => line.toLowerCase().includes(name)))
      cachedEncoderList = detected
      resolve(detected)
    })
    proc.on('error', () => resolve([]))
  })
}

async function probeFile(filePath: string) {
  return new Promise<any>((resolve, reject) => {
    const proc = spawn('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath])
    const chunks: Buffer[] = []
    proc.stdout.on('data', (c) => chunks.push(c))
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('FFPROBE_INVALID_OUTPUT'))
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString())
        resolve(parsed)
      } catch (err) {
        reject(new Error('FFPROBE_INVALID_OUTPUT'))
      }
    })
  })
}

async function extractFrameHash(filePath: string, timestampMs: number) {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-ss', (timestampMs / 1000).toString(), '-i', filePath, '-frames:v', '1', '-f', 'image2pipe', '-'])
    const chunks: Buffer[] = []
    proc.stdout.on('data', (c) => chunks.push(c))
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('EXPORT_TRIVIAL_FRAMES'))
        return
      }
      const hash = crypto.createHash('sha256').update(Buffer.concat(chunks)).digest('hex')
      resolve(hash)
    })
  })
}

async function sha256File(filePath: string) {
  const hash = crypto.createHash('sha256')
  return new Promise<string>((resolve, reject) => {
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(`sha256:${hash.digest('hex')}`))
    stream.on('error', (err) => reject(err))
  })
}

async function publishProgress(client: ReturnType<typeof createClient>, jobId: string, progress: number, message: string) {
  await client.xAdd(PROGRESS_STREAM, '*', {
    schemaVersion: '1',
    jobId,
    progress: progress.toString(),
    message,
  })
}

async function publishResult(
  client: ReturnType<typeof createClient>,
  jobId: string,
  result:
    | { status: 'SUCCEEDED'; artifactPath: string; checksum: string; sizeBytes: number; durationMillis: number }
    | { status: 'FAILED'; error_code: string; error_message: string; logTail?: string },
) {
  await client.xAdd(RESULT_STREAM, '*', {
    schemaVersion: '1',
    jobId,
    ...Object.fromEntries(
      Object.entries(result)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  })
}

main().catch((err) => {
  console.error('worker 처리 실패', err)
  process.exit(1)
})
