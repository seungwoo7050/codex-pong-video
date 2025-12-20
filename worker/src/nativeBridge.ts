import { spawn } from 'child_process'
import path from 'path'
import { ERROR_CODES } from './errorCodes'

/**
 * [브리지] worker/src/nativeBridge.ts
 * 설명:
 *   - Native Helper 프로세스를 실행해 프레임 유사도를 계산한다.
 *   - 표준 출력 JSON을 파싱해 diff_score를 반환한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
export class NativeBridge {
  private helperPath: string

  constructor(helperPath?: string) {
    const defaultPath = path.resolve(__dirname, '..', 'native', 'build', 'native_helper')
    this.helperPath = helperPath ?? process.env.NATIVE_HELPER_PATH ?? defaultPath
  }

  async analyzeFrames(firstFramePath: string, secondFramePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const commandPlan = buildHelperCommand(this.helperPath, [firstFramePath, secondFramePath])
      const proc = spawn(commandPlan.command, commandPlan.args, { stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''

      proc.stdout.setEncoding('utf8')
      proc.stderr.setEncoding('utf8')

      proc.stdout.on('data', (chunk) => {
        stdout += chunk
      })
      proc.stderr.on('data', (chunk) => {
        stderr += chunk
      })
      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT' && commandPlan.fallback) {
          runWithFallback(commandPlan.fallback, [firstFramePath, secondFramePath], resolve, reject)
          return
        }
        const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
        error.detail = err
        reject(error)
      })
      proc.on('close', (code) => {
        if (code !== 0) {
          const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
          error.logTail = [stderr.trim()].filter(Boolean)
          reject(error)
          return
        }
        try {
          const parsed = JSON.parse(stdout.trim()) as { status: string; diff_score?: number }
          if (parsed.status !== 'success' || typeof parsed.diff_score !== 'number') {
            const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
            error.logTail = [stderr.trim(), stdout.trim()].filter(Boolean)
            reject(error)
            return
          }
          resolve(parsed.diff_score)
        } catch (err) {
          const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
          error.logTail = [stderr.trim(), stdout.trim()].filter(Boolean)
          reject(error)
        }
      })
    })
  }

  async analyzeFramesFromBuffers(first: Buffer, second: Buffer, width: number, height: number, channels: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const commandPlan = buildHelperCommand(this.helperPath, ['--stdin', width.toString(), height.toString(), channels.toString()])
      const proc = spawn(commandPlan.command, commandPlan.args, { stdio: ['pipe', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''

      proc.stdout.setEncoding('utf8')
      proc.stderr.setEncoding('utf8')

      proc.stdout.on('data', (chunk) => {
        stdout += chunk
      })
      proc.stderr.on('data', (chunk) => {
        stderr += chunk
      })
      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT' && commandPlan.fallback) {
          runWithFallbackFromBuffers(commandPlan.fallback, first, second, width, height, channels, resolve, reject)
          return
        }
        const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
        error.detail = err
        reject(error)
      })
      proc.stdin.write(first)
      proc.stdin.write(second)
      proc.stdin.end()
      proc.on('close', (code) => {
        if (code !== 0) {
          const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
          error.logTail = [stderr.trim()].filter(Boolean)
          reject(error)
          return
        }
        try {
          const parsed = JSON.parse(stdout.trim()) as { status: string; diff_score?: number }
          if (parsed.status !== 'success' || typeof parsed.diff_score !== 'number') {
            const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
            error.logTail = [stderr.trim(), stdout.trim()].filter(Boolean)
            reject(error)
            return
          }
          resolve(parsed.diff_score)
        } catch (err) {
          const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
          error.logTail = [stderr.trim(), stdout.trim()].filter(Boolean)
          reject(error)
        }
      })
    })
  }
}

type CommandPlan = { command: string; args: string[]; fallback?: string }

function buildHelperCommand(helperPath: string, baseArgs: string[]): CommandPlan {
  const cpuLimitSec = process.env.NATIVE_HELPER_CPU_SEC
  const memoryLimitMb = process.env.NATIVE_HELPER_MEM_MB
  const cpuSet = process.env.NATIVE_HELPER_CPUSET
  if (!cpuLimitSec && !memoryLimitMb && !cpuSet) {
    return { command: helperPath, args: baseArgs }
  }
  const resolvedHelper = helperPath
  if (cpuSet && (cpuLimitSec || memoryLimitMb)) {
    const prlimitArgs = [
      ...(cpuLimitSec ? [`--cpu=${cpuLimitSec}`] : []),
      ...(memoryLimitMb ? [`--as=${Number(memoryLimitMb) * 1024 * 1024}`] : []),
      '--',
      'taskset',
      '-c',
      cpuSet,
      resolvedHelper,
      ...baseArgs,
    ]
    return { command: 'prlimit', args: prlimitArgs, fallback: resolvedHelper }
  }
  if (cpuSet) {
    return { command: 'taskset', args: ['-c', cpuSet, resolvedHelper, ...baseArgs], fallback: resolvedHelper }
  }
  const prlimitArgs = [
    ...(cpuLimitSec ? [`--cpu=${cpuLimitSec}`] : []),
    ...(memoryLimitMb ? [`--as=${Number(memoryLimitMb) * 1024 * 1024}`] : []),
    '--',
    resolvedHelper,
    ...baseArgs,
  ]
  return { command: 'prlimit', args: prlimitArgs, fallback: resolvedHelper }
}

function runWithFallback(
  helperPath: string,
  args: string[],
  resolve: (value: number | PromiseLike<number>) => void,
  reject: (reason?: any) => void,
) {
  const proc = spawn(helperPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  proc.stdout.setEncoding('utf8')
  proc.stderr.setEncoding('utf8')
  proc.stdout.on('data', (chunk) => {
    stdout += chunk
  })
  proc.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  proc.on('close', (code) => {
    if (code !== 0) {
      const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
      error.logTail = [stderr.trim()].filter(Boolean)
      reject(error)
      return
    }
    try {
      const parsed = JSON.parse(stdout.trim()) as { status: string; diff_score?: number }
      if (parsed.status !== 'success' || typeof parsed.diff_score !== 'number') {
        const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
        error.logTail = [stderr.trim(), stdout.trim()].filter(Boolean)
        reject(error)
        return
      }
      resolve(parsed.diff_score)
    } catch (err) {
      const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
      error.logTail = [stderr.trim(), stdout.trim()].filter(Boolean)
      reject(error)
    }
  })
}

function runWithFallbackFromBuffers(
  helperPath: string,
  first: Buffer,
  second: Buffer,
  width: number,
  height: number,
  channels: number,
  resolve: (value: number | PromiseLike<number>) => void,
  reject: (reason?: any) => void,
) {
  const proc = spawn(helperPath, ['--stdin', width.toString(), height.toString(), channels.toString()], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  proc.stdout.setEncoding('utf8')
  proc.stderr.setEncoding('utf8')
  proc.stdout.on('data', (chunk) => {
    stdout += chunk
  })
  proc.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  proc.stdin.write(first)
  proc.stdin.write(second)
  proc.stdin.end()
  proc.on('close', (code) => {
    if (code !== 0) {
      const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
      error.logTail = [stderr.trim()].filter(Boolean)
      reject(error)
      return
    }
    try {
      const parsed = JSON.parse(stdout.trim()) as { status: string; diff_score?: number }
      if (parsed.status !== 'success' || typeof parsed.diff_score !== 'number') {
        const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
        error.logTail = [stderr.trim(), stdout.trim()].filter(Boolean)
        reject(error)
        return
      }
      resolve(parsed.diff_score)
    } catch (err) {
      const error: any = new Error(ERROR_CODES.FAILED_NATIVE_VALIDATION)
      error.logTail = [stderr.trim(), stdout.trim()].filter(Boolean)
      reject(error)
    }
  })
}
