# P4 계측 메모 — Stage 4 주방 소품 형상 캐시 + 정적 행렬 고정 (2026-11-01, threemini)

기준: `C:\Dev\ezs-cf2` `zombie_only` HEAD `8769f71d` + P4 미커밋 변경.
방법: jsdom + 실제 R3F host 객체(GPU는 stub)로 stage4 authored 주방 배치 31개를 마운트하고 서브트리를 순회해 셌다.
측정 하니스: `src/components/StageObjects/KitchenProps.staticFreeze.test.jsx` (`KC_OUT=<경로>`로 수치를 파일에 기록).
**실제 브라우저·GPU `render.calls`와 frame time은 측정하지 않았다.**

| 항목 (주방 소품 31개, 가마솥 제외) | P4 전 | P4 후 |
|---|---:|---:|
| Object3D 수 | 1048 | 1048 |
| Mesh 수 (= frustum culling 전 draw call 상한) | 532 | 532 |
| 고유 geometry 객체 (= GPU 버퍼 세트) | 144 (Box 18, Cylinder 114, Icosahedron 12) | 26 |
| 고유 material 객체 | 22 | 22 |
| 매 프레임 행렬을 다시 조립하는 객체 | 1048 | 32 (레이어 1 + 배치 루트 31) |

- draw call: P4는 draw 수를 바꾸지 않는다(설계상). 카메라에 소품이 전부 들어오면 주방 소품만 532 draw이고, 실제 수는 frustum culling에 달려 있다. 화면 안 비율 추정은 근거가 없어 쓰지 않는다.
- Studio 패리티: mesh 수와 child 순서가 그대로라 numeric child path가 유지된다. Studio Apply 뒤 root·part 변환이 frozen 행렬에 다시 반영되는지 테스트로 확인했다. 재반영을 일부러 빼면 그 테스트가 실패하는 것도 확인했다.

## P3 착수 판정: 아직 no-go (보류)

- 제안서 게이트는 "실제 `render.calls`가 예산을 넘는 것을 측정으로 확인한 뒤에만 착수"다. 수용 기준은 저사양 Android에서 p95 frame time ≤ 33.3ms, 최장 < 100ms다. 이 측정은 아직 없다.
- 이번 오프라인 계측으로 확인된 것은 상한(532 draw)뿐이다. 이 숫자만으로는 예산을 넘었다고 판정할 수 없다.
- 다음 단계: P4를 넣은 빌드에서 `StageEntryRuntimeDiagnostics`의 `render.calls`와 p95 frame time을 제안서 5.2의 3개 위치에서 기록한다. p95가 33.3ms를 넘고 주방 소품 draw가 그 원인으로 보일 때만 P3로 간다(go). 기준 안이면 P3를 하지 않는다.
