#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL=${BACKEND_URL:-http://localhost:8080}
ARTIFACT_FILE=${ARTIFACT_FILE:-/tmp/codexpong-demo.mp4}
FFPROBE_JSON=${FFPROBE_JSON:-/tmp/codexpong-ffprobe.json}
export FFPROBE_JSON

function request_token() {
  local username="demo_utf8"
  local password="Password!234"
  local nickname="데모닉😀"
  echo "[demo] 회원가입/로그인 시도" >&2
  curl -s -o /dev/null -w '' -X POST "${BACKEND_URL}/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${username}\",\"password\":\"${password}\",\"nickname\":\"${nickname}\",\"avatarUrl\":\"http://example.com/a.png\"}" || true
  local login_json
  login_json=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"username\":\"${username}\",\"password\":\"${password}\"}")
  echo "$login_json" | python - <<'PY'
import sys, json
payload=json.load(sys.stdin)
print(payload.get("token",""))
PY
}

TOKEN=$(request_token)
if [ -z "$TOKEN" ]; then
  echo "토큰 발급 실패" >&2
  exit 1
fi

echo "[demo] 샘플 리플레이 생성"
curl -s -X POST "${BACKEND_URL}/api/replays/sample" -H "Authorization: Bearer ${TOKEN}" >/dev/null
REPLAYS_JSON=$(curl -s "${BACKEND_URL}/api/replays" -H "Authorization: Bearer ${TOKEN}")
REPLAY_ID=$(echo "$REPLAYS_JSON" | python - <<'PY'
import sys, json
payload=json.load(sys.stdin)
items=payload.get('items',[])
if not items:
    print('')
else:
    print(items[0].get('id',''))
PY
)
if [ -z "$REPLAY_ID" ]; then
  echo "리플레이 목록을 불러오지 못했습니다" >&2
  exit 1
fi

echo "[demo] MP4 내보내기 요청"
JOB_JSON=$(curl -s -X POST "${BACKEND_URL}/api/replays/${REPLAY_ID}/exports/mp4" -H "Authorization: Bearer ${TOKEN}")
JOB_ID=$(echo "$JOB_JSON" | python - <<'PY'
import sys,json
payload=json.load(sys.stdin)
print(payload.get('jobId',''))
PY
)
if [ -z "$JOB_ID" ]; then
  echo "jobId 추출 실패" >&2
  exit 1
fi

echo "[demo] 작업 완료 대기: ${JOB_ID}"
STATUS="RUNNING"
COUNTER=0
while [[ "$STATUS" != "SUCCEEDED" && "$STATUS" != "FAILED" ]]; do
  sleep 2
  COUNTER=$((COUNTER+1))
  if [ $COUNTER -gt 40 ]; then
    echo "시간 초과" >&2
    exit 1
  fi
  RESP=$(curl -s "${BACKEND_URL}/api/jobs/${JOB_ID}" -H "Authorization: Bearer ${TOKEN}")
  STATUS=$(echo "$RESP" | python - <<'PY'
import sys,json
payload=json.load(sys.stdin)
print(payload.get('status',''))
PY
)
  echo " - 현재 상태: ${STATUS}"
done
if [ "$STATUS" = "FAILED" ]; then
  echo "작업 실패: ${RESP}" >&2
  exit 1
fi

echo "[demo] 산출물 다운로드"
curl -s -L "${BACKEND_URL}/api/jobs/${JOB_ID}/download" -H "Authorization: Bearer ${TOKEN}" -o "$ARTIFACT_FILE"

TARGET_IN_WORKER=/tmp/demo_v0_6.mp4
docker compose cp "$ARTIFACT_FILE" worker:${TARGET_IN_WORKER}

echo "[demo] ffprobe 구조 검증"
docker compose exec -T worker ffprobe -v error -print_format json -show_streams -show_format ${TARGET_IN_WORKER} >"${FFPROBE_JSON}"
python - <<'PY'
import json,sys,os
path=os.environ.get('FFPROBE_JSON')
with open(path) as f:
    data=json.load(f)
streams=data.get('streams',[])
video=[s for s in streams if s.get('codec_type')=='video']
if not video:
    print('비디오 스트림 없음'); sys.exit(1)
fmt=data.get('format',{})
duration=float(fmt.get('duration',0))
if duration<=0:
    print('길이 0'); sys.exit(1)
print('ffprobe 통과')
PY

echo "[demo] 트리비얼 프레임 가드"
FIRST_HASH=$(docker compose exec -T worker ffmpeg -ss 0.1 -i ${TARGET_IN_WORKER} -frames:v 1 -f image2pipe - 2>/dev/null | sha256sum | awk '{print $1}')
LAST_HASH=$(docker compose exec -T worker ffmpeg -sseof -0.1 -i ${TARGET_IN_WORKER} -frames:v 1 -f image2pipe - 2>/dev/null | sha256sum | awk '{print $1}')
if [ "$FIRST_HASH" = "$LAST_HASH" ]; then
  echo "트리비얼 프레임 감지" >&2
  exit 1
fi

echo "[demo] 완료: ${ARTIFACT_FILE}"
