# 타이틀 오리요강·치비코 배치 검증 (2026-07-15)

## 결과

- PASS: 오리요강이 주인공 왼쪽에 표시된다.
- PASS: 치비코가 주인공 오른쪽에 표시된다.
- PASS: 390×844 화면에서 두 모델이 잘리지 않고 주요 UI와 겹치지 않는다.
- PASS: 브라우저 콘솔 오류가 없다.
- PASS: 프로덕션 웹 빌드가 성공했다.
- PASS: 전체 테스트 111개 파일, 815개 테스트가 통과했다.

## 검증 명령

```text
npm test -- src/components/TitleScene3D.test.jsx src/components/Weapons/CompassBlade.test.jsx src/lib/graphicsStudioConfig.test.js --reporter=dot
npm run build
npm test -- --reporter=dot
```
