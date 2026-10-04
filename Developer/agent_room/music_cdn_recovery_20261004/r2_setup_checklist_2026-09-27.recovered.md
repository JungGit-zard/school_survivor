오빠가 실제로 해야 할 일만 단계별로 쓰면 이렇게야.

## 1단계. Cloudflare 계정 준비

오빠가 직접 해야 할 것:

1. Cloudflare 가입 또는 로그인
2. 결제수단 등록
3. 가능하면 도메인 준비
   - 예: `jungsil.com`
   - 없으면 처음에는 Cloudflare 기본 공개 URL이나 테스트 URL로 시작 가능
   - 출시용은 나중에 `audio.도메인.com` 같은 전용 도메인 추천

결정할 것:
- CDN 주소를 뭐로 쓸지
  - 예: `https://audio.jungsil.com/escape-zombie-school/`

---

## 2단계. R2 버킷 만들기

Cloudflare Dashboard에서:

1. R2 메뉴로 이동
2. 버킷 생성
3. 버킷 이름 예:
   - `escape-zombie-school-audio`
4. Public access 또는 custom domain 연결 설정
5. 가능하면 custom domain 연결
   - 예: `audio.jungsil.com`

오빠가 나한테 알려주면 좋은 것:
- 버킷 이름
- 공개 접속 URL
- custom domain 사용 여부

---

## 3단계. 음악 원본 8곡 만들기

예시 기준:

- 노래 3곡
- 게임 BGM 5곡

오빠가 준비할 원본:

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

가능하면 원본 규격:
- WAV
- 48kHz
- 24bit
- stereo

AI 음악이면 같이 보관:
- 서비스명
- 유료 플랜 여부
- 영수증 또는 구독 증빙
- 라이선스 문서
- 프롬프트
- 생성 날짜
- 곡 URL 또는 다운로드 출처

이건 출시/상업 이용 안전장치야.

---

## 4단계. 곡별 정보 정리

각 곡마다 간단히 메모를 만들어.

예:

```text
곡 ID: bgm_stage_01
용도: Stage 1 교실 BGM
길이: 90초
루프: yes
루프 시작: 0ms
루프 끝: 90000ms
분위기: 귀여운 학교 + 불안
원본 파일: bgm_stage_01_master.wav
라이선스: Suno Pro, 2026-xx-xx 생성
```

노래 3곡은:

```text
곡 ID: song_01
용도: 메뉴/보상/이벤트 노래
길이: 120초
루프: no
```

---

## 5단계. 배포용 파일로 변환

원본 WAV를 그대로 게임에 쓰지 말고, 배포용으로 변환해.

각 곡마다 2개 파일 권장:

```text
Opus WebM
AAC M4A
```

예:

```text
bgm_stage_01.a1b2c3.opus.webm
bgm_stage_01.a1b2c3.aac.m4a
```

왜 2개냐면:
- WebM/Opus: 용량 효율 좋음
- M4A/AAC: 호환성 대체용

권장값:
- Opus: 128kbps
- AAC: 160kbps
- BGM 길이: 75~105초 정도
- 루프 곡은 앞뒤 공백 제거

이 단계는 오빠가 파일만 주면 내가 변환 명령/검증 스크립트까지 만들어줄 수 있어.

---

## 6단계. 파일명에 버전/해시 붙이기

절대 이렇게 하지 말기:

```text
bgm_stage_01.webm
```

이렇게 해야 함:

```text
bgm_stage_01.a1b2c3.opus.webm
bgm_stage_01.a1b2c3.aac.m4a
```

곡을 수정하면 덮어쓰지 말고 새 파일명:

```text
bgm_stage_01.d9e8f7.opus.webm
```

이유:
- CDN 캐시 꼬임 방지
- 유저마다 다른 파일 받는 문제 방지
- 롤백 쉬움

---

## 7단계. CDN 폴더 구조 만들기

R2 안에 이런 구조로 올리면 돼.

```text
escape-zombie-school/
  manifest.v1.json

  songs/
    song-01/
      song-01.a1b2c3.opus.webm
      song-01.a1b2c3.aac.m4a
    song-02/
      song-02.b2c3d4.opus.webm
      song-02.b2c3d4.aac.m4a
    song-03/
      song-03.c3d4e5.opus.webm
      song-03.c3d4e5.aac.m4a

  bgm/
    stage-01/
      stage-01-bgm.d4e5f6.opus.webm
      stage-01-bgm.d4e5f6.aac.m4a
    stage-02/
      stage-02-bgm.e5f6g7.opus.webm
      stage-02-bgm.e5f6g7.aac.m4a
    stage-03/
      stage-03-bgm.f6g7h8.opus.webm
      stage-03-bgm.f6g7h8.aac.m4a
    stage-04/
      stage-04-bgm.g7h8i9.opus.webm
      stage-04-bgm.g7h8i9.aac.m4a
    boss/
      boss-bgm.h8i9j0.opus.webm
      boss-bgm.h8i9j0.aac.m4a
```

---

## 8단계. manifest 작성

오빠가 직접 다 쓰기 어려우면, 내가 파일명 목록 받아서 만들어줄 수 있어.

예:

