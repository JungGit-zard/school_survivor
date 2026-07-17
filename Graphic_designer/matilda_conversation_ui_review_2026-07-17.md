# 마틸다 등장 대사 UI 그래픽 리뷰

## 사용 자산

- 원본: `Graphic_designer/graphic_asset/boss_etc/matilda_conversation.png`
- 앱 번들 복사본: `Developer/r3f_prototype/src/assets/character/matilda_conversation.png`

## UI 구성

- 화면 하단 중앙에 RPG식 대사창을 배치했다.
- 좌측에는 마틸다 프로필 이미지를 정사각 프레임에 넣었다.
- 우측에는 이름 배지와 대사 텍스트를 분리했다.
- 대사창은 크림색 종이 계열 배경, 진한 외곽선, 두꺼운 그림자로 기존 학교풍 UI와 충돌하지 않게 했다.

## 가독성 기준

- 대사 텍스트는 `clamp(16px, 3.7vw, 22px)`로 모바일/데스크톱에서 모두 읽히게 했다.
- `wordBreak: keep-all`과 `overflowWrap: anywhere`를 함께 사용해 한국어 문장이 최대한 자연스럽게 줄바꿈되도록 했다.
- 대사창은 `pointerEvents: none`으로 전투 조작을 막지 않는다.
