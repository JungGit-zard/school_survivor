# Madangsue 음성 프롬프트 정규화 기록

- Kanban 카드: `t_6a43fd54`; 역할: `madangsue`.
- 정본은 원문 보존, 고신뢰 용어만 치환, 정확한 리터럴 보호, 파괴적 명령/모호성의 가시적 검토 플래그다.
- 훅은 `additionalContext`만 주입하며 실패·부재 시 `{}`을 반환하고 원문을 stderr에 출력하지 않는다. 기존 routing 훅은 보존한다.
- 파일: `Developer/voice_input/escape_zombie_school_voice_lexicon.json`, `prompt_normalizer.py`, `test_prompt_normalizer.py`, `.claude/hooks/normalize-voice-prompt.sh`, `.claude/settings.json`, `AGENTS.md`, 개인 `escape-zombie-school-voice-normalizer/SKILL.md`.
