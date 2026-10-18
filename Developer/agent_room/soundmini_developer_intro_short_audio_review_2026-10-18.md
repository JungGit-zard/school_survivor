# 개발자 소개 쇼츠 오디오 검토 기록

- Kanban routing: `escape-zombie-school` 카드 `t_2949ccbe`, 담당 `soundmini`.
- 적용 소스: 기존 정본 `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`.
- 정본 확인: 998,122 bytes, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`.
- 영상 처리: 원본 첫 30초를 AAC 트랙으로 사용하고 끝 1초에 페이드아웃 적용. 정본 파일을 수정하거나 대체하지 않았고 음성/TTS를 추가하지 않았다.
- specialist 관점: 기존 타이틀 BGM을 소개 영상에 그대로 사용하므로 새 음원이나 새 라이선스 항목을 추가하지 않는다. 길이 조정과 페이드만 적용하며 보이스오버가 없어 게임 타이틀 음악의 인상과 충돌하지 않는다.
- 검증: 메인 QA가 FFmpeg 전체 스트림 디코드를 실행해 exit 0 및 오류 없음 확인. 여섯 키프레임과 30초 길이, 1080×1920 H.264/AAC 메타데이터 확인.
- 결과: 이 쇼츠의 오디오 구성은 요청 범위에 부합한다. 이 기록은 카드와 함께 남기는 오디오 사용 검토 trail이며, soundmini가 별도 메시지로 검토 응답했다는 뜻은 아니다.
- 재현 자료: `Graphic_designer/developer_intro_short_20261018/source_inventory.json`, `render_short.py`, MP4 및 SRT.
