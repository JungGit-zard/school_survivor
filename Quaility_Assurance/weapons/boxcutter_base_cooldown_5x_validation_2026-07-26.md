# 커터칼 기본 쿨다운 5배 검증

## 검증 범위

- 업그레이드 없는 `boxCutter.base.cooldown`
- 기본 피해, 사거리, 폭, 넉백, 치명타 수치의 유지
- `upgrades.js`의 커터칼 쿨다운 업그레이드 부재

## 실행 결과

2026-07-26에 `Developer/r3f_prototype`에서 다음을 실행했다.

```text
npx vitest run src/lib/weaponCatalog.test.js
```

결과: 테스트 파일 1개, 테스트 22개 모두 통과.

## 확인 결과

- 쿨다운은 `3250ms`이며 `650 * 5`와 동일하다.
- 게임 시간으로 `3.25초`다.
- `damage: 24`, `range: 1.4`, `width: 0.18`, `knockback: 1.8`, `critChance: 0.1`, `critMultiplier: 1.5`는 유지된다.
- 커터칼 업그레이드는 피해·사거리·치명타만 정의하며 쿨다운 항목은 없다.
