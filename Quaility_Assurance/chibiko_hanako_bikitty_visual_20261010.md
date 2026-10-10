# 치비코·하나코 얼굴 아이콘 및 바이키티 커터 색상 QA

- 대상 작업: 기존 치비코·하나코 아이콘을 각 캐릭터의 얼굴이 확대된 아이콘으로 교체하고, 바이키티 커터 3D 모델을 기존 게임 아이콘처럼 분홍색으로 변경.
- 구현 변경 3파일: `Developer/r3f_prototype/src/assets/weapon_icon/14_wea_chibiko.webp`, `Developer/r3f_prototype/src/assets/weapon_icon/15_wea_hanako.webp`, `Developer/r3f_prototype/src/components/Weapons/BikittyCutter.jsx`.
- 역할 기록 3파일: `Graphic_designer/chibiko_hanako_face_icon_20261010.md`, `Graphic_designer/bikitty_cutter_pink_model_20261010.md`, `Developer/bikitty_cutter_pink_model_20261010.md`.
- 시각 확인: 두 아이콘은 기존 치비코·하나코의 정체성을 유지하면서 얼굴을 확대했다. 바이키티 3D 모델은 몸통 `#ef3084`, 손잡이 `#bc3b6b`, 레일 `#fe7db7`로 기존 핑크 아이콘의 색감을 따른다. 칼날·흰 고양이 머리·형태는 유지했다.
- 구조 확인: 바이키티의 `StudioTunedGroup itemId="weapon-bikitty-cutter"`, 파트 순서·변환값·공격 로직은 변경하지 않았다.
- 검증: Advisor 집중 테스트 9개 통과. 독립 QA의 WeaponModal·Bikitty 집중 테스트 9개 통과. 통합 사본의 Bikitty 전용 테스트 3개와 Studio 연결 검사 통과.
- 빌드: `npm.cmd run build` 통과. Firebase 릴리스 환경 검사, Studio 동기화 테스트 45개, 프로덕션 번들 및 호스팅 자산 56개 검증 통과.
- 데이터: Firebase 읽기·쓰기 테스트를 수행하지 않았고 Firebase 데이터 변경은 없다.
- 라우팅: `escape-zombie-school` Hermes `balanceqa` 카드 `t_0c900eab`는 오래된 D: 경로 검사로 차단되었다. 네이티브 QA는 F: 작업공간의 필수 문서 검사 경로를 사용해 수행했다.
