# CompassBlade black screen validation - 2026-06-25

## Scope

- 플레이 중 갑자기 화면이 검게 변하는 현상의 의심 구간을 검증했다.
- 직접 재현된 원인인 `CompassBlade` 리스폰 중 Rapier 예외를 수정 후 재검증했다.

## Reproduction before fix

- 조건: Stage 1, 약 190초대 보스/다수 적 압박, `compassBlade` 활성화.
- 결과: Rapier WASM 예외 발생 후 DOM body가 비고 canvas가 사라지는 상태를 확인했다.
- 주요 오류:
  - `RuntimeError: unreachable`
  - `recursive use of an object detected which would lead to unsafe aliasing in rust`
  - `null pointer passed to rust`
  - `expected instance of EA`

## Isolation result

- 전체 무기에서 `compassBlade`만 제외: 오류 0회, canvas 유지.
- `compassBlade`만 활성화: Rapier 예외 재현.
- 판정: 직접 재현된 블랙/공백 화면 원인은 `CompassBlade` 리스폰 중 물리 바디 처리다.

## Verification after fix

### Browser stress

- 서버: Vite dev server `http://127.0.0.1:5197/`
- 시나리오 1: `compass-only-respawn-stress`
  - `pageErrorCount`: 0
  - `consoleErrorCount`: 0
  - `canvasCount`: 1
  - `canvas`: 1280 x 720 유지
- 시나리오 2: `all-weapons-stress`
  - `pageErrorCount`: 0
  - `consoleErrorCount`: 0
  - `canvasCount`: 1
  - `canvas`: 1280 x 720 유지

### Automated tests

- `npm test -- src/components/Weapons/CompassBlade.test.jsx`
  - 1 file passed
  - 6 tests passed

- `npm run build`
  - production build passed
  - Vite chunk size warning only; build failure 없음

- `npx vitest run --maxWorkers=1 --no-fileParallelism`
  - 58 files passed
  - 310 tests passed

## Notes

- `npx vitest run --maxWorkers=1 --minWorkers=1`는 현재 Vitest 버전에서 `--minWorkers` 옵션을 지원하지 않아 옵션 파싱 단계에서 중단됐다. 검증 실패가 아니라 잘못된 옵션 사용이다.
- 기존 `stage1_visual_loop_screenshot_pass_2026-06-24.output.json`의 WebGL context loss / GPU memory 로그는 별도 잔여 위험으로 남아 있다. 이번 검증 범위에서는 직접 재현된 Rapier 예외성 블랙스크린이 사라졌는지를 확인했다.
