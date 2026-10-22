# Stage4 Three_Mini 문서 작업 영수증 — 2026-10-22

- Kanban ID: `t_7aea070f` / 제목: Stage4 threemini detailed planning 20261022.
- 처리: 등록된 threemini 전문가 재사용, DOCUMENT ONLY 완료. 추가 worker 없음.
- 소유 산출물: `Graphic_designer/stage4_graphics_and_zombies_20261022.md`와 이 영수증뿐이다.
- levelmini 소유 `Planner/stage4_advancement_plan_20261022.md`는 수정하지 않았다.

## 선행 확인과 판본
- mandatory checker: `powershell -NoProfile -ExecutionPolicy Bypass -File Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile threemini -Domain auto -TaskSummary "stage4 planning"` → exit 0.
- resolved_domains: common/gameplay/graphics; combined_receipt_sha256: `7af286119cd893177be0493b2533acd37b6678472376deb9cb9c0bb13c69e64c`.
- START_HERE·SOURCE_MANIFEST·중앙 필수 본문 및 READ_REQUIRED의 lounge routing·faceted rollback 문서를 확인했다. SESSION_MEMORY는 마지막 단일 Session 항목만 확인했다.
- Three_Mini.toml의 paths/learning, 지정 graphics_rendering_knowledge_base.md와 관련 최신 iteration `20261020_t_d188b259_VIS01_actual_camera_ray_repair.md`를 확인했다.
- 루트 `ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md` 전체와 실제 Stage4 props·colliders·floor·Enemy·ZombieMesh의 B04·pool·Studio 연결 소스를 읽었다.
- a9 `a9f84bf8e7f22d2b1b1c191f7b23ee2e0e908ff8`, 조회 HEAD `6f416d836e355d22a4e348516cca45e194bcc56c`, 로컬 origin/zombie_only `ef9b701ed30a45144937686a5fe1c1eef1ed105c`를 read-only 비교했다.
- 주요 판본 차이: 작업본 clear 기반 Stage4/5 해금과 원격 참조 BossDefeats 기반 판정, recordBossDefeat 인자, expansion 보충 가드, 마틸다 대시 경로. 출처/한계는 본문 S01~S17과 1.2절에 기록했다.

## 문서 산출 및 실제 정적 검사
- 상세 문서: 238행, 비어 있지 않은 실질 내용 221행. 220~350행 조건 PASS.
- 권장 P1 배식원 1종 / 선택 P2 식판 운반원·국자 투척수·청소 당번 3종, 콘셉트 4개 확인 PASS.
- 신규 크기·시간·색·편성은 제안으로 표시; 각 적 실루엣·부품·상태·대응·pool·후보 파일·개별 수용 기준을 포함한다.
- S01~S17 근거 표, 참조 소스 파일 21개 존재 및 인용 행 범위 정적 검사 PASS. 이 검사는 의미/화면 동작을 자동 입증하지 않는다.
- DOCUMENT ONLY·P1/P2·Firebase-only·소스 기반 위험 가설·비가시 유니코드 부재 검사 PASS; 실행 출력 `DOC_STATIC_PASS`.
- 상세 문서 SHA-256: `3bdb495ba992764a83f0b7c42c9367cf1e0aed3e7353f226a3a5386eeb24be8a`.
- 최초 출처 검사에서 짧은 `Enemies.jsx` 표기를 발견해 `src/components/Enemies.jsx:1936`으로 고친 뒤 전체 정적 검사를 재실행했다.
- 소유 두 경로의 `git diff --cached --name-only` 출력은 비어 있음. commit/push/staging/checkout/복원 없음.
- 실행·DB·브라우저·배포·테스트 파일 수정 없음. Blockbench·원화 생성·게임 빌드·자동 테스트·실기기 검증 없음.
- 해금 DB 영속성·Firebase 실효값·모바일 화면/성능은 미검증이다. 후속 인수 명세를 실제 PASS 결과로 표현하지 않았다.

## 신규 학습 iteration — 소유 범위 안의 검증 기록
- iteration ID: `20261022_t_7aea070f_stage4_document_provenance`; 별도 지식 폴더는 쓰기 소유 범위 밖이므로 이 영수증에 신규 iteration으로 기록한다.
- task ID: `t_7aea070f`; reviewer: threemini 자체 정적 검토, 독립 reviewer 미수행.
- 검증 근거: 위 DOC_STATIC_PASS, 파일/행 검사, read-only a9/작업본/원격 비교. 런타임 성공을 학습 사실로 등록하지 않는다.
- source: `Developer/r3f_prototype/src/lib/stageConfig.js`; SHA-256 `2b07dad1ec6ee15265fa0de6c5a1bab4b23615d30db388edbb50581b225c6124`.
- source: `Developer/r3f_prototype/src/lib/stage4PressureCauldronHazard.js`; SHA-256 `0842d2600a4a00529e4bd151ed25e05a9065e240eeaf7935724e8808352c1588`.
- verified lesson: a9와 같은 파일도 현재 HEAD 대비 dirty일 수 있으며, 로컬 원격 참조에는 해금 판정이 다를 수 있다. 파일 내용 비교와 dirty 여부는 다른 증거다.
- negative lesson: placements의 ‘전부 시각 전용’ 과거 주석만으로 8종 solid+가마솥을 비충돌로 단정하면 안 된다. 실제 collider 집합과 소비 함수를 함께 확인해야 한다.
- redaction result: 계정 식별자·토큰·비밀번호·Firebase 내부 데이터 미기재. 공개 소스 경로·검증 해시·작업 ID만 보존한다.
