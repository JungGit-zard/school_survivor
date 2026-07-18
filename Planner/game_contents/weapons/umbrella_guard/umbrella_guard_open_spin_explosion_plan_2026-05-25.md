# Umbrella Guard Open Spin Explosion Plan - 2026-05-25

## Goal

우산 방어막은 즉시 펄스 피해를 주는 보호막이 아니라, 원화처럼 펼쳐진 우산이 자리 잡고 천천히 회전한 뒤 마지막에 범위 폭발 피해를 주는 생존형 무기로 조정한다.

## Runtime Pattern

1. 쿨타임마다 플레이어 위치에 우산을 펼친다.
2. 우산은 약 0.42초 동안 펼쳐진다.
3. 펼쳐진 뒤 약 1.2초 동안 제자리에서 천천히 회전한다.
4. 회전이 끝나는 순간 범위 피해와 강한 넉백을 한 번 적용한다.
5. 폭발 후 짧은 컬러 파편 링을 표시하고 사라진다.

## Balance

| Level Path | Stat | Value |
| --- | --- | --- |
| Base | Damage | 12 |
| Base | Radius | 1.25 |
| Base | Cooldown | 3.6s |
| Base | Spin duration | 1.2s |
| Damage upgrade | Damage | +6 per card |
| Radius upgrade | Radius | +0.15 per card, cap 1.85 |

## Design Reason

- 즉시 피해에서 지연 폭발로 바뀌기 때문에 기본 피해를 5에서 12로 올린다.
- 회전 대기 시간이 있어 플레이어가 유도하거나 적을 끌어들이는 플레이가 생긴다.
- 반경 강화는 폭발형 무기 체감이 커지도록 기존 +0.09보다 큰 +0.15를 사용한다.
- 쿨타임은 1.8초에서 3.6초로 늘려, 폭발 한 번의 위력과 화면 가독성을 확보한다.

