# 타이틀 3D 장면 집결 구현 (2026-07-14)

## 구현

- 글자 충돌과 좀비 이모지 정착이 끝나는 3.00초에 `TitleScene3D` Canvas 전체가 화면 아래 105vh 밖에서 진입한다.
- 850ms 동안 최종 위치를 2vh 지나쳤다가 원래 위치로 정착한다.
- WebGL 캔버스 크기 계산을 깨뜨리는 scale은 사용하지 않고 `translate3d`와 opacity만 적용한다.
- 장면 전체를 기존 Canvas 한 레이어로 이동해 캐릭터, 좀비, 책상, 의자, 교실 배경, 클럽 조명이 함께 들어온다.
- Google 로그인과 게임 시작 버튼은 Canvas 연출 밖에 유지해 첫 프레임부터 즉시 사용할 수 있다.
- 타이틀 화면은 저장된 `reducedEffects`와 OS 모션 축소 설정에 관계없이 글자·좀비·3D 장면 연출을 항상 재생한다.

## 구현 범위

- 변경: `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- 테스트: `Developer/r3f_prototype/src/components/TitleScreen.settings.test.jsx`
- 새 타이머, 상태, 의존성, 3D 모델 복제는 추가하지 않았다.
