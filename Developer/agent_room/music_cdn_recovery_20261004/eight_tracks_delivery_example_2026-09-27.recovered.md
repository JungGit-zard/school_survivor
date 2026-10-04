오빠, 예를 들어 **노래 3곡 + 게임 배경음악 5곡 = 총 8곡**을 만들어서 CDN으로 제공하려면, 현실적인 흐름은 이렇게 가면 돼.

## 결론 구조

추천 구조는:

```text
음원 원본 제작
→ 배포용 압축본 생성
→ Cloudflare R2 같은 오브젝트 저장소 업로드
→ CDN 도메인 연결
→ 게임에는 URL/목록 manifest만 포함
→ 필요한 곡만 지연 로드
```

즉, 게임 앱/AAB 안에는 음악 파일을 넣지 않고, **작은 목록 파일만 넣는 방식**이야.

---

## 1. 먼저 원본 파일을 확보

각 곡마다 원본을 보관해야 해.

예:

```text
song_01_master.wav
song_02_master.wav
song_03_master.wav

bgm_stage_01_master.wav
bgm_stage_02_master.wav
bgm_stage_03_master.wav
bgm_stage_04_master.wav
bgm_boss_master.wav
```

권장 원본:
- WAV
- 48kHz
- 24bit
- stereo

그리고 AI 생성 음악이면 같이 보관:
- 생성 서비스명
- 프롬프트
- 생성 날짜
- 유료 플랜/라이선스 증빙
- 영수증
- 원본 다운로드 링크
- 사용권 문서

이건 나중에 앱 출시/광고/상업 이용 문제 생겼을 때 중요해.

---

## 2. 게임용 배포 파일로 변환

WAV를 그대로 CDN에 올려서 쓰면 너무 커.  
배포용으로 압축본을 만든다.

추천은 2종:

```text
1차: WebM + Opus
대체: M4A + AAC
```

예:

```text
song_01.ab12cd.opus.webm
song_01.ab12cd.aac.m4a

bgm_stage_01.9f88aa.opus.webm
bgm_stage_01.9f88aa.aac.m4a
```

대략 용량:
- Opus 128kbps: 약 0.96MB/분
- AAC 160kbps: 약 1.2MB/분

예를 들어 90초짜리 BGM이면:
- Opus: 약 1.4MB
- AAC: 약 1.8MB

총 8곡이어도 한 번에 전부 받지 않고, 필요한 곡만 받게 만들면 부담은 작아.

---

## 3. CDN 저장소 선택

소규모 프로젝트면 문서 기준으로는 **Cloudflare R2 + Cloudflare CDN**이 제일 현실적이야.

추천:
- Cloudflare R2 버킷 생성
- 예: `escape-zombie-school-audio`
- 전용 도메인 연결
- 예: `https://audio.example.com/`

Firebase Storage도 가능하지만:
- Blaze 요금제 필요 가능성
- 트래픽 비용 확인 필요
- 공개 BGM은 Firebase Auth랑 묶지 않는 게 좋음

그래서 오빠 상황에선 보통:

```text
Firebase = 로그인, 랭킹, 진행도
Cloudflare R2/CDN = 큰 공개 음원, 모델, 텍스처
```

이 분리가 좋아.

---

## 4. CDN 폴더 구조 예시

예를 들어 이렇게 올려.

```text
https://audio.example.com/escape-zombie-school/
  manifest.v1.json

  songs/
    song-01/
      song-01.ab12cd.opus.webm
      song-01.ab12cd.aac.m4a
    song-02/
      song-02.c34def.opus.webm
      song-02.c34def.aac.m4a
    song-03/
      song-03.f19a77.opus.webm
      song-03.f19a77.aac.m4a

  bgm/
    stage-01/
      stage-01-bgm.9f88aa.opus.webm
      stage-01-bgm.9f88aa.aac.m4a
    stage-02/
      stage-02-bgm.18bb3c.opus.webm
      stage-02-bgm.18bb3c.aac.m4a
    stage-03/
      stage-03-bgm.5510aa.opus.webm
      stage-03-bgm.5510aa.aac.m4a
    stage-04/
      stage-04-bgm.02cdaa.opus.webm
      stage-04-bgm.02cdaa.aac.m4a
    boss/
      boss-bgm.a81f22.opus.webm
      boss-bgm.a81f22.aac.m4a
```

중요한 원칙:

**같은 파일명으로 덮어쓰지 않기.**

나중에 곡을 수정하면:

```text
stage-01-bgm.9f88aa.opus.webm
```

을 덮어쓰지 말고,

```text
stage-01-bgm.3b7c91.opus.webm
```

처럼 새 파일명으로 올려야 해.  
그래야 CDN 캐시 문제를 피할 수 있어.

---

## 5. manifest 만들기

게임 코드에 URL을 여기저기 박지 말고, 작은 manifest 하나로 관리해.

예:

