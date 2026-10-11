# 공식 홈페이지 6개 언어 및 우상단 선택기 작업 기록

## 범위
- 대상: `/landing` 공식 홈페이지 `WebLandingPage`.
- 언어: 한국어, English, 日本語, 简体中文, Tiếng Việt, Bahasa Indonesia.
- 수정 파일:
  - `Developer/r3f_prototype/src/components/webLandingCopy.js`
  - `Developer/r3f_prototype/src/components/WebLandingPage.jsx`
  - `Developer/r3f_prototype/src/components/WebLandingPage.test.jsx`

## 구현 내용
- `LANDING_LANGUAGES`를 6개 언어로 확장했다.
- 기존 한국어/영어/일본어/베트남어 카피 구조를 유지하고, 동일 키 구조로 중국어 간체(`zh-CN`)와 인도네시아어(`id`) 전체 홈페이지 카피를 추가했다.
- 내비게이션, 히어로, 플레이 방법, 생존 포인트, 미디어 컨트롤, 만화 설명, 음악 상태, 영상 placeholder, 뉴스, footer, 접근성 aria/label 텍스트를 copy-driven 상태로 유지했다.
- 언어 선택기는 기존 nav 우상단 영역의 `<select>`를 유지하며, 44px 이상 터치 타깃과 접근성 label을 유지했다.
- 다국어 제목 줄바꿈 CSS 대상에 `zh-CN`, `id`를 추가했다.
- 만화 회차 배지는 locale copy의 `episodeSuffix`를 사용하도록 유지했다.

## 의도적으로 변경하지 않은 것
- `/` 루트 게임 타이틀, `/game`, `/landing` 라우트 구조는 변경하지 않았다.
- 타이틀/3D/아트/오디오/이미지 자산은 변경하지 않았다.
- `localStorage`, 인증, Firebase, 새 의존성은 추가하지 않았다.
- 기존 raster 만화 이미지 안에 이미 구워진 글자는 이미지 자산 자체의 일부라 이번 copy 작업으로 변경하지 않았다. 이번 작업은 주변 UI/설명/접근성 텍스트 번역만 다룬다.

## 검증
- 집중 테스트 대상: `Developer/r3f_prototype/src/components/WebLandingPage.test.jsx`
- 추가 검증: 6개 언어 선택 목록, locale별 주요 렌더 텍스트/aria label, copy object 키 구조 일치, collapsed media panel별 카피 렌더 확인.
