# Stage 1 visual loop screenshot QA pass — 2026-06-24

프로젝트: Escape! zombie school
역할: Balance_QA_Mini / 밸검미니
Kanban: `t_26197769`
범위: 현재 워킹트리 기준 Stage 1 브라우저 게임플레이 시각 루프 캡처

## 1. 결론

조건부 PASS / 출시 게이트 PASS 아님.

브라우저에서 Stage 1 게임플레이를 실행하고, Playwright Chromium을 `--disable-vulkan --use-angle=gl --ignore-gpu-blocklist`로 재실행해 플레이어, E01, E05 구간, B01 구간, 3종 이상 무기 효과, 픽업, 바닥/스테이지 오브젝트를 스크린샷으로 확보했다.

다만 이 결과는 데스크톱 브라우저/치트성 시간 점프 기반 시각 캡처이며, 실제 모바일/Android WebView 검증으로 승격하지 않는다. 기본 Chromium 경로에서는 WebGL/ANGLE Vulkan 메모리 오류로 캔버스가 흰 화면이 되는 실패가 먼저 재현되었으므로, 저사양/특정 GPU 환경 리스크로 추적해야 한다.

## 2. 정확한 스크린샷 경로

| 파일 | 커버리지 | 판정 |
|---|---|---|
| `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/screenshots/stage1-visual-loop-00-title-2026-06-24.png` | 타이틀/진입 전 상태 | 참고용. `치트` 버튼 노출은 게임플레이 프록시 문제는 아니지만 릴리스 게이트에서는 별도 확인 필요. |
| `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/screenshots/stage1-visual-loop-01-initial-player-e01-floor-pencil-2026-06-24.png` | 플레이어, E01 다수, 연필 투사체, 교과서/골드 픽업, 목재 바닥, 책상/의자 오브젝트 | PASS |
| `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/screenshots/stage1-visual-loop-02-e05-charge-weapons-pickups-2026-06-24.png` | 02:11 치트성 시간 점프 후 E05 포함 적 조합, E05/돌진 경고선으로 보이는 긴 청색 세로 VFX, 3종 이상 무기/VFX, 픽업, 바닥/오브젝트 | PASS with note |
| `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/screenshots/stage1-visual-loop-03-b01-boss-loop-2026-06-24.png` | 03:18 치트성 시간 점프 후 B01 보스, 다수 적, 3종 이상 무기/VFX, 픽업, 바닥/오브젝트 | PASS |

보조 산출물:

- 스크린샷 자동화 스크립트: `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.mjs`
- 최종 성공 실행 로그: `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24_gl3.output.json`
- 실패/재시도 로그: `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.output.json`, `..._gl.output.json`, `..._gl2.output.json`

## 3. 실행 명령과 실제 결과

### 정책/환경 확인

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
```

결과:

```text
GSTACK_OK
```

### 개발 서버

```bash
npm run dev -- --host 127.0.0.1 --port 5192
curl -I --max-time 5 http://127.0.0.1:5192/
```

결과:

```text
HTTP/1.1 200 OK
```

### Playwright 브라우저 설치

이전 QA에서 Playwright Chromium 실행 파일 부재가 차단 조건이었으므로 설치를 수행했다.

```bash
npx playwright install chromium
```

결과:

```text
Chrome for Testing 148.0.7778.96 (playwright chromium v1223) downloaded
Chrome Headless Shell 148.0.7778.96 (playwright chromium-headless-shell v1223) downloaded
```

### 1차 기본 실행 — 실패 기록

```bash
node ../../Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.mjs \
  > ../../Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.output.json
```

결과:

- 스크린샷 파일은 생성되었지만 캔버스가 흰 화면에 가까웠다.
- `errors[0]`: `TypeError: Cannot read properties of null (reading 'trim')`
- stack 핵심: `three.js -> onFirstUse -> WebGLProgram.getUniforms -> WebGLRenderer.render`
- console 핵심:
  - `WebGL: CONTEXT_LOST_WEBGL`
  - `THREE.WebGLRenderer: Context Lost.`
  - `GL_OUT_OF_MEMORY ... ContextVk.cpp ... Vulkan ... device memory allocation has failed.`

### 2차/3차/최종 실행 — 성공 기록

```bash
QA_CHROMIUM_ARGS='--disable-vulkan --use-angle=gl --ignore-gpu-blocklist' \
  node ../../Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.mjs \
  > ../../Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24_gl3.output.json
