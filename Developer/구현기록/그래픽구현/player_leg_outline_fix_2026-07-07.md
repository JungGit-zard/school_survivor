# Player leg outline fix - 2026-07-07

## Problem

- 주인공 다리 파츠에 외곽선이 보이지 않았다.

## Root Cause

- 다리 파츠 자체는 `legL` / `legR` 애니메이션 그룹 안에서 `Block`만 렌더링했다.
- 기존 다리 외곽선은 `PlayerOuterOutline`의 고정 실루엣이라 걷기 애니메이션을 따라가지 않았다.

## Fix

- 양쪽 다리 그룹 안에 허벅지/다리, 신발 상단, 신발 밑창용 `OutlineBlock`을 추가했다.
- 고정 실루엣의 다리 외곽선 2개는 제거했다.
