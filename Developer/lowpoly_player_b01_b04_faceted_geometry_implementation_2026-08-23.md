# 주인공·B01~B04 파셋 그래픽 — 롤백 경험 및 연구 자산 기록

- 기록일: 2026-08-23
- 폐기 구현: `a66a70d`의 주인공·B01~B04 파셋 그래픽 변경
- 제품 기준 상태: `c40c5b21a43628c314df66a946ad62ea44ca980d`
- 상태: 아래 내용은 **재조사 때 참고할 연구 자산**이다. 폐기 구현·테스트·콘셉트 이미지·brief·QA 문서·캡처를 복원하거나 재사용하라는 승인, 현재 제품의 QA PASS, 배포 근거가 아니다.

## 1. 롤백 사실과 연구 범위

- 대상 커밋의 Player/B01~B04 파셋 지오메트리와 관련 테스트 변경은 기준 상태로 되돌렸다. 그 방향을 위해 추가한 콘셉트 이미지, 구현 brief, QA 문서와 캡처도 제거했다.
- Firebase 데이터·저장 경로와 기존 Title·Studio·게임의 다른 소스는 변경하거나 재적용하지 않았다. 외부에서 삭제된 문서·PNG를 복원하지 않으며, 폐기한 그래픽 코드도 복원하지 않는다.
- 당시 남은 증거가 뒷받침하는 범위는 구조(기존 트리·숫자 Studio child path 유지 여부), focused test, 로컬 production build, 당시의 정적 캡처뿐이다.
- 이는 사용자 아트 승인과 다르다. 또한 실제 game·Graphics Studio·title이 **동일 Firebase revision**으로 동작하는 E2E 검증, 실제 기기/목표 장면에서의 성능 계측은 수행·입증되지 않았다. 따라서 과거의 build·캡처를 아트 승인·Studio E2E PASS·성능 PASS로 확대 해석하지 않는다.

## 2. 폐기 구현에서 확인한 지오메트리 한계

- `geometryKind` 이름은 모양을 보장하지 않는다. 당시 `wedge`는 위·아래 반지름이 같은 4각 `CylinderGeometry`였으므로, 쐐기형 단면이나 비대칭 기울기를 실제로 만들지 못했다.
- `flatDisc`도 별도 원판이 아니라 동일 반지름의 6각 `CylinderGeometry`를 X축으로 90도 회전한 형태였다. 이름만으로 얇은 원판·배지·앞면 실루엣을 충족했다고 볼 수 없다.
- `toNonIndexed()`로 면마다 노멀을 분리하고, 선택 경로에 3단 grayscale gradient와 part별 emissive 값을 사용했다. 이는 빛의 단계와 밝기 인상을 바꾼 것이지 원화의 실루엣·표면·색 승인을 증명하지 않는다.
- 그러므로 새 원화가 요구하는 모양은 primitive 별칭을 재사용해 추정하지 말고, 원화의 실제 실루엣과 부품 단위로 다시 설계·승인해야 한다.

## 3. 재조사 시 보존해야 할 Studio 변형 계약

- 유효한 연결은 `StudioTunedGroup`의 기존 `itemId`, 기존 숫자 child 순서, 기존 part/group ID와 pivot(관절 기준점)을 바꾸지 않는 범위에서만 검토한다. fill·outline·얼굴 등 `ZBlock` 계층도 선택 경로와 변형 상속을 깨지 않게 보존해야 한다.
- part의 JSX 선언 transform은 최초 편입 시 base transform으로 캡처한다. 이후 position·rotation은 `base + Studio offset + animation offset`, scale은 `base × Studio multiplier × animation multiplier`로 합산한다. 애니메이션이 절대 자세를 대입하는 경우에는 base를 다시 더하지 않고 Studio offset만 더해야 한다.
- Player는 `player`, B01은 `zombie-b01`, 나머지는 기존 `getStudioZombieItemId(...)`가 정한 ID를 계속 사용해야 한다. ID·순서·pivot·base-transform 합산 규칙 중 하나라도 바뀌면 구조 안전성도 새로 검증해야 한다.
- B02는 Stage 2 Boss v2 경로만 허용한다. legacy B02 모델·ID·튜닝·변환을 복구·참조·변환하는 것은 즉시 중단 사유다.

## 4. 성능 연구 결론: 캐시는 후보이고 계측은 필수

- 동일한 kind·치수의 geometry와 동일한 재질 조합을 캐시하는 방법은 생성·dispose 횟수를 줄일 수 있는 후보였다. Studio의 사용자 재질 조정은 기존 per-mesh clone 격리를 유지해야 공유 원본을 오염시키지 않는다.
- 반대로 non-indexed geometry는 정점·메모리·전송량을 늘릴 수 있고, inverted-hull outline은 각 표면의 추가 draw/geometry 비용을 만든다. 캐시가 있다고 해서 이 비용이 사라지지 않는다.
- 따라서 새 작업에서는 대상 수·카메라 거리·동시 등장 수가 있는 실제 game/Studio/title 장면에서 baseline과 비교해 CPU/GPU/메모리·draw 성능을 계측해야 한다. 수치와 허용 예산 없이 “최적화됨” 또는 “성능 PASS”라고 판단하지 않는다.

## 5. 새 원화가 제공될 때의 입력과 진행 순서

- 시작 조건은 사용자가 직접 제공한 새 원화다. 원화에는 최소한 대상(Player 또는 어느 보스인지), 정면·측면·후면 또는 동등한 회전 정보, 필수 실루엣·부품, 색/재질·외곽선 의도, 상대 크기와 생략 불가 특징이 식별 가능해야 한다. 빠진 항목을 이전 파셋이나 기존 데칼로 추정해 채우지 않는다.
- 원화가 들어오면 첫 범위는 Player 1종의 vertical slice(실제 사용 경로 전체를 한 대상만으로 끝까지 확인하는 작업)다. 원화 → Player 1종 → 실제 game·Graphics Studio·title의 동일 revision 비교 → 사용자 승인 순서로만 진행한다.
- 이 slice에서 사용자 승인이 난 뒤에만 B01~B04 등 나머지 대상으로 확대한다. 원화 제공 전에는 모델링, 그래픽 적용, Graphics Studio 파라미터 변경을 하지 않는다.

## 6. 수용 기준과 즉시 중단 기준

- 수용 후보가 되려면 사용자 원화와 Player 1종 slice의 실제 세 화면이 같은 revision에서 비교 가능해야 하고, 사용자가 그 결과를 승인해야 한다. Studio ID·숫자 child 순서·pivot·base-transform 합산, B02 v2 전용 규칙, 실제 성능 계측도 각각 확인되어야 한다.
- 다음 중 하나라도 발생하면 즉시 중단한다: 새 원화 또는 사용자 승인이 없음, 폐기 구현/삭제 파일을 복원·재사용하려는 요구, ID·숫자 경로·pivot·변형 합산 불일치, B02 legacy 경로 참조, 동일 revision의 game·Studio·title 검증 불가, 측정 없이 성능 합격을 주장하는 경우.
- 이 중단 기준은 연구 자산을 현재 구현으로 오인하지 않기 위한 경계다. 새 원화가 제공되기 전에는 어떤 재적용도 하지 않는다.
