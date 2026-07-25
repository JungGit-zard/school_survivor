# 크리티컬 화면 흔들림 시각 조사

작성일: 2026-07-25  
상태: 조사 기반 권장 초안 — 플레이테스트 튜닝 대상, 구현 확정값 아님

## 방식 비교

| 방식 | 장점 | 모바일 쿼터뷰 위험 | 1차 판단 |
| --- | --- | --- | --- |
| 카메라 화면 로컬 가로/세로 오프셋 | 타격 방향과 즉시 연결되고, 짧게 원점 복귀시 가독성이 좋다 | 과한 폭·시간은 HUD와 적 위치 인지를 흔든다 | 채택 |
| 카메라 회전 pitch/yaw/roll | 강한 충격감을 낼 수 있다 | 수평선과 조작 방향이 흔들려 멀미·오조작 위험이 크다 | 제외 |
| FOV/zoom pulse | 큰 타격·폭발을 강조한다 | 화면 깊이 변화와 UI 크기 변화가 커서 연속 전투에 피로하다 | 제외 |
| 화면 전체 flash | 즉시 눈에 띈다 | 다발 시 과도한 점멸이 되며 기존 피격 flash와 중복된다 | 기본 제외 |

## 반드시 지켜야 할 사항

- 반드시 카메라의 최종 월드 위치에만, **카메라 화면 로컬 가로/세로 축에서 계산한** 일시적인 2D impulse 오프셋을 더하고, follow 카메라의 기준 위치·lookAt 목표·projection은 바꾸지 않는다. 이 게임은 45도 쿼터뷰이므로 월드 Y를 화면 세로 축처럼 직접 흔들지 않는다.
- 반드시 기본값은 90ms, 카메라 화면 로컬 가로/세로 축 기준 X 0.7%/Y 0.35%(또는 2~4px 상당)로 시작한다. 이는 이 프로젝트용 조사 기반 권장 초안이다.
- 반드시 강한 크리티컬은 140ms, 카메라 화면 로컬 가로/세로 축 기준 X 1.15%/Y 0.55% 이내로 제한한다.
- 반드시 흔들림은 대상이 있는 화면 방향에서 짧게 출발한 뒤 반대 방향의 작은 감쇠 펄스를 거쳐 0으로 돌아온다. 방향 정보를 얻을 수 없으면 결정론적인 좌우 방향을 사용한다.
- 반드시 데미지 숫자 `critical`의 주황색, 적 hit flash, 스파크를 화면 흔들림의 대체 수단으로 함께 사용한다. 흔들림이 꺼진 사용자도 크리티컬을 인지해야 한다.
- 반드시 `prefers-reduced-motion` 또는 게임의 `reducedEffects`가 켜지면 위치 오프셋을 0으로 한다.

## 절대로 하면 안 되는 사항

- 절대로 기본 크리티컬에 roll, yaw, pitch를 섞지 않는다.
- 절대로 FOV/zoom pulse, blur, 강한 white flash, 무작위 고주파 지터를 기본 경로에 넣지 않는다.
- 절대로 180ms보다 긴 연속 흔들림, 다축 회전, 광역 피해 수만큼의 누적 흔들림을 사용하지 않는다.
- 절대로 reduced-motion 사용자의 시각적 정보(크리티컬 숫자·색상·피격 flash)까지 제거하지 않는다.

## 접근성과 모바일 가독성

W3C는 사용자가 `prefers-reduced-motion`을 요청했을 때 상호작용으로 발생하는 비필수 모션을 억제하는 방식을 제시한다. https://www.w3.org/WAI/WCAG22/Techniques/css/C39

Apple은 빠르게 이동하거나 점멸하는 효과가 현기증, 주의 분산, 일부 경우 광과민 반응을 유발할 수 있으므로 motion을 줄이는 대응을 요구한다. https://developer.apple.com/design/human-interface-guidelines/accessibility/

따라서 이 게임의 작은 위치 오프셋은 전투 정보를 보강하는 선택적 장식이며, 사용자 설정 또는 OS 선호에 따라 0이 되어야 한다. 크리티컬 피드백의 의미는 숫자·색상·flash가 담당한다.

## 외부 조사 근거

- Unity Cinemachine Impulse는 이벤트 위치에서 발생한 impulse를 listener가 카메라 반응으로 변환한다. https://docs.unity3d.com/ja/Packages/com.unity.cinemachine%402.6/manual/CinemachineImpulse.html
- Unreal Camera Shake은 위치·회전·FOV 패턴과 duration/blend/scale을 분리해 조절한다. 이 프로젝트는 그 중 위치와 짧은 duration만 채택한다. https://dev.epicgames.com/documentation/en-us/unreal-engine/camera-shakes-in-unreal-engine
- GDC 2020 `Until You Fall` 발표는 강한 타격감을 위한 출발점으로 hitpause, screen flash, camera shake을 함께 언급한다. 여기서는 모바일 연속 전투 위험 때문에 hit-stop/flash 확대를 1차에서 제외한다. https://media.gdcvault.com/gdc2020/presentations/Until_You_Fall_Bennett_Dave_Jalbert_Patrick.pdf
- 외부 자료는 크리티컬 화면 흔들림의 보편적 exact timing 표준을 정하지 않는다. 이 문서의 수치는 조사 기반 권장 초안이며 플레이테스트 튜닝 대상이다.
