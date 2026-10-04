# Escape! zombie school BGM 제작·외부 배포 구현 기획서

- 작성일: 2026-09-12 KST
- 범위: 새 스테이지용 BGM의 제작, 전달 규격, 외부 저장소/CDN, 런타임 연결, 비용·장애·QA 계획
- 이번 작업: 기획만 수행. 코드·Firebase·음원·배포 설정은 변경하지 않음.
- 절대 보존: `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`(998,122 bytes, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`)는 교체·변환·삭제·경로 변경하지 않는다. 새 BGM은 게임 플레이 전용 별도 계통이다.

## 1. 최종 결정

### 권장 구조

```text
Terry가 음악 제작 서비스/DAW에서 WAV 원본 다운로드
  → 원본·영수증·라이선스·프롬프트 보관
  → 배포본 2종 생성(WebM/Opus 우선 + M4A/AAC-LC 대체본)
  → Cloudflare R2 Standard에 업로드
  → audio.<보유도메인>의 Cloudflare CDN으로 공개 전송
  → 게임에는 작은 BGM 목록과 URL만 포함
  → 해당 스테이지 진입 직전에 한 곡만 지연 로드
```

1순위는 **Cloudflare R2 Standard + 전용 사용자 도메인 + 불변 파일명 캐시**다. 음원을 AAB/Vite `dist`에 넣지 않으므로 설치 파일은 URL·목록 코드만큼만 늘고, R2는 2026-09-12 기준 월 10GB 저장·1천만 Class B 읽기·인터넷 전송료 무료 구간이 있어 소규모 게임에 가장 유리하다. `r2.dev` 주소는 개발용 제한이 있으므로 출시에는 전용 도메인을 연결한다.

Firebase를 이미 쓰더라도 **모든 리소스를 Firebase에 모으지 않는다.** Firebase Authentication과 Realtime Database는 로그인·진행도 같은 구조화 데이터용으로 유지하고, 큰 공개 BGM 파일은 오브젝트 저장소/CDN에 둔다. Realtime Database나 Firestore에 오디오 바이트/base64를 넣는 방식은 용량, 읽기 비용, 캐시, Range 요청 면에서 부적합하다.

Firebase만 쓰고 싶다면 2순위는 **Cloud Storage for Firebase**다. 다만 2026-02-03부터 Storage 사용에는 Blaze 종량제가 필수이며, 공개 BGM은 로그인 성공 여부와 분리해야 한다. Firebase Hosting은 CDN이 편하지만 캐시 적중도 전송량에 합산되고 무료 전송은 월 10GB라, BGM 트래픽이 늘면 R2보다 비용상 불리하다. 같은 `dist`에 음원을 넣으면 Capacitor가 AAB에 복사할 수 있으므로 Firebase Hosting을 쓸 때도 오디오 전용 별도 site/public 디렉터리를 써야 한다.

## 2. 음악은 어디서 만들 것인가

8비트 합성음이 아니라 실제 분위기를 살리는 완성형 음악을 전제로 한다.

| 선택 | 적합한 경우 | 권리·출력 판단 |
| --- | --- | --- |
| Suno 유료 플랜 | 가장 빠르게 풍부한 편곡과 후보를 많이 만들 때 | 유료 상태에서 허용된 방식으로 내려받은 곡은 게임 상업 이용 가능. Pro/Premier는 WAV 제공. 무료/시험 다운로드는 상업용 금지이므로 사용하지 않는다. |
| AIVA Pro | 소유권 문구와 MIDI/편집 통제가 더 중요할 때 | Pro는 생성곡 저작권을 사용자에게 귀속한다고 안내하고 WAV를 제공한다. Standard의 수익화 범위는 제한적이므로 게임에는 Pro만 후보로 둔다. |
| Beatoven | 게임에 삽입할 비독점 BGM 라이선스가 명확하면 충분할 때 | 다운로드마다 라이선스를 제공하며 게임에 동기화해 쓰는 비독점·영구 이용권 구조다. 음원 파일 자체 재판매/스트리밍 배포는 금지된다. |
| 직접 작곡가/DAW | 독점성과 장기 브랜드 정체성이 최우선일 때 | 계약서에 게임 내 사용, 전 세계, 기간 제한 없음, 수정·루프·재인코딩·업데이트·광고 영상 사용 권리를 명시한다. |

실무 1순위는 **Suno 유료로 6~10개 후보 제작 → 가장 나은 곡의 WAV와 가능하면 stems(악기별 트랙) 다운로드 → Audacity/Reaper 등에서 루프와 믹스를 정리**하는 방식이다. 권리의 독점성까지 중요하면 AIVA Pro나 인간 작곡 계약으로 바꾼다. 특정 게임·작곡가·가수의 이름을 프롬프트에 넣어 모사하지 않는다.

## 3. Terry가 에이전트에게 줄 파일

압축 MP3 하나만 전달하지 말고 다음 묶음으로 준다.

```text
stage01_bgm_master.wav       # 필수: PCM 24-bit, 48 kHz, stereo
stage01_bgm_stems/           # 선택: drums, bass, melody, pad 등 WAV
stage01_bgm_info.md          # 필수: 스테이지, BPM, 조성, 의도, 루프 희망 구간
license.pdf 또는 license.txt # 필수: 게임 상업 이용 근거
receipt.png/pdf              # 필수: 유료 플랜·구매일 증빙
source_url.txt               # 필수: 서비스/곡 URL과 다운로드일
prompt.txt                   # AI 생성이면 필수: 원 프롬프트와 생성 버전
```

가장 중요한 파일은 `24-bit/48kHz WAV`다. WAV는 작업·보관용 원본이며 게임에 그대로 싣지 않는다. FLAC 원본도 무손실이라 받을 수 있지만, 편집 호환성을 위해 WAV를 기본으로 한다. MP3/M4A만 제공되는 서비스라면 그 파일을 원본 증거로 보관하되, 손실 압축 파일을 WAV로 바꿔도 음질이 복구되지는 않음을 기록한다.

## 4. 배포 음질과 용량 규격

### 권장값

| 항목 | 권장 규격 |
| --- | --- |
| 작업 원본 | WAV PCM 24-bit / 48 kHz / stereo |
| 1차 배포 | WebM 컨테이너 + Opus, VBR 평균 128 kbps, stereo |
| 대체 배포 | M4A/MP4 컨테이너 + AAC-LC, VBR 160 kbps, stereo |
| 추가 대체본 | 실제 구형 기기 실패가 확인될 때만 MP3 160 kbps 추가 |
| 라우드니스 | 약 -18 LUFS-I, 필요 시 -17~-16까지 청취 조정 |
| 피크 | -1.0 dBTP 이하 |
| 곡 길이 | 스테이지당 75~105초 seamless loop |
| 루프 | 첫·끝 무음 제거, 박자 경계 샘플 단위 정렬, 잔향 tail을 첫 구간에 겹쳐 렌더 |

Opus 128 kbps는 약 **0.96MB/분**, AAC 160 kbps는 약 **1.20MB/분**이다(10진 MB, 컨테이너 오버헤드 제외). 90초 곡 하나는 각각 약 1.44MB/1.80MB다. 브라우저는 지원되는 첫 형식만 받으므로 두 형식을 서버에 보관해도 한 기기가 두 파일을 모두 내려받는 구조로 만들지 않는다.

4개 스테이지를 모두 만들면 1차 Opus 기준 약 5.76MB지만, 현재 스테이지만 지연 로드하면 첫 게임에서 받는 BGM은 약 1.44MB다. AAB에는 파일이 들어가지 않는다. 단, 사용자의 기기에는 재생 시 네트워크 캐시가 생기며 이는 설치 패키지 크기가 아니라 OS가 지울 수 있는 런타임 캐시다. **첫 실행부터 완전 오프라인 BGM**을 원한다면 파일을 AAB에 포함해야 하므로 설치 용량 증가와 동시에 달성할 수 없다.

## 5. 저장소·CDN 비교

2026-09-12 공개 요금 기준이며 실제 연결 직전에 다시 확인한다.

| 후보 | 무료/비용 핵심 | 장점 | 단점 | 결론 |
| --- | --- | --- | --- | --- |
| Cloudflare R2 Standard | 10GB-month 저장, Class A 100만, Class B 1천만/월 무료; 인터넷 egress 무료 | 작은 게임의 반복 음원 전송에 가장 유리, 전용 도메인 CDN·CORS·Range 가능 | Cloudflare 계정·도메인·R2 활성화 필요 | **1순위 MVP/운영** |
| Firebase Storage | 2026-02-03부터 Blaze 필수; 위치별 GCS 요금·무료구간 적용 | 기존 Firebase 프로젝트와 관리 화면 통합 | 결제계정 필수, 트래픽 비용과 토큰 URL 관리, SDK 의존을 늘리기 쉬움 | 한 공급자로 묶을 때 2순위 |
| Firebase Hosting | 10GB/월 전송 무료, 초과 Blaze $0.15/GB; CDN hit도 전송량 계산 | 이미 프로젝트에 있음, SSL/CDN/헤더 간단 | 같은 `dist`는 AAB 포함 위험; 무료 한도 도달 시 Spark 사이트 중단 가능 | 오디오 전용 별도 site일 때만 |
| Supabase Storage Free | 1GB 저장, uncached 5GB + cached 5GB egress, Basic CDN | 설정 쉬움 | 무료 프로젝트 일시정지와 낮은 전송량, 새 공급자 추가 | 프로토타입만 |
| Backblaze B2 | 첫 10GB 저장 무료, 평균 저장량의 3배까지 egress 무료; 제휴 CDN 경유 시 무료 범위 확대 | 저렴하고 S3 호환 | R2 직결보다 CDN 구성 단계가 늘어남 | R2 장애/정책 변경 시 대안 |
| GitHub raw/Release, jsDelivr | 제품용 미디어 CDN SLA·예산 통제 수단이 아님 | 빠른 실험 | 저장소 배포·핫링크·대역폭 정책에 종속 | 출시용 금지 |

트래픽 예시: 90초 Opus 곡(1.44MB)을 월 1,000명이 한 번씩 받으면 약 1.44GB, 10,000명이면 약 14.4GB, 100,000명이면 약 144GB다. Firebase Hosting은 캐시 적중도 전송량으로 잡지만 R2는 egress 비용이 없어 읽기 요청 수와 저장량이 주 관리 대상이다.

## 6. R2 연결 규격

### 버킷과 URL

- 버킷: `escape-zombie-school-audio`
- 출시 도메인 예: `audio.<사용자보유도메인>`
- 객체 예: `bgm/stage-01/stage01-loop.4f3a9c2d.opus.webm`
- 같은 경로의 파일을 덮어쓰지 않는다. 내용이 바뀌면 해시가 포함된 새 파일명으로 올린다.
- `r2.dev`는 개발 확인에만 쓰고 출시 URL로 고정하지 않는다.

### 응답 헤더

```text
Content-Type: audio/webm                 # Opus/WebM
Content-Type: audio/mp4                  # AAC/M4A
Cache-Control: public, max-age=31536000, immutable
Content-Length: 정확한 파일 크기
Accept-Ranges: bytes
```

CORS는 `GET`, `HEAD`만 허용하고 출시 게임 origin과 `http://localhost:5173`만 등록한다. `*`도 재생은 가능하지만 관리 가능한 origin 제한이 낫다. 공개 BGM은 비밀 자산이 아니므로 만료되는 서명 URL을 매 재생마다 발급하지 않는다. 서명 URL은 캐시 효율과 장애 지점을 늘리고, URL이 노출된다고 음악 저작권이 보호되는 것도 아니다.

### 게임에 포함할 작은 목록

MVP에서는 원격 목록 서버까지 만들지 않고 다음 정도의 **작은 정적 매니페스트**를 게임 코드에 둔다. 이렇게 하면 CDN/Firebase가 실패해도 앱 초기화·로그인·그래픽·게임 진입을 막지 않는다.

```json
{
  "stage01": {
    "version": "2026-09-12.1",
    "sources": [
      {"url": "https://audio.example.com/bgm/stage-01/stage01-loop.HASH.opus.webm", "format": "webm"},
      {"url": "https://audio.example.com/bgm/stage-01/stage01-loop.HASH.aac.m4a", "format": "m4a"}
    ],
    "bytes": {"webm": 1440000, "m4a": 1800000},
    "durationMs": 90000,
    "loopStartMs": 0,
    "loopEndMs": 90000,
    "sha256": {"webm": "...", "m4a": "..."}
  }
}
```

원격에서 곡을 교체하는 기능은 MVP 이후다. 필요해지면 짧은 TTL의 원격 `manifest.json`만 조회하고, 음악 파일은 계속 불변 URL로 둔다. 원격 목록 실패 시 로그인이나 게임을 막지 않고 현재 세션은 무음으로 진행한다. 프로젝트에서 금지한 `localStorage`에는 URL·캐시·선택값을 저장하지 않는다.

## 7. 게임 런타임 설계

현재 프로젝트는 Howler 2.2.4를 사용하고 SFX에 OGG→MP3 대체 소스를 이미 쓴다. 새 BGM도 별도 `GameplayBgmManager` 한 곳에서 Howler를 사용하되 타이틀 BGM 코드는 건드리지 않는다.

- 긴 BGM은 `html5: true`로 스트리밍해 전체 PCM 디코드 메모리를 피한다.
- `src`는 `[Opus WebM URL, AAC M4A URL]` 순으로 두고 브라우저가 지원하는 첫 소스만 선택하게 한다.
- `preload: 'metadata'` 또는 스테이지 선택 확정 뒤 로드한다. 앱 시작 때 4곡을 전부 받지 않는다.
- 사용자 Start/첫 탭 뒤에만 재생한다. 모바일 자동재생 제한을 우회하려 하지 않는다.
- pause, 앱 background, `visibilitychange=hidden`, 오디오 포커스 상실 시 일시정지한다.
- 복귀 때 중복 인스턴스를 만들지 않고 기존 한 인스턴스만 resume한다.
- 스테이지 진입 300~700ms fade-in, 종료/게임오버 300~600ms fade-out.
- 보스 경고·플레이어 피격·레벨업 때 BGM을 약 4~8dB ducking하고 SFX를 우선한다.
- 네트워크/디코드 실패 시 1회 대체 형식을 시도한 뒤 무음으로 계속 플레이한다. Firebase/Auth/그래픽/게임 진입과 연결하지 않는다.
- HTML5 Audio의 실제 seamless loop는 기기별 차이가 있으므로 인코딩만 믿지 않고 Galaxy A24 실제 AAB에서 청취한다. 반복 틈이 들리면 먼저 loop master를 고치고, 실패가 지속될 때만 이중 플레이어 교차 예약을 별도 카드로 검토한다.

## 8. 음악 콘텐츠 기획

한 곡을 모든 스테이지에 재사용하지 않는다. 처음에는 Stage 1 한 곡만 완성·검증하고 나머지를 같은 음악 언어로 확장한다.

| 구간 | 음악 방향 | BPM/길이 |
| --- | --- | --- |
| Stage 1 교실 | 귀여운 학교 공간에 불안이 번지는 느낌. 말렛·피치카토·가벼운 전자 타악, 명료한 4~6음 주제 | 128~138 BPM, 90초 |
| Stage 2 복도 | 추격과 좁은 공간. 펄스 베이스·저음 현·금속 타악, 멜로디보다 리듬 압박 | 136~148 BPM, 80~95초 |
| Stage 3 체육관 | 운동장/체육관의 추진력. 라이브 드럼 계열과 브라스/신스 스탭, 지나친 웅장함 금지 | 140~152 BPM, 85~100초 |
| Stage 4 급식실 | 만화적인 혼란과 최종 압박. 퍼커션·베이스·짧은 관악/주방 금속 질감 | 144~156 BPM, 85~100초 |
| 보스 | 새 긴 곡보다 기존 스테이지 주제의 20~35초 고강도 layer/loop를 우선 | 원곡 BPM 유지 |

공통 금지: 특정 유명 게임·애니메이션 음악을 알아볼 수 있게 모사하지 않는다. 장시간 리버브와 과도한 저역은 모바일 스피커에서 SFX를 가리므로 줄인다.

## 9. 구현 순서와 완료 기준

### Phase 0 — 권리·원본 확보

- Terry가 유료 상업 이용 가능한 서비스에서 Stage 1 후보를 만들고 WAV와 증빙 묶음을 전달한다.
- 완료: WAV, 출처, 라이선스, 영수증, 생성일, 프롬프트, SHA-256이 모두 있음.
- 실패: 무료 플랜, 권리 불명, 타 작품 모사 후보는 게임에 연결하지 않는다.

### Phase 1 — 후보 마스터링·루프

- Sound Mini가 75~105초 루프, -18 LUFS-I, -1dBTP 후보를 만든다.
- 완료: 10회 연속 루프에서 클릭·공백·박자 밀림이 없고 5분 청취 피로가 허용됨.

### Phase 2 — 인코딩·R2 시험 업로드

- Opus WebM/AAC M4A 생성, 크기·길이·codec·hash 기록, 개발용 URL로 HEAD/GET/Range/CORS 확인.
- 완료: `200`, Range `206`, 올바른 MIME, `Content-Length`, 캐시 헤더가 확인됨.

### Phase 3 — Stage 1만 런타임 연결

- 별도 BGM manager와 단위 테스트를 구현한다. 타이틀 BGM과 기존 SFX registry는 보존한다.
- 완료: 시작·pause·background·resume·game over·재시작에서 한 인스턴스만 재생되고 실패 시 게임이 계속됨.

### Phase 4 — 실제 기기/AAB 검증

- 출시 환경 규칙에 따라 AAB를 만들기 전에 Firebase env gate를 통과하고 Galaxy A24 새 세션에서 확인한다.
- 완료: 첫 탭 후 재생, 루프 10회, 통화/알림·background 복귀, 저속망, 오프라인, CDN 실패, mute, SFX 판독성을 검증함.
- 로그인이나 로그인 후 핵심 진입이 실패하면 현재 변경/배포만 취소하고 마지막 정상 상태를 복원한다.

### Phase 5 — Stage 2~4 확장

- Stage 1의 기술·청취 기준을 통과한 뒤 한 스테이지씩 추가한다. 모든 곡을 한 번에 제작·배포하지 않는다.

## 10. 계측과 운영 경보

개인정보나 서명 URL 전체를 로그에 남기지 않고 다음 이벤트/값만 수집한다.

- `bgm_load_started`, `bgm_load_succeeded`, `bgm_load_failed`
- stage ID, track version, 선택 codec, HTTP 오류 종류
- `bgm_first_play_latency_ms`: 스테이지 진입부터 실제 재생까지
- `bgm_stall_count`, `bgm_stall_total_ms`
- `bgm_loop_count`, `bgm_resume_failed`, `bgm_duplicate_prevented`
- `bgm_muted`, `bgm_volume_bucket`(정밀 개인 설정값 대신 구간)
- Resource Timing이 허용하는 범위의 `transferSize`, `duration`; 0-byte/cache 추정은 참고값으로만 사용
- R2: 월 저장량, Class A/B 요청 수, 오류율, CDN cache hit ratio, 국가별 전송량
- 비용 경보: 무료 한도의 50%/80%/95%에서 알림. 공급자 가격은 배포 직전 재확인

목표값 초안: 첫 재생 p95 2초 이내(일반 4G/Wi-Fi), stall 없는 세션 99% 이상, BGM 오류로 게임 진입이 막힌 세션 0건, 중복 재생 0건.

## 11. 반드시 지킬 것 / 하지 않을 것

### 반드시 지킬 것

- 원본 WAV와 권리 증빙을 배포 파일보다 먼저 보존한다.
- 새 BGM은 타이틀 BGM과 별도 계통으로 만든다.
- 불변 해시 파일명, 1년 캐시, 스테이지별 지연 로드를 사용한다.
- 실제 Android WebView/AAB에서 루프와 lifecycle을 청취 검증한다.
- CDN/Firebase 실패를 음악 실패로만 처리하고 게임·그래픽·로그인을 막지 않는다.

### 하지 않을 것

- WAV를 게임이나 CDN의 기본 재생본으로 직접 배포하지 않는다.
- MP3 하나만 원본이라고 전달하지 않는다.
- RTDB/Firestore에 오디오 blob/base64를 저장하지 않는다.
- 모든 스테이지 곡을 앱 시작 때 preload하지 않는다.
- 같은 URL의 파일을 덮어써 장기 캐시와 실제 내용이 불일치하게 만들지 않는다.
- 공개 BGM 재생에 Firebase 로그인·Storage SDK 초기화를 필수 조건으로 만들지 않는다.
- 제목 BGM 정본을 새 구조로 옮기거나 대체하지 않는다.

## 12. 근거 자료

- Firebase Storage Blaze 의무(2026-02-03 시행): https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Firebase Storage Web 다운로드·CORS: https://firebase.google.com/docs/storage/web/download-files
- Firebase Hosting 전송량·요금: https://firebase.google.com/docs/hosting/usage-quotas-pricing
- Firebase Hosting CDN 캐시: https://firebase.google.com/docs/hosting/manage-cache
- Cloudflare R2 요금: https://developers.cloudflare.com/r2/pricing/
- R2 출시용 custom domain: https://developers.cloudflare.com/r2/buckets/public-buckets/
- R2 CORS: https://developers.cloudflare.com/r2/buckets/cors/
- Cloudflare 캐시·Range 요청: https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- Supabase Storage/egress 요금: https://supabase.com/pricing , https://supabase.com/docs/guides/platform/manage-your-usage/egress
- Backblaze B2 요금: https://www.backblaze.com/cloud-storage/pricing
- 웹 오디오 codec 비교: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs
- Safari/WebKit WebM·Vorbis 지원: https://webkit.org/blog/15063/webkit-features-in-safari-17-4/
- Howler source fallback·HTML5 streaming: https://github.com/goldfire/howler.js
- Suno 2026 다운로드·상업 이용: https://suno.com/blog/suno-updates-tos , https://help.suno.com/en/articles/9601665
- AIVA 플랜·WAV·권리: https://www.aiva.ai/
- Beatoven 게임 이용권: https://www.beatoven.ai/tos

## 13. 라우팅·검토 기록

- 기존 Sound Mini 정본: `Developer/agent_room/soundmini_better_minigame_bgm_research_and_implementation_plan_2026-08-05.md`, Kanban `t_9e2a11c3`.
- 이번 Sound Mini 카드: `t_3ce13436` — Hermes Codex 자격 증명 부재로 두 번 실행 후 차단됨.
- 이번 Backend Mini 카드: `t_16cc7596` — 같은 자격 증명 부재로 두 번 실행 후 차단됨.
- 최종 synthesis 카드: `t_61070c90` — 부모 카드 차단으로 대기.
- 대체 근거: 기존 완료된 Sound Mini 산출물, 현재 프로젝트 코드·파일 직접 검사, 2026-09-12 공식 자료 재검증.

