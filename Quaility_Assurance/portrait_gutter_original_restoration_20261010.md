# 세로형 게임·좌우 일러스트 원본 복원 검증 — 2026-10-10

## 원본 근거

- 새 디자인이 아니라 기존 `ReadyGameApp`의 배경 연결과 9:16 프레임만 복원했다. 기존 `/landing` 및 인증·게임 로직은 유지한다.
- 실제 기존 Hosting version: `e48fdbce53d219bc`, preview `https://escape-zombie-school--t-c6a7dc7d-e60g12dk.web.app`.
- 원본 `/assets/ReadyGameApp-CyqWWlwl.js` SHA-256: `ab0147e7ac91fd64b62308c400302105a85d85b244a123a81578692977742b76`.
- 원본 `/assets/webBackgroundAssets-C_OkLwiC.js` SHA-256: `60d6dbdf3f85571a116932bdec3c719ffc15756e1c1a8e52515bb1dc93ab25f1`.
- 원본과 복원 diff 대조: 배경 `cover`, `center center`, `no-repeat`; 프레임 `width: min(100vw, 720px, 56.25dvh)`, `aspectRatio: 9 / 16`, `height: auto`, `maxHeight: min(100vh, 100dvh, 1280px)` 및 기존 터치·overflow 속성 일치.
- 기존 CDN 일러스트 URL 4개를 그대로 사용했다. 그림 파일을 제작하거나 교체하지 않았다.

## 검증 결과

- Advisor 및 브라우저 QA 전달 결과: 데스크톱 viewport `1264×569`에서 프레임 `320.0625×569`, 모바일 `390×844`에서 프레임 `390×693.328125` 확인.
- 실제 로컬 브라우저에서 `/` 타이틀 → `홈페이지로` → `/landing` 이동 확인.
- 요청 범위 focused tests: 17개 통과(Advisor/Worker 실행 결과).
- Release Worker 직접 실행: `node scripts/assert-firebase-release-env.mjs` PASS, `npm.cmd run build` 종료 코드 0.
- 빌드의 기존 branch/Firebase/B02/dialogue/Studio 사전 검사 통과, 프로덕션 번들 생성 성공, B02 산출물 검사 통과, Hosting JavaScript 자산 56개 검사 통과.
- 빌드 로그: `C:/Users/admin/AppData/Local/Temp/escape-portrait-build-20261010.log`.
- 이 기록 시점에는 preview/live 배포를 실행하지 않았다. Firebase 사용자 데이터·규칙·인증에 쓰기 작업 없음.