```

결과 요약:

```json
{
  "results": [
    "00-title",
    "01-initial-player-e01-floor-pencil",
    "02-e05-charge-weapons-pickups",
    "03-b01-boss-loop"
  ],
  "errors": [],
  "logs": ["THREE.WebGLRenderer: Context Lost."]
}
```

해석:

- 최종 실행에서는 `pageerror` 0개로 스크린샷 캡처 성공.
- `THREE.WebGLRenderer: Context Lost.` 로그 1회는 남았다. 캡처 자체는 정상 렌더링되었지만 WebGL context stability 리스크로 계속 추적해야 한다.

### 산출물 크기 확인

```bash
wc -c Quaility_Assurance/screenshots/stage1-visual-loop-*.png \
  Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24*.json \
  Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.mjs
```

결과 요약:

```text
273023  stage1-visual-loop-00-title-2026-06-24.png
992508  stage1-visual-loop-01-initial-player-e01-floor-pencil-2026-06-24.png
1037547 stage1-visual-loop-02-e05-charge-weapons-pickups-2026-06-24.png
1043812 stage1-visual-loop-03-b01-boss-loop-2026-06-24.png
3364074 total
```

## 4. 시각 검증 세부 결과

### 플레이어 / E01 / 바닥 / 픽업

스크린샷: `stage1-visual-loop-01-initial-player-e01-floor-pencil-2026-06-24.png`

관찰:

- 플레이어는 중앙 하단에 3D 카툰 캐릭터로 표시된다.
- E01 기본 좀비가 다수 표시되며 모두 3D 블록형 카툰 모델로 보인다.
- 적/플레이어 주변에 얇은 외곽선 계열 표현이 보인다.
- 연필 투사체가 플레이어 주변에 보인다.
- 파란 교과서/아이템과 금색 코인으로 보이는 픽업이 보인다.
- 목재 바닥 타일, 책상, 의자 오브젝트가 보인다.
- 플레이어 대체용 원형 디버그 프록시, 조준 원, 위치 보정용 표식은 보이지 않는다.

판정: PASS.

### E05 / 돌진 경고 / 무기 효과

스크린샷: `stage1-visual-loop-02-e05-charge-weapons-pickups-2026-06-24.png`

관찰:

- 빨간색 적과 보라색 적이 함께 보이며, E05 구간 치트성 시간 점프 후 고밀도 적 조합이 렌더링된다.
- 좌측에 활성 무기 목록이 표시되고, 화면 안에 연필, 30cm 자/커터 계열로 보이는 긴 세로 VFX, 텀블러/벨/전기/나침반 계열로 보이는 여러 무기 효과가 동시에 보인다.
- 긴 청색 세로 VFX가 돌진 경고선 또는 공격 경고선처럼 보이며, 충돌/돌진 경고 가독성은 확보된다.
- 픽업이 다수 보인다.
- 2D 캐릭터/몬스터 스프라이트 대체는 보이지 않는다.
- 눈에 띄는 디버그 프록시 도형은 보이지 않는다.

주의:

- `go!` HTML 말풍선 자체는 이번 최종 캡처 프레임에 명확히 잡히지 않았다. 기존 그래픽 감사의 P1 watch item인 `GoSpeechBubble` 2D HTML 큐는 별도 구현/제거 카드에서 계속 추적해야 한다.

판정: PASS with note.

### B01 보스 / 후반 전투 루프

스크린샷: `stage1-visual-loop-03-b01-boss-loop-2026-06-24.png`

관찰:

- 큰 검은색 B01 보스가 화면 중앙 우측에 보이며, 일반 적보다 크고 붉은 눈/카툰 외곽선이 보인다.
- 주변에 E01/E02/E05 계열로 보이는 다수 적이 함께 렌더링된다.
- 플레이어 주변에 우산/보호막, 회전/투사체/충돌 VFX, 픽업, 바닥 오브젝트가 동시에 보인다.
- 보스가 2D 스프라이트나 평면 대체 이미지로 보이지 않는다.
- 일반 플레이 화면에 플레이어 대체 원형 프록시나 디버그 충돌체는 보이지 않는다.

판정: PASS.

## 5. 3D toon / outline / no-sprite / no-debug-proxy 정책 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| 플레이어 3D toon | PASS | 플레이어가 3D 카툰 캐릭터로 렌더링됨. |
| E01 3D toon | PASS | 기본 좀비가 3D 블록형 카툰 모델로 다수 표시됨. |
| E05 구간 | PASS with note | 빨간/보라 적과 경고/공격 VFX가 보임. `go!` HTML 큐는 이번 프레임에서 직접 확인하지 못했으며 기존 P1 watch item 유지. |
| B01 3D toon | PASS | 큰 보스가 3D 카툰 모델로 표시됨. |
| 외곽선 | PASS | 플레이어/적/보스 외곽선 계열 표현 관찰. |
| 캐릭터/몬스터 2D 스프라이트 대체 금지 | PASS | 스크린샷상 캐릭터/몬스터가 2D 스프라이트 대체로 보이지 않음. |
| visible debug proxy 금지 | PASS | 일반 플레이 화면에서 플레이어 대체 원, 조준 원, 충돌체 프록시는 보이지 않음. |
| 바닥/스테이지 오브젝트 | PASS | 목재 바닥, 책상, 의자 렌더링 확인. |
| 픽업 | PASS | 교과서/코인성 픽업 다수 확인. |
| 세 가지 이상 무기 효과 | PASS | 연필, 긴 자/커터 계열, 우산/보호막, 전기/나침반/미사일 계열 등 다수 VFX 확인. |

## 6. 블로커

현재 스크린샷 QA 자체를 막는 블로커는 최종 실행 기준으로 없음.

릴리스/모바일 Go 판정을 막는 블로커는 기존 QA와 동일하게 남아 있다.

- 실제 Android 기기 또는 Android WebView에서 Stage 1 전체 루프를 검증하지 않았다.
- 이번 결과는 Playwright 데스크톱 Chromium + 치트성 시간 점프 기반이다.
- 기본 Chromium/Vulkan 경로에서 WebGL context loss와 `GL_OUT_OF_MEMORY`가 재현되었다.
- 현재 작업트리는 다른 담당자의 수정/미추적 파일이 매우 많은 dirty 상태다. 이번 QA는 런타임 코드를 커밋하거나 정리하지 않았다.

## 7. 관찰 사항 / 리스크

- 최종 성공 실행에서도 console log에 `THREE.WebGLRenderer: Context Lost.` 1회가 남았다. 캡처 종료 시점 로그일 수 있으나, 이전 기본 실행의 Vulkan OOM과 함께 모바일/저사양 GPU 리스크로 추적해야 한다.
- 타이틀 화면에 `치트` 버튼이 보인다. 이번 과제의 “debug proxy” 범위는 일반 플레이 화면의 디버그 도형이지만, Play 테스트/외부 테스트 노출 정책에서는 별도 확인해야 한다.
- 좌측 무기 목록은 스크립트가 모든 무기를 활성화한 치트성 QA 상태이므로, 자연 플레이의 2~3무기 후반 상태와 동일하다고 주장하면 안 된다.
- E05 `go!` HTML 큐는 이번 최종 프레임에 직접 잡히지 않았다. 기존 감사의 2D HTML charge cue watch item은 해소된 것으로 표시하면 안 된다.

## 8. 재현 절차

1. 프로젝트 루트에서 `test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING` 실행.
2. `Developer/r3f_prototype`에서 `npm run dev -- --host 127.0.0.1 --port 5192` 실행.
3. 필요 시 `npx playwright install chromium` 실행.
4. 최종 캡처:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
QA_CHROMIUM_ARGS='--disable-vulkan --use-angle=gl --ignore-gpu-blocklist' \
  node ../../Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.mjs \
  > ../../Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24_gl3.output.json
```

5. 위 `screenshots/stage1-visual-loop-*.png` 4개를 열어 시각 확인.

## 9. 이번 QA에서 생성/수정한 파일

- `Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.md`
- `Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.mjs`
- `Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.output.json`
- `Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24_gl.output.json`
- `Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24_gl2.output.json`
- `Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24_gl3.output.json`
- `Quaility_Assurance/screenshots/stage1-visual-loop-00-title-2026-06-24.png`
- `Quaility_Assurance/screenshots/stage1-visual-loop-01-initial-player-e01-floor-pencil-2026-06-24.png`
- `Quaility_Assurance/screenshots/stage1-visual-loop-02-e05-charge-weapons-pickups-2026-06-24.png`
- `Quaility_Assurance/screenshots/stage1-visual-loop-03-b01-boss-loop-2026-06-24.png`

커밋은 하지 않았다.
