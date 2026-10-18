# soundmini 오디오 focused QA — 2026-10-16

Kanban:escape-zombie-school/t_3dc10901. 수동 soundmini, 자동 dispatcher blocked 유지.
정본 루트:F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration

- 7개 focused test file /63 tests passed. 실제 stdout:Developer/agent_room/audio_ship_20261016/soundmini/focused-tests.txt
- 매니페스트93 cases /279 candidate WAV. 실제 ffmpeg 디코드462 files, missing0/failures0, 후보 clipping0, 후보 고유 SHA279개.
- 모든 후보쌍279개가 음량 정규화 후 파형/envelope/FFT 비교 통과. 최대 절대 cosine0.6740894232819805.
- 기존 OGG/MP3 원본180개 모두 HEAD와 동일. 기존 원본14파일의 full-scale 인접 샘플 관측은 기록만 남기고 원본을 수정하지 않았다.
- 대사 원본3개는 현재 WebAudio 그래프를 native OfflineAudioContext로 직접 렌더. 후보와 구분한다.
- 11개 범위 보존 조건 통과:SOUND_MAP/튜닝 함수/master 함수/대사 프로필/clamp/SfxLayer/sfxEvents/enemyDeathSfx/titleBgm 불변, provenance inuconBite만 정정.
- 신규 후보는 자동 선택하지 않는다. BGM/타이틀/사용자 데이터/Firebase/localStorage/공유 gameplay 파일 변경 없음. 삭제/commit/push/deploy 없음.

실제 명령·측정·출처·SHA·변경293개 경로의 생략 없는 목록:
Developer/agent_room/audio_ship_20261016/soundmini/README.md
Developer/agent_room/audio_ship_20261016/soundmini/decode-measurements.json
Developer/agent_room/audio_ship_20261016/soundmini/source-reason-sha.json
Developer/agent_room/audio_ship_20261016/soundmini/scope-audit.json

한계:실제 사람의 선호 청취·모바일 스피커·전체 통합 빌드/실기기 수용을 완료한 기록이 아니다. UI는 uimini 소유이며 독립 브라우저 검증/최종 READY/통합 및 배포는 Advisor/integration owner가 담당한다. soundmini 렌더 브라우저 PID2084는 finally에서 닫혔고 별도 프로세스 조회로 종료를 확인했다.
