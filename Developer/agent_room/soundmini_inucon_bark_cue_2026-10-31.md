# soundmini: inuconBark 대리 피격 짖음 cue (2026-10-31, receipt 3451d835)

- 요청: Terry "이누콘은 대신 피해를 받을 때 크게 짖는다". 런타임 emit(`emitSfx({ id: 'inuconBark' })`)은 levelmini 카드 담당.
- 생성기: `scripts/generate_voice_sfx.mjs` `inuconBark` (dogeYelp 기반 source-filter 합성, seed 0x6506, 외부 샘플 없음).
- 파라미터: dur 0.26s, f0 300→430→240Hz(x VOICE_PITCH_SCALE), 'aw'→'aa' 단음절 "왈!", 노이즈 어택 0.6, drive 1.6, 8bit.
- 볼륨: targetLoudness 0.20 (inuconBite 0.17보다 한 단계). 실측 mean -16.3dB / peak -10.1dB (inuconBite mean -23.6dB).
- 쿨다운: POLYPHONY_COOLDOWN 400ms (음원 260ms보다 길고, 피격 최소 간격 532ms보다 짧아 피격마다 1회).
- 보호: PROTECTED_DANGER_SFX 등록 — 대리 피격은 플레이어 생존 정보라 전투 보이스 캡(6)으로 드롭하지 않는다.
- 파일: `public/sfx/enemies/inuconBark.ogg` 4,721B, `.mp3` 2,760B.
- 라이선스: project-generated-procedural, provenance manifest에 inuconBite 옆으로 등록.
- 부수: audioDiagnostics SFX tripwire 90→91, verify-voice-sfx-assets 목록에 추가.
