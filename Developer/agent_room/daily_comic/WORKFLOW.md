# 매일 새 4컷 만화 1편 · 6개 언어

Kanban: `t_33531746` / `uimini`. 이 문서는 Codex 예약 작업이 실행하는 절차다. 예약 등록·활성화 자체의 증거는 별도 운영 기록에 남긴다.

## 정본과 시작 조건

- 실행 저장소: `C:/Users/admin/AppData/Local/escape-zombie-school-comics`, branch `zombie_only`, origin `https://github.com/JungGit-zard/school_survivor.git`.
- 매일 한국 시각 09:00부터 해당 한국 날짜의 새 이야기 한 편을 제작·공개한다. 실패 시 5분 간격으로 다시 실행하되 같은 날짜의 공개 완료 작품은 중복 제작·게시하지 않는다. 기존 다른 홍보 포스팅 예약은 변경하지 않는다.
- Orca 예약의 agent 실행 전 gate는 `node Developer/agent_room/daily_comic/precheck.mjs --check-only`를 사용한다. 이 모드는 상태 폴더·lease를 만들지 않는 읽기 전용 검사다. gate 통과 뒤 실제 agent가 다음 항목의 일반 precheck를 실행해 lease를 획득한다. Orca가 gate 표준 출력을 agent에게 전달한다고 가정하지 않는다.
- 먼저 `node Developer/agent_room/daily_comic/precheck.mjs`를 실행한다. 최초 당일 수동 실행만 `--force`를 사용한다. JSON `exitCode: 0`/`status: work-pending`인 경우에만 작업한다. `published`/`leased`/`before-09-KST`이면 종료한다. 읽기 오류는 실패로 기록하며 공개 완료로 간주하지 않는다.
- 출력의 `date`, `leaseId`, `receiptPath`를 보존한다. 상태는 저장소 밖 `C:/Users/admin/AppData/Local/escape-zombie-school-comics-state`에만 둔다. lease는 원자적 배타 획득이며 60분 후 만료된다. 성공·실패·예외 모두 마지막에 `node Developer/agent_room/daily_comic/precheck.mjs --release --lease-id <leaseId>`로 해제한다. 다른 실행의 lease를 지우지 않는다.
- lease 복구용 `reclaim.lock`은 1분 유효시각과 소유 PID를 기록한다. 살아 있는 프로세스의 guard는 유지하고, 죽은 프로세스가 남긴 만료 guard는 다음 실행에서 복구한다.
- `mode: resume-publication`이면 해당 날짜의 이미 존재하는 catalog/image/review를 먼저 읽고 미완료 검증·배포만 이어 간다. 이미지가 이미 만들어졌으면 새로 생성하지 않는다. 부분 생성은 부족한 언어만 이어서 만든다.
- 시작 시 `git status --short --branch`와 origin을 확인한다. 작업트리가 깨끗할 때만 `git pull --ff-only origin zombie_only`로 갱신한다. 다른 작업자의 변경이 있거나 branch/origin이 다르면 보존하고 실패를 기록한다.

## 기획·그림·독립 검수

1. Advisor는 `project_develop_policy.md`, 최신 `SESSION_MEMORY.md` 항목, 필수 라우팅 문서를 읽고 `escape-zombie-school` Kanban으로 배정한다. `levelmini`는 이야기 기획, `threemini`는 실제 그림 제작, `uimini`는 catalog 연결, 독립 `comic_reviewer`는 만화 내용·그림 검수 역할을 맡는다. 새 검수자 persona는 `Developer/agent_room/`의 기존 등록 기록을 재사용하고 없으면 `.toh`로 기록한다. 각 specialist는 자신의 mandatory precommand부터 실행한다. 인증된 사용 가능 모델로 실제 실행하고 빈 placeholder assignee는 사용하지 않는다.
2. 기존 `dailyWebComics.js`와 과거 이야기 기록을 읽고 같은 소재/개그/결말을 반복하지 않는 **새 이야기 한 편**을 쓴다. 4컷 각각 원인 → 행동 → 결과 → 결말이 이어져야 한다. 캐릭터 정체·소품·공간이 갑자기 바뀌지 않는다. 장면별 행동과 대사가 일치하며 설명 없이는 이해 못 할 비약을 넣지 않는다.
3. `Graphic_designer/daily_comics/<date>/`에 4컷 줄거리와 각 컷의 **정확하고 짧은** 말풍선 문구를 한국어/영어/일본어/중국어 간체/베트남어/인도네시아어로 기록한다. 언어 코드: `ko`, `en`, `ja`, `zh-CN`, `vi`, `id`. 독립 검수자는 그림 제작 전 이야기 연결을 확인한다.
4. 제작자는 `C:/Users/admin/.codex/skills/.system/imagegen/SKILL.md`를 읽고 **내장 image_gen 도구로만** 실제 만화를 그린다. 기존 승인된 귀여운 낮은 등신과 홈페이지 만화 그림체를 유지한다. 6개 언어마다 말풍선까지 해당 언어인 실제 PNG를 제작한다. 한국어 이미지를 다른 언어 파일명으로 복제하거나 문구 없는 이미지를 번역 완료로 보고하지 않는다. 신규 일일 만화는 세로 4컷 구조로 만든다.
5. 파일은 `Developer/r3f_prototype/public/web-comics/daily/<date>/<language>.png`에 둔다. 독립 검수자는 **6개 이미지를 실제 열어** 4컷 인과관계, 행동/대사 일치, 읽을 수 있는 해당 언어 글자, 캐릭터 연속성과 이상한 손/소품을 확인한다. 오류는 고치고 같은 이미지로 다시 확인한다. 검수 기록은 `Quaility_Assurance/`, 그림/대사는 `Graphic_designer/`에 남긴다.

