# Stage 4 주방 소품 표면 가시성 수정

- 정본 감사 `Quaility_Assurance/stage4_prop_transparency_abnormal_visual_audit_2026-08-22.md`의 P0만 적용했다.
- 주방 35개 표면은 깊이를 기록하는 불투명 toon material로 전환했다.
- 외곽선은 기존 `depthWrite: false`, 투명 opacity `0.96`를 그대로 유지했다. 이 의도된 outline 패스는 수정 대상이 아니다.
- 모델 외형, 배치, 소품 종류, 학생, 가마솥, 바닥은 변경하지 않았다.
