# 기존 5편 만화 언어 연결 집중 검사

- Kanban `t_a6380677`, uimini Worker.
- 실행: app에서 `npx vitest run src/components/WebLandingPage.test.jsx -t 'localized artwork|daily artwork|legacy and daily' --maxWorkers=1`.
- 결과: **3개 통과, 11개 제외**, session `80500`. 운영 Firebase 접근/쓰기는 하지 않았다.
- 기존 5편 × 6언어에서 카드 href, 썸네일 src, 확대 뷰어 src와 해당 언어 제목을 직접 DOM으로 확인했다. 한국어는 기존 원본 URL이고 나머지는 각 언어의 현지화 PNG URL이다.
- 일일 만화의 해당 언어 이미지·제목·소개 및 마지막 편 → 첫 기존 편 → 이전 편 이동도 확인했다. 총 편수·기존 한국어 작품 연결을 유지했다.
- 5화의 현지화 PNG 5개는 내장 image_gen 출력의 실제 화면을 제작 Worker가 확인했다. 1~4화 작품은 다른 Worker 소유이므로 이 기록에서 그림 검수 완료를 주장하지 않는다. 전체 25개 이미지의 독립 검수·실제 브라우저·배포는 Advisor가 별도로 수행한다.