## 홈페이지 연결·공개

1. `Developer/r3f_prototype/src/components/dailyWebComics.js`에 해당 날짜 항목을 **정확히 한 개** 추가한다. `id`, `date`, `accent`, 6언어 `images`, 6언어 `copy.title/summary`를 모두 채운다. 이전 5편과 이전 일일 작품을 유지한다. 언어 선택으로 이미지·제목·소개가 함께 바뀌는 기존 연결을 사용한다. 날짜 순으로 뒤에 추가한다.
2. 기존 홈페이지/타이틀/게임/계정/Firebase·뷰어 배율을 변경하지 않는다. 새 자산을 기존 5편 대신 덮어쓰지 않는다. 오늘 catalog가 이미 있으면 같은 항목을 재추가하지 않고 부족한 번역·검수·배포를 이어 간다.
3. 최소 확인: `node --test Developer/agent_room/daily_comic/precheck.test.mjs`, app에서 `npx vitest run src/components/WebLandingPage.test.jsx -t 'daily artwork|legacy and daily' --maxWorkers=1`. 필요한 해당 날짜 생성물과 언어 연결만 확인한다. 운영 Firebase 데이터에는 테스트 쓰기를 하지 않는다.
4. Advisor는 diff를 직접 읽고 새 6언어 이미지·메타데이터를 실제 홈페이지에서 확인한다. 공개 파일만 명시해 stage한다. `git add .`/`git add -A` 금지. 완료 작업의 scoped 변경만 commit하고 알려진 `origin zombie_only`에 push한다. graphics worker가 임의로 push하지 않는다.
5. app에서 `npm run deploy:hosting:safe -- daily-comic-<YYYYMMDD>`를 실행한다. 이 명령은 필수 build/preview 배포/원격 자산 검증 후 live 승격을 수행한다. 검증 실패를 무시하거나 안전 경로를 우회하지 않는다.
6. 새 브라우저 세션에서 `https://escapezombie.com/` 타이틀 및 `홈페이지로` → `/landing`을 확인한다. 만화 목록에 오늘 항목이 있고 6언어 각각의 새 PNG/제목/소개가 표시되는지 확인한다. 6개 live PNG URL의 HTTP 200과 최신 홈페이지 catalog 연결을 별도로 확인한다. 이미지를 실제로 확인하지 않고 완료라고 쓰지 않는다.
7. 검증 완료 후 상태 폴더의 임시 receipt 파일에 다음 형태를 쓴다. `publishedDate`, `verifiedAt`, `commit`, `hostingVersion`은 실제 값이다. `homepageVerified: true`는 live 홈페이지에서 오늘 catalog와 언어 연결을 확인한 경우에만 사용한다. `images`는 6언어 각각 `{ language, url, status: 200 }`다. `node Developer/agent_room/daily_comic/precheck.mjs --mark-published --lease-id <leaseId> --receipt <verified-receipt-path>`를 실행한 다음 finally에서 lease를 해제한다.

```json
{
  "publishedDate": "YYYY-MM-DD",
  "verifiedAt": "실제 ISO 시각",
  "commit": "실제 커밋",
  "hostingVersion": "실제 Hosting 버전",
  "homepageVerified": true,
  "images": [
    { "language": "ko", "url": "https://escapezombie.com/web-comics/daily/YYYY-MM-DD/ko.png", "status": 200 }
  ]
}
```

위 예시 images의 나머지 5언어도 반드시 기록한다. PNG 공개나 catalog가 일부 실패하면 공개 완료 receipt를 쓰지 않고 실패·미완료 단계만 기록한다. 다음 5분 재시도는 같은 날짜의 기존 생성물부터 재개한다.
