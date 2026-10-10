# 치비코·하나코 얼굴 아이콘 수정 기록

- 대상: `Developer/r3f_prototype/src/assets/weapon_icon/14_wea_chibiko.webp`, `15_wea_hanako.webp`
- 원본: 같은 경로의 기존 256×256 WebP 전신 아이콘. 기존 파일을 이미지 편집의 참조 및 편집 대상으로 사용했다.
- 변경: 정사각 아이콘에서 얼굴과 머리카락을 중심에 크게 배치한 상반신 클로즈업. 치비코의 긴 검은 머리·흰 의상, 하나코의 분홍 단발·벚꽃 머리장식·꽃무늬 기모노를 유지했다.
- 제작: 내장 `image_gen`의 원본 이미지 편집 기능으로 각 캐릭터를 별도 생성했다. 생성된 PNG를 256×256 WebP로 포맷 변환했다. 게임의 기존 import 경로는 변경하지 않았다.
- 원본 편집 프롬프트: “Keep the exact same cute anime/chibi girl identity and delicate pastel illustrated rendering. Change only the portrait crop/composition: make her face a true close-up, face and hair occupying roughly 70–80% of the square icon; head and shoulders visible; no legs. Retain her original hair, clothing, expression, pale blue-gray background, and soft outline. No text, logo, extra subjects, or watermark.” 캐릭터별 원본의 외형 요소를 각각 명시했다.
- 편집 결과 원본: `C:/Users/admin/AppData/Roaming/orca/codex-runtime-home/home/generated_images/01a125d7-bfa1-7bc3-a8d3-83712bfc5c33/exec-5076d253-afdf-444d-ab9b-8203020d1a15.png` (치비코), `exec-3a57d1bd-ae4e-4eec-9e45-2924a2f414e1.png` (하나코).
