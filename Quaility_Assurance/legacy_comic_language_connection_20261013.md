# 기존 5편 만화 언어 연결 집중 검사

- Kanban `t_a6380677`, uimini Worker.
- 실행: app에서 `npx vitest run src/components/WebLandingPage.test.jsx -t 'localized artwork|daily artwork|legacy and daily' --maxWorkers=1`.
- 결과: **3개 통과, 11개 제외**, session `80500`. 운영 Firebase 접근/쓰기는 하지 않았다.
- 기존 5편 × 6언어에서 카드 href, 썸네일 src, 확대 뷰어 src와 해당 언어 제목을 직접 DOM으로 확인했다. 한국어는 기존 원본 URL이고 나머지는 각 언어의 현지화 PNG URL이다.
- 일일 만화의 해당 언어 이미지·제목·소개 및 마지막 편 → 첫 기존 편 → 이전 편 이동도 확인했다. 총 편수·기존 한국어 작품 연결을 유지했다.
- 5화의 현지화 PNG 5개는 내장 image_gen 출력의 실제 화면을 제작 Worker가 확인했다. 1~4화 작품은 다른 Worker 소유이므로 이 기록에서 그림 검수 완료를 주장하지 않는다. 전체 25개 이미지의 독립 검수·실제 브라우저·배포는 Advisor가 별도로 수행한다.

## Main 운영 반영 검증 — 2026-10-13

- 커밋 `12f185bc0b65c20ac682aa41c6211385402521af`를 `origin zombie_only`로 push했다. `npm run deploy:hosting:safe -- comic-dialogue-20261013`는 필수 검사 45개·build·JS 자산 57개 검사 후 preview를 live로 승격했고 exit 0이었다. Main의 집중 검사 3개도 통과했다.
- Main은 새 브라우저에서 `https://escapezombie.com/` 타이틀 → `홈페이지로` → `/landing`을 확인했다. ko/en/ja/zh-CN/vi/id 각각 목록 6개와 기존 5편의 정확한 언어별 URL, 첫 편 뷰어의 실제 이미지 decode `724×2172`를 확인했다.
- 신규 현지화 PNG 25개는 운영 URL HEAD 검사에서 모두 HTTP 200·`image/png`였다. 전체 25개 이미지·100컷의 독립 육안 검수는 별도 검수자 기록에 남아 있다.
- 인도네시아어 5화 실제 운영 뷰어도 확인했고 Main이 캡처 `C:/Users/admin/AppData/Local/Temp/comic-dialogue-id-live-20261013.png`를 직접 열어 확인했다. 작업 브라우저는 종료했고 운영 Firebase 쓰기는 0이었다. 위 운영 검증은 Main의 직접 확인 결과를 전달받아 기록했으며 Recorder가 재수행한 검증은 아니다.
