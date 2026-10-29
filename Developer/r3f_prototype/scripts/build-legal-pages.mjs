// hosting/ 아래 공개 정적 페이지를 src/lib/legalDocuments.js 정본에서 생성한다.
//
// 앱 내 문구와 공개 페이지가 갈라지지 않도록, 약관·개인정보처리방침 본문은 절대
// 여기에 복사해 두지 않는다. 문서를 고칠 때는 legalDocuments.js만 고치고
// `npm run build:legal`로 다시 생성한 뒤 생성 결과를 함께 커밋한다.
//
// 실행: node scripts/build-legal-pages.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ACCOUNT_DELETION_URL,
  CONTACT_EMAIL,
  EFFECTIVE_DATE,
  PRIVACY_TEXT,
  PRIVACY_TITLE,
  PRIVACY_URL,
  SERVICE_NAME,
  TERMS_TEXT,
  TERMS_TITLE,
} from '../src/lib/legalDocuments.js'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT_DIR, 'hosting')
const DIST_DIR = join(ROOT_DIR, 'dist')

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const STYLE = `
:root { color-scheme: light dark; }
body { margin: 0; padding: 24px 16px 64px; font-family: system-ui, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;
  line-height: 1.7; color: #1b1b1f; background: #fff; }
main { max-width: 720px; margin: 0 auto; }
h1 { font-size: 1.5rem; margin: 0 0 4px; }
h2 { font-size: 1.1rem; margin: 32px 0 8px; }
.meta { color: #6b6b76; font-size: .85rem; margin: 0 0 24px; }
.doc { white-space: pre-wrap; word-break: break-word; font-size: .95rem; }
ol, ul { padding-left: 1.25rem; }
li { margin: 6px 0; }
a { color: #1a56db; }
.callout { border-left: 4px solid #d33; background: #fff5f5; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0; }
footer { margin-top: 48px; font-size: .85rem; color: #6b6b76; }
@media (prefers-color-scheme: dark) {
  body { color: #e6e6ea; background: #16161a; }
  .meta, footer { color: #9a9aa5; }
  a { color: #8ab4f8; }
  .callout { background: #2a1c1c; border-left-color: #f26d6d; }
}
`.trim()

function page({ title, bodyHtml }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(SERVICE_NAME)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p class="meta">${escapeHtml(SERVICE_NAME)} · 시행일 ${escapeHtml(EFFECTIVE_DATE)}</p>
${bodyHtml}
<footer>문의: <a href="mailto:${escapeHtml(CONTACT_EMAIL)}">${escapeHtml(CONTACT_EMAIL)}</a></footer>
</main>
</body>
</html>
`
}

const docPage = (title, text) => page({ title, bodyHtml: `<div class="doc">${escapeHtml(text)}</div>` })

// 계정 삭제 페이지는 Google Play "계정 삭제 URL" 요건(앱 이름·삭제 방법·삭제 항목·
// 보관 항목과 기간)을 채워야 하므로 서술 구조가 다르다. 사실관계는
// src/lib/accountDeletion.js / firebaseRanking.js 의 실제 동작과 일치해야 한다.
const deleteAccountPage = page({
  title: '계정 및 데이터 삭제',
  bodyHtml: `
<p>${escapeHtml(SERVICE_NAME)}는 이용자가 언제든지 계정과 계정에 연결된 데이터를 직접 삭제할 수 있도록 제공합니다.</p>

<h2>앱에서 직접 삭제하기</h2>
<ol>
  <li>${escapeHtml(SERVICE_NAME)}를 실행하고 Google 계정으로 로그인합니다.</li>
  <li>로비 화면에서 <strong>설정</strong>을 엽니다.</li>
  <li><strong>계정 삭제</strong>를 누르고 안내에 따라 삭제를 확정합니다.</li>
</ol>
<p>삭제는 즉시 처리되며 되돌릴 수 없습니다. 삭제 후 다시 로그인하면 새 계정으로 처음부터 시작합니다.</p>

<h2>앱을 설치하지 않고 삭제 요청하기</h2>
<p>앱을 이미 삭제했거나 로그인할 수 없는 경우, 가입에 사용한 Google 계정으로
<a href="mailto:${escapeHtml(CONTACT_EMAIL)}">${escapeHtml(CONTACT_EMAIL)}</a> 에 계정 삭제를 요청해 주세요.
본인 확인 후 영업일 기준 7일 이내에 처리하고 결과를 회신합니다.</p>

<h2>삭제되는 데이터</h2>
<ul>
  <li>Google 로그인 인증 계정 자체(계정 식별자, 이메일 주소, 프로필 표시 이름, 프로필 사진 주소 포함)</li>
  <li>게임 내 닉네임과 Google 프로필 표시 이름</li>
  <li>진행 기록: 보유 골드, 누적 플레이 통계, 무기 해금·영구 강화·보스 보상 상태, 좀비 도감, 미션 진행 상태, 부정 방지 정산 기록</li>
  <li>게임 설정(언어, 진동, 효과, 캐릭터 외형·의상 등)과 마지막 플레이 스테이지·시각</li>
  <li>이용약관·개인정보처리방침 동의 기록</li>
  <li>접속 기록(이메일 주소, 표시 이름, 최초·최근 접속 시각)</li>
  <li>랭킹 기록: 현재 일간·주간 랭킹과 기간 없는 누적 랭킹의 본인 기록</li>
</ul>

<div class="callout">
<strong>앱 내 삭제로 지워지지 않는 데이터.</strong>
<ul>
  <li>이미 마감된 과거 기간의 일간·주간 랭킹 기록</li>
  <li>게스트(로그인하지 않은 상태)로 플레이했을 때의 게스트 닉네임·랭킹 기록·접속 기록 — 게스트에게는 앱 내 삭제 기능이 없습니다</li>
  <li>웹사이트 게시판에 쓴 글·댓글 — 계정과 연결되지 않습니다</li>
</ul>
이 데이터의 삭제를 원하시면 <a href="mailto:${escapeHtml(CONTACT_EMAIL)}">${escapeHtml(CONTACT_EMAIL)}</a> 로
닉네임과 대략적인 플레이·작성 일시를 알려 주세요. 확인 후 수동으로 제거해 드립니다.
</div>

<h2>보관되는 데이터와 기간</h2>
<p>앱 내 삭제를 하면 위 "삭제되는 데이터"는 즉시 삭제됩니다. 이 게임에는 정해진 기간이 지나면 자동으로 삭제하는 기능이 없으므로,
위 예외 데이터는 운영자가 삭제할 때까지 남습니다.
이용 통계(Google Analytics)는 계정과 연결되지 않아 계정 삭제로 삭제되지 않으며, 사용자 단위 통계는 Google Analytics에 설정된 보존 기간이 지나면 Google이 삭제합니다.
법령에 따라 보존이 필요한 기록이 있는 경우에는 해당 법령이 정한 기간 동안 다른 데이터와 분리해 보관한 뒤 파기합니다.</p>

<p>개인정보 처리에 대한 자세한 내용은 <a href="${escapeHtml(PRIVACY_URL)}">${escapeHtml(PRIVACY_TITLE)}</a>을 참고해 주세요.</p>
`.trim(),
})

const PAGES = [
  ['delete-account.html', deleteAccountPage],
  ['privacy.html', docPage(PRIVACY_TITLE, PRIVACY_TEXT)],
  ['terms.html', docPage(TERMS_TITLE, TERMS_TEXT)],
]

// ponytail: 검증은 이 자체 점검 하나로 끝낸다. 공개 페이지에서 가장 비싼 실수
// 세 가지(이스케이프 누락, 플레이스홀더 잔존, 등록 URL과 파일명 불일치)만 막는다.
function selfCheck() {
  if (escapeHtml('<a href="x">&') !== '&lt;a href=&quot;x&quot;&gt;&amp;') {
    throw new Error('escapeHtml is broken')
  }
  if (!CONTACT_EMAIL.includes('@')) {
    throw new Error('CONTACT_EMAIL이 실제 주소로 채워지지 않았습니다')
  }
  for (const [file, html] of PAGES) {
    if (html.includes('[문의')) throw new Error(`${file}: 문의처 플레이스홀더가 남아 있습니다`)
    if (!html.includes(escapeHtml(SERVICE_NAME))) throw new Error(`${file}: 앱 이름 누락`)
  }
  // cleanUrls가 /delete-account → delete-account.html 로 매핑한다. Play에 등록하는
  // URL의 경로와 생성 파일명이 어긋나면 심사 시 404가 뜬다.
  for (const url of [ACCOUNT_DELETION_URL, PRIVACY_URL]) {
    const expected = `${url.split('/').pop()}.html`
    if (!PAGES.some(([file]) => file === expected)) {
      throw new Error(`${url} 에 대응하는 ${expected} 를 생성하지 않습니다`)
    }
  }
}

selfCheck()
const outDirs = [OUT_DIR]
if (existsSync(DIST_DIR)) outDirs.push(DIST_DIR)
for (const outDir of outDirs) {
  mkdirSync(outDir, { recursive: true })
  for (const [file, html] of PAGES) {
    writeFileSync(join(outDir, file), html, 'utf8')
    console.log(`wrote ${outDir === OUT_DIR ? 'hosting' : 'dist'}/${file}`)
  }
}