```json
{
  "schemaVersion": 1,
  "baseUrl": "https://audio.example.com/escape-zombie-school/",
  "tracks": {
    "song_01": {
      "type": "song",
      "version": "2026-09-27.1",
      "sources": [
        {
          "url": "songs/song-01/song-01.ab12cd.opus.webm",
          "format": "webm",
          "mime": "audio/webm"
        },
        {
          "url": "songs/song-01/song-01.ab12cd.aac.m4a",
          "format": "m4a",
          "mime": "audio/mp4"
        }
      ],
      "durationMs": 120000,
      "loop": false
    },
    "bgm_stage_01": {
      "type": "bgm",
      "version": "2026-09-27.1",
      "sources": [
        {
          "url": "bgm/stage-01/stage-01-bgm.9f88aa.opus.webm",
          "format": "webm",
          "mime": "audio/webm"
        },
        {
          "url": "bgm/stage-01/stage-01-bgm.9f88aa.aac.m4a",
          "format": "m4a",
          "mime": "audio/mp4"
        }
      ],
      "durationMs": 90000,
      "loop": true,
      "loopStartMs": 0,
      "loopEndMs": 90000
    }
  },
  "groups": {
    "boot": [],
    "stage1": ["bgm_stage_01"],
    "stage2": ["bgm_stage_02"],
    "stage3": ["bgm_stage_03"],
    "stage4": ["bgm_stage_04"],
    "boss": ["bgm_boss"],
    "songs": ["song_01", "song_02", "song_03"]
  }
}
```

게임에는 이 manifest 또는 manifest URL만 들어간다.

---

## 6. 캐시 정책

음악 파일은 파일명이 바뀌므로 오래 캐시해도 돼.

음악 파일 헤더:

```text
Cache-Control: public, max-age=31536000, immutable
Content-Type: audio/webm 또는 audio/mp4
Accept-Ranges: bytes
```

manifest는 자주 바뀔 수 있으니 짧게:

```text
Cache-Control: public, max-age=60
```

또는 manifest도 버전 파일명으로:

```text
manifest.v1.json
manifest.v2.json
```

이렇게 관리.

---

## 7. 게임 런타임에서는 어떻게 재생하나

게임에서는 시작할 때 8곡을 전부 받지 말고, 필요한 순간에만 받게 해야 해.

예:

- 타이틀 화면: 아무것도 안 받음 또는 타이틀 BGM만
- Stage 1 선택: `bgm_stage_01`만 preload
- Stage 2 선택: `bgm_stage_02`만 preload
- 보스 등장 5~10초 전: `bgm_boss` preload
- 노래 3곡은 메뉴/보상/특정 화면에서 필요할 때만 로드

흐름:

```text
게임 시작
→ manifest 로드
→ Stage 1 선택
→ stage1 group preload
→ 로딩 완료 후 게임 시작
→ BGM 재생
```

실패 시:
- BGM 실패: 무음으로 게임 계속
- 대체 포맷 시도
- 그래도 실패하면 게임은 막지 않음

---

## 8. Howler 사용 시 구조

지금 프로젝트는 Howler를 쓰는 쪽이 있으니까, 음악 매니저 하나로 묶으면 돼.

개념:

```js
const sound = new Howl({
  src: [
    'https://audio.example.com/escape-zombie-school/bgm/stage-01/stage-01-bgm.9f88aa.opus.webm',
    'https://audio.example.com/escape-zombie-school/bgm/stage-01/stage-01-bgm.9f88aa.aac.m4a'
  ],
  html5: true,
  loop: true,
  volume: 0.5
})
```

중요:
- 긴 BGM은 `html5: true`
- 앱 시작 때 전곡 preload 금지
- 사용자 첫 탭 이후 재생
- background/visibility hidden에서 pause
- resume 때 중복 인스턴스 만들지 않기
- 실패하면 무음 진행

---

## 9. 실제 작업 순서

오빠가 실제로 진행한다면 순서는 이게 좋아.

1. **곡 8개 원본 확보**
   - WAV
   - 라이선스
   - 프롬프트/영수증/출처

2. **배포본 인코딩**
   - Opus WebM
   - AAC M4A
   - 각 파일 hash 계산

3. **R2 버킷 생성**
   - `escape-zombie-school-audio`

4. **도메인 연결**
   - 예: `audio.jungsil.com`
   - 없으면 임시 개발 URL 가능, 출시 전 전용 도메인 권장

5. **파일 업로드**
   - 같은 파일명 덮어쓰기 금지

6. **CORS 설정**
   - `GET`, `HEAD`
   - 개발: `http://localhost:5173`
   - 운영: 실제 게임 도메인

7. **manifest 작성**
   - 8곡 목록
   - sources
   - duration
   - loop 여부
   - group

8. **게임에 Audio/BGM Manager 구현**
   - manifest 로드
   - track key로 URL resolve
   - 필요한 곡만 preload/play
   - 실패 시 무음 fallback

9. **테스트**
   - CDN 요청 확인
   - 캐시 확인
   - 오프라인/느린 네트워크
   - Android WebView/AAB 실기기
   - loop 끊김 여부
   - background/resume

---

## 10. 오빠 프로젝트 기준 추천 MVP

처음부터 8곡 전부 연결하지 말고:

**1차 MVP**
- Stage 1 BGM 1곡만 CDN 연결
- 나머지 7곡은 아직 manifest에만 초안 또는 미등록
- Stage 1 진입 직전에만 로드
- 실패하면 무음 진행

검증 후:

**2차**
- Stage 2~4 BGM 추가

**3차**
- 보스 BGM 추가

**4차**
- 노래 3곡 추가

이렇게 가야 리스크가 작아.

---

정리하면, 오빠가 원하는 방식은 충분히 가능해.  
다만 표현을 정확히 하면:

**“클라이언트에 아예 적재하지 않는다”가 아니라, “앱 설치 파일에는 넣지 않고 CDN에서 필요한 곡만 스트리밍/캐시해서 재생한다”**가 맞아.