```json
{
  "schemaVersion": 1,
  "baseUrl": "https://audio.jungsil.com/escape-zombie-school/",
  "tracks": {
    "bgm_stage_01": {
      "type": "bgm",
      "version": "2026-09-27.1",
      "sources": [
        {
          "url": "bgm/stage-01/stage-01-bgm.d4e5f6.opus.webm",
          "format": "webm",
          "mime": "audio/webm"
        },
        {
          "url": "bgm/stage-01/stage-01-bgm.d4e5f6.aac.m4a",
          "format": "m4a",
          "mime": "audio/mp4"
        }
      ],
      "durationMs": 90000,
      "loop": true
    }
  }
}
```

일단 처음에는 8곡 다 넣어도 되지만, 게임 연결은 Stage 1 BGM 1곡부터 하는 걸 추천해.

---

## 9단계. R2에 업로드

업로드 방법은 둘 중 하나:

### 쉬운 방법
Cloudflare Dashboard에서 직접 업로드.

장점:
- 빠름
- 처음 테스트에 좋음

단점:
- 파일 많아지면 귀찮음

### 운영용 방법
업로드 스크립트 사용.

나중에 내가 만들어줄 수 있는 것:
- 파일 해시 계산
- 파일명 자동 생성
- R2 업로드
- manifest 자동 생성
- URL 접근 테스트

처음에는 Dashboard 직접 업로드로 충분해.

---

## 10단계. CORS 설정

Cloudflare R2 CORS에 최소 이렇게 설정.

개발 중:

```text
AllowedOrigins:
- http://localhost:5173

AllowedMethods:
- GET
- HEAD

AllowedHeaders:
- *

ExposeHeaders:
- ETag
- Content-Length
- Accept-Ranges

MaxAgeSeconds:
- 3600
```

운영 때는:

```text
AllowedOrigins:
- 실제 게임 도메인
```

Capacitor Android 앱이면 origin 처리가 다를 수 있어서 실제 AAB에서 꼭 확인해야 해.

---

## 11단계. CDN URL 테스트

브라우저에서 직접 열어봐.

예:

```text
https://audio.jungsil.com/escape-zombie-school/bgm/stage-01/stage-01-bgm.d4e5f6.opus.webm
```

확인할 것:
- 다운로드 또는 재생이 되는지
- 404가 아닌지
- 모바일에서도 열리는지

그리고 manifest도 확인:

```text
https://audio.jungsil.com/escape-zombie-school/manifest.v1.json
```

---

## 12단계. 게임에는 작은 목록만 넣기

이제 게임 코드에는 음악 파일을 넣지 말고:

- manifest URL
- track ID
- fallback 정책

이 정도만 넣어야 해.

예:

```text
bgm_stage_01 → CDN URL에서 로드
bgm_stage_02 → CDN URL에서 로드
boss_bgm → CDN URL에서 로드
```

앱 안에 음악 파일을 넣으면 CDN 쓰는 의미가 줄어들어.

---

## 13단계. 게임 연결은 1곡부터

오빠 프로젝트에서는 바로 8곡 다 연결하지 말고:

**1차 적용**
- `bgm_stage_01`만 연결
- Stage 1 진입 직전에 preload
- 실패하면 무음으로 진행
- 게임 시작/로그인/랭킹에는 영향 없게

**통과 후**
- Stage 2
- Stage 3
- Stage 4
- Boss
- 노래 3곡

순서로 늘리는 게 안전해.

---

## 14단계. 테스트

반드시 확인할 것:

- PC 브라우저에서 재생
- Vite dev 서버에서 CDN 요청 확인
- 느린 네트워크에서 로딩 UI 확인
- 오프라인일 때 게임이 멈추지 않는지
- CDN 파일 404일 때 무음 진행되는지
- Android AAB 실기기에서 재생되는지
- 앱 background 갔다 와도 중복 재생 안 되는지
- 루프 BGM이 끊기지 않는지
- 음량이 SFX를 덮지 않는지

---

## 15단계. 운영 체크

출시 전에 확인:

- 같은 URL 덮어쓰기 안 했는지
- manifest 버전 맞는지
- R2 비용 알림 설정했는지
- 무료 한도 50%, 80%, 95% 알림 설정
- 라이선스 증빙 보관했는지
- 원본 WAV 따로 백업했는지

---

## 오빠가 지금 당장 할 일 요약

제일 현실적인 TODO는 이거야.

1. Cloudflare 계정 준비
2. R2 버킷 만들기
3. 가능하면 `audio.도메인.com` 연결
4. 음악 8곡 원본 WAV 준비
5. 각 곡의 라이선스/프롬프트/출처 정리
6. 나한테 WAV 파일 목록과 곡 용도 알려주기
7. 내가 배포용 변환 규격, manifest, 게임 연결 구조 잡기
8. Stage 1 BGM 1곡만 먼저 CDN 연결
9. 실기기에서 테스트
10. 나머지 7곡 확장

가장 중요한 건 이거야, 오빠:

**처음부터 8곡 다 게임에 붙이지 말고, R2/CDN/manifest/게임 로더 구조를 Stage 1 BGM 1곡으로 먼저 검증한 다음 확장하는 것.**