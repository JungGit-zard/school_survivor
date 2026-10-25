# 웹 호스팅 정본: Cloudflare Pages (2026-10-25)

작성: backendmini. 계기: Firebase Hosting 무료 월 전송량 10GB 초과로 HTTP 509, 서비스 중단.
Terry 승인: "무료 CDN으로 전환하고 재개한다", "필요 절감법 모두 적용", "전환해".

## 결론

- **웹 정적 호스팅의 정본은 Cloudflare Pages다.** Firebase Hosting(`firebase.json` hosting, `deploy:hosting:safe`,
  `promote-hosting-preview.mjs`)은 롤백용으로만 남긴다. 새 웹 릴리스를 Firebase Hosting에 올리지 않는다.
- Firebase에는 Auth(Google 로그인), RTDB 랭킹, Functions(DB 트리거)만 남는다.
  Google 로그인 `authDomain`은 그대로 `escape-zombie-school.firebaseapp.com` — `/__/auth/handler`는 Hosting 509와 무관하게 200.

## 프로젝트 분리 (절대 규칙: 만화·마케팅 이미지는 게임 서비스와 일절 무관)

| | A 게임 | B 미디어 |
|---|---|---|
| Pages 프로젝트 | `escape-zombie-school` | `escape-zombie-media` |
| 도메인 | `escapezombie.com`, `www.escapezombie.com` | `media.escapezombie.com` |
| 배포 소스 | `Developer/r3f_prototype/dist` + `hosting/{privacy,terms,delete-account}.html` | `Developer/r3f_prototype/media-site/site` |
| 헤더/리다이렉트 | `public/_headers`, `public/_redirects` (빌드 시 dist로 복사) | `media-site/site/_headers` |
| 내용 | 게임, 랜딩, legal, `.well-known/assetlinks.json`(TWA) | 만화 뷰어, X 카드(`share/x`), 옛 만화 PNG, `web-comics`, 블로그 이미지 |

- A의 `/share/*`, `/comics/*`, `/web-comics/*`, `/blog/*`, `/x-website-cards-manifest.json`은 B로 **301**.
  이미 X에 게시된 `escapezombie.com/share/x/...` 링크가 이 경로로 보존된다.
- B의 카드 HTML은 `og:image`/`og:url`을 `media.escapezombie.com`으로 가리키고, 클릭 시 `escapezombie.com/`으로 이동한다.
- 게임 번들에서 B를 가리키는 것은 `src/lib/mediaSite.js`의 텍스트 링크 상수 하나뿐(첫 로드 요청 0건).
- `scripts/deploy-cloudflare.mjs game`은 금지 항목(comics/share/blog/web-comics/web-landing/web-side-gutters/QA 페이지)이
  스테이징에 있으면 배포를 거부한다.

## 캐시

- A: `/assets/*` 1년 immutable, `/sfx/*` 1일, `/`·`/index.html` no-cache, `/game*` no-cache, assetlinks 1시간.
- B: 옛 만화 PNG·`web-comics` 1년 immutable, 뷰어 WebP 7일, `share/x` 1일, `index.html` no-cache.
- Cloudflare Pages는 전송량 과금/한도가 없다(무료: 파일 20,000개, 파일당 25MiB, 월 500회 빌드 — 우리는 로컬 빌드 후 업로드라 빌드 한도 무관).

## 배포

```
cd Developer/r3f_prototype
npm run deploy:cf          # build + build:legal + 게임 A 배포
npm run deploy:cf:game     # 이미 빌드된 dist로 A만 배포
npm run deploy:cf:media    # 미디어 B 배포
node scripts/deploy-cloudflare.mjs game --dry-run   # 스테이징 검사만
```

- 인증: `npx wrangler login` (OAuth). 토큰 위치: `~/.wrangler/config/default.toml`
  (`%APPDATA%\xdg.config\.wrangler`가 아니라 `~/.wrangler`가 존재하면 그쪽을 우선 읽는다).
- 사용자 환경변수 `NPM_CONFIG_CACHE=D:\DevCache\npm`(사라진 드라이브)이면 npx가 깨진다. 스크립트가 자동 우회한다.
  수동 실행 시 `NPM_CONFIG_CACHE=%LOCALAPPDATA%\npm-cache`를 앞에 붙인다.

## DNS (zone escapezombie.com, Cloudflare)

| 이름 | 전 | 후 |
|---|---|---|
| `escapezombie.com` | A `199.36.158.100` (Firebase, DNS only) | CNAME `escape-zombie-school.pages.dev` (proxied) |
| `www` | 없음 | CNAME `escape-zombie-school.pages.dev` (proxied) |
| `media` | 없음 | CNAME `escape-zombie-media.pages.dev` (proxied) |
| `music` | CNAME `public.r2.dev` (R2, proxied) | 변경 없음 |
| TXT apex | `hosting-site=escape-zombie-school` | 롤백 대비 유지 |

롤백: apex CNAME을 A `199.36.158.100`(DNS only)로 되돌리고 www/media CNAME 제거. 단 Firebase 쿼터가 리셋되기 전에는 509가 계속된다.

## Firebase Auth 승인 도메인

`escapezombie.com`(기존) + `www.escapezombie.com`, `escape-zombie-school.pages.dev` 추가. 미디어 B는 로그인이 없으므로 추가하지 않았다.

## 미해결

- `escape-zombie-school-assets.web.app`(사이드 거터·랜딩 원본·web-comics v1/v2)은 509 상태로 남는다. 게임은 이제 이 사이트를 참조하지 않는다.
  외부 글(티스토리 등)에 이 주소를 쓴 이미지는 Firebase 쪽이라 리다이렉트 불가 — 해당 글을 `media.escapezombie.com` 경로로 수정해야 한다.
  사이드 거터 v1/v2·랜딩 원본 PNG·web-comics v1 원본은 로컬에서 찾지 못했다(web-comics v2는 `media-site/originals/web-comics-v2`).
