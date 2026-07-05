# Graphics Studio Audio Section Validation

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 검증 항목

- Audio 탭으로 전환하면 SFX 목록과 파일 경로가 보인다.
- Volume 숫자 입력이 저장 튜닝과 슬라이더 값을 즉시 갱신한다.
- 저장된 Volume/Pitch 튜닝이 `playSfx()` 재생 볼륨과 rate에 적용된다.

## 실행 예정/실행 명령

- `npm test -- src/lib/sfxRegistry.test.js src/components/GraphicsStudio.test.jsx src/components/GraphicsStudioPreview.test.js`
- `npm run build`
