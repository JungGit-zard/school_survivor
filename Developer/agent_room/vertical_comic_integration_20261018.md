# 세로 만화 연결과 소비 이력 보호

- Kanban: `t_daf7aef9`, `threemini` 기존 자산 파이프라인 역할 재사용. 외부 Codex worker 실행 중 중복 자동 배정을 막기 위해 blocked로 기록.
- 범위: 현재 X/Facebook 각 언어 15장, 총 120경로의 순서를 유지하며 세로 편집본으로 연결한다. 원본 파일·과거 영수증·예약·게시 브라우저는 변경하지 않는다.
- `PostingVariant.ps1`: 후보와 과거 `publish_intent`/`verified` SHA를 카탈로그 `sha256` → `derivedFromSha256` 계보의 최초 원본으로 비교한다. 중간 대사 수정본도 연결한다. 잘못된 계보·순환·현재 파일과 카탈로그 SHA 불일치는 중단한다. 기존 CTA·동결 의도·과거 SHA fallback·at-most-once 검사는 유지한다.
- `Integrate-VerticalComicPool.cjs`는 모든 언어 manifest 완료 후에만 실행한다. `Register-VerticalComicPool.ps1`이 기존 serial mutex를 즉시 획득하고 백업·120경로 연결·카드 생성을 수행한 뒤 해제한다. 설정의 다른 항목 및 예약 시각은 그대로 유지한다. 원본/영수증 해시도 전후 비교한다.
- X의 `x_link_card.enabled=true`와 기존 `Build-XWebsiteCards.mjs`를 유지한다. 새 이미지 SHA의 HTML/PNG를 만들며 사진 게시로 우회하지 않는다.
- 홈페이지의 정규 빌드 입력은 `Developer/r3f_prototype/public/comics/backlog-20261015/{locale}/{01..10}.png` 40개로 보존한다. 현재 작업 repo에는 원래 해당 public 경로가 없어 approved 편집본을 추가하며, 파일이 이미 있는 환경에서는 registration backup에 기존 바이트를 보존한 뒤 교체한다. Vite의 기본 public 복사 기능을 사용하며 앱/빌드 코드는 바꾸지 않는다.
- 홈페이지는 기존 `/comics/backlog-20261015/{locale}/{01..10}.png` 40개만 교체한다. 정상인 첫5개 세로 만화, 앱·루트·게임 bundle·Hosting 설정은 보존한다. `Preview-VerticalComicAssets.cjs`는 기존 Hosting API 도구를 재사용하여 live baseline clone, 40경로 교체, 새 hash 카드 추가, 전체 파일/설정 보존 비교, preview HTTP 원문 바이트 비교, live baseline fence를 수행한다. 기본 실행과 `--create-preview`는 live를 변경하지 않는다. 별도 `--promote-reviewed-preview`는 메인 검토 후에만 실행하며, 저장된 manifest/preview 바인딩·현재 로컬 바이트·후보 전체 파일/설정·HTTP 바이트·live baseline을 다시 검증한 뒤 정확히 검토한 immutable 버전을 승격한다. 메인 검토 전 production release를 생성하지 않는다.
- 필수 런타임 의존성: `Deploy-XWebsiteCards.cjs`와 회귀파일은 기존 작업 디렉터리에만 있던 파일이므로 이번 scoped commit에 함께 포함해야 한다. 기존 카드 publisher의 정책/동작 변경은 없고 재사용 helper export만 추가했다.

검증: 실제 일본어 원본·대사 수정본·세로 편집본을 사용한 격리 영수증 테스트 9건 통과. 기존 `Test-ComicImageRotation.ps1` 통과(legacy hash·동결 순서·미사용 순서·소진·unknown fail-closed). Hosting 기존5건+새 allowlist/cleanUrls5건 통과. 실제 등록/preview 증거는 모든 언어 완료 후 `Graphic_designer/comic_vertical_20261018/pool_update.json`과 `hosting-preview.json`에 기록한다.
