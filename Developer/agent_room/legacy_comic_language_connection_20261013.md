# 기존 5편 만화 이미지 언어 연결

- Kanban `t_a6380677`, uimini Worker. mandatory receipt `dafec73bdc481fa0df62de6a6cdd149b101634b5ef9c7775fa58c8d289392023`.
- `WebLandingPage.jsx`에서 기존 5편에 홈페이지 6언어별 `images` 필드를 만들었다. 한국어는 기존 `/web-comics/v3/` URL, 나머지는 `/web-comics/localized-v3/<language>/`의 같은 파일명이다.
- 기존 일일 만화 언어 선택 로직이 이 필드를 그대로 소비한다. 카드 링크·썸네일·확대 뷰어가 모두 선택한 언어의 실제 이미지로 바뀐다. 제목·소개는 기존 번역을 유지한다.
- 기존 일일 만화 항목을 뒤에 이어 붙였다. 일일 자산·기존 한국어 원본·타이틀·계정·Firebase·뷰어 배율·레이아웃·예약·훅은 수정하지 않았다.
- 집중 검사에서 기존 5편 × 6언어의 실제 DOM 카드/뷰어 연결과 일일 만화·이전/다음 이동을 확인했다. Vitest 3개 통과, 11개 제외. 그림 자체의 독립 검수와 실제 브라우저·live 배포는 Advisor가 수행한다.
