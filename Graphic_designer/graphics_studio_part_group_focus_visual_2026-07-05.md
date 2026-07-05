# Graphics Studio Part Group Focus Visual Notes

- Date: 2026-07-05
- Area: Graphics Studio

## 시각 검토

- 그룹이 된 파츠는 얇은 형광색 `BoxHelper` 외곽선으로 표시한다.
- 단일 파츠포커싱에는 외곽선을 추가하지 않고, 2개 이상 그룹일 때만 표시한다.
- 외곽선은 depth test를 끄고 render order를 높여 모델 위에서 식별되게 했다.
