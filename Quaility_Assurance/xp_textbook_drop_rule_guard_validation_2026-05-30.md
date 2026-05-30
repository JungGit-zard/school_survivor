# XP Textbook Drop Rule Guard Validation - 2026-05-30

## 검증 대상

- 일반 적 경험치 교과서 드랍 판정.

## 테스트 기준

- `TEXTBOOK_DROP_RATE`는 `0.3`이어야 한다.
- `xp > 0`이고 roll이 `0.3`보다 작으면 교과서를 드랍한다.
- roll이 `0.3` 이상이면 일반 교과서를 드랍하지 않는다.
- `xp = 0`인 적은 일반 랜덤 교과서를 드랍하지 않는다.

## 실행 명령

```powershell
npm.cmd test -- src/components/Enemies.test.jsx --run
npm.cmd test -- --run
npm.cmd run build
```

## 결과

- RED 단계: `TEXTBOOK_DROP_RATE`와 `shouldDropTextbook`이 export되지 않아 실패.
- GREEN 단계: 판정 함수 추가 후 `Enemies.test.jsx` 6개 테스트 통과.
- 전체 테스트: 25 files / 159 tests 통과.
- 프로덕션 빌드: 통과.
- Vite 대형 청크 경고는 표시되었지만 빌드 실패는 아니다.
