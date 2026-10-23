"""Stage4 finished-document packaging only. Python stdlib; no network or browser."""
from pathlib import Path
from html import escape, unescape
from html.parser import HTMLParser
from urllib.parse import quote, unquote
import re
import hashlib
import json

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'Planner/stage4_advancement_20261023.html'
RECEIPT = Path(__file__).with_name('receipt.md')
FILES = [
    ('index', 'Planner/stage4_document_index_20261022.md', '문서 안내'),
    ('plan', 'Planner/stage4_advancement_plan_20261022.md', '종합 기획'),
    ('graphics', 'Graphic_designer/stage4_graphics_and_zombies_20261022.md', '그래픽 · 신규 좀비'),
    ('audio', 'Planner/stage4_audio_feedback_plan_20261022.md', '오디오 · 피드백'),
]
raw = {key: (ROOT / path).read_bytes() for key, path, _ in FILES}
texts = {key: data.decode('utf-8-sig') for key, data in raw.items()}
sha = lambda data: hashlib.sha256(data).hexdigest()
headings = {}
for key, _, _ in FILES:
    headings[key] = [(i, len(m[1]), m[2], f'{key}-h-{i}') for i, line in enumerate(texts[key].splitlines(), 1) if (m := re.match(r'^(#{1,6})\s+(.+)$', line))]
by_name = {Path(path).name: key for key, path, _ in FILES}
link_notes = []

def href_fix(href, key):
    path, _, fragment = href.partition('#')
    name = Path(path).name
    if name in by_name:
        dest = by_name[name]
        return '#' + dest
    if not path:
        return '#' + key
    if re.match(r'^[a-zA-Z]+:', path):
        raise AssertionError('Unexpected remote/absolute Markdown link: ' + href)
    # Graphics document has root-relative-looking citations; never resolve them under Planner/Graphic_designer.
    if path.startswith(('Planner/', 'Graphic_designer/', 'Developer/')):
        resolved = ROOT / path
    else:
        origin = next(p for k, p, _ in FILES if k == key)
        resolved = (ROOT / origin).parent / path
    import os
    relative = os.path.relpath(resolved, OUT.parent).replace('\\', '/')
    if fragment:
        link_notes.append(href)
    return quote(relative, safe='/._-')

def inline(s, key):
    tokens = []
    def stash(value):
        tokens.append(value)
        return f'\x00{len(tokens)-1}\x00'
    def code(m):
        value = m[1]
        name = Path(value).name
        result = '<code>' + escape(value) + '</code>'
        if name in by_name:
            result = '<a href="#' + by_name[name] + '">' + result + '</a>'
        return stash(result)
    s = re.sub(r'`([^`]+)`', code, s)
    def link(m):
        target = href_fix(m[2], key)
        citation = ''
        if '#' in m[2] and not target.startswith('#'):
            citation = ' <small class="citation">(원문 줄 인용: ' + escape(m[2].split('#', 1)[1]) + ' · 파일 열기)</small>'
        return stash('<a href="' + escape(target, quote=True) + '">' + escape(m[1]) + '</a>' + citation)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, s)
    s = escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\x00(\d+)\x00', lambda m: tokens[int(m[1])], s)
    return s

def render(key):
    lines = texts[key].splitlines()
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('```'):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.append(lines[i]); i += 1
            out.append('<pre><code>' + escape('\n'.join(code)) + '</code></pre>')
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = lines[i].strip().strip('|').split('|')
                if not all(re.fullmatch(r'\s*:?-+:?\s*', cell) for cell in cells):
                    tag = 'th' if not rows else 'td'
                    content = ''.join('<' + tag + (' scope="col"' if tag == 'th' else '') + '>' + inline(cell.strip(), key) + '</' + tag + '>' for cell in cells)
                    rows.append('<tr>' + content + '</tr>')
                i += 1
            out.append('<div class="table-wrap" tabindex="0" role="region" aria-label="가로 스크롤 가능한 원문 표"><table><thead>' + rows[0] + '</thead><tbody>' + ''.join(rows[1:]) + '</tbody></table></div>')
            continue
        elif m := re.match(r'^(#{1,6})\s+(.+)$', line):
            level = min(len(m[1]) + 1, 6)
            out.append(f'<h{level} id="{key}-h-{i+1}">' + inline(m[2], key) + f'</h{level}>')
        elif re.match(r'^\s*([-*]|\d+\.)\s+', line):
            ordered = bool(re.match(r'^\s*\d+\.', line))
            tag = 'ol' if ordered else 'ul'
            items = []
            while i < len(lines) and re.match(r'^\s*(' + (r'\d+\.' if ordered else r'[-*]') + r')\s+', lines[i]):
                value = re.sub(r'^\s*([-*]|\d+\.)\s+', '', lines[i])
                items.append('<li>' + inline(value, key) + '</li>'); i += 1
            out.append('<' + tag + '>' + ''.join(items) + '</' + tag + '>')
            continue
        elif line.strip() == '---':
            out.append('<hr>')
        elif line.strip():
            out.append('<p>' + inline(line, key) + '</p>')
        i += 1
    return '\n'.join(out)

CSS = '''
:root{--paper:#f5f1e8;--surface:#fffdf8;--ink:#252d2a;--muted:#626a62;--line:#d7d4c8;--accent:#355f58;--proposal:#805325}
*{box-sizing:border-box}html{scroll-padding-top:92px}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.85 "Malgun Gothic","Apple SD Gothic Neo",sans-serif;word-break:keep-all;overflow-wrap:anywhere}a{color:var(--accent);text-underline-offset:4px}a:hover{color:#813d24}a:focus-visible,summary:focus-visible,.table-wrap:focus-visible{outline:3px solid #805325;outline-offset:4px}.skip{position:absolute;top:-100px}.skip:focus{top:10px;background:white;padding:12px;z-index:10}.topbar{position:sticky;top:0;z-index:5;background:#f5f1e8f5;border-bottom:1px solid var(--line);padding:10px 28px;display:flex;justify-content:space-between;gap:16px;align-items:center}.topbar a{display:inline-block;padding:5px 10px;min-height:44px}.brand{font-weight:800;letter-spacing:.08em;font-size:13px}.layout{max-width:1580px;margin:auto;display:grid;grid-template-columns:275px minmax(0,1fr);gap:48px;padding:38px 32px 100px}aside{position:sticky;top:90px;max-height:calc(100vh - 115px);overflow:auto;align-self:start;padding-right:14px;font-size:13px}aside a{display:block;padding:6px 0;line-height:1.6}aside details{border-bottom:1px solid var(--line);padding:12px 0}summary{cursor:pointer;min-height:44px;padding:8px 0;font-weight:700}aside .sub{padding-left:13px;font-size:12px}main{min-width:0;max-width:1120px}.eyebrow{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);font-weight:800}h1{font-size:clamp(34px,5vw,62px);line-height:1.2;letter-spacing:-.045em;margin:20px 0 26px}h2{font-size:29px;line-height:1.5;letter-spacing:-.03em;margin-top:55px}h3{font-size:23px;line-height:1.5;margin:42px 0 18px}h4{font-size:19px;margin:32px 0 14px}h5,h6{font-size:17px}p{margin:14px 0}li{margin:8px 0}ul,ol{padding-left:25px}.lead{font-size:20px;max-width:820px}.note{padding:23px 28px;background:#e9e8dc;border:1px solid var(--line);margin:28px 0}.labels{display:flex;gap:9px;flex-wrap:wrap}.badge{font-size:12px;font-weight:800;letter-spacing:.03em;border:1px solid #bebba9;padding:4px 10px;display:inline-block;color:var(--accent);background:#edf0e7}.badge.proposal{color:var(--proposal);background:#f6ecdc;border-color:#d7b992}.meta{color:var(--muted);font-size:13px}.overview{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin:30px 0}.overview>div{border-top:2px solid var(--ink);padding-top:14px}.overview h3{margin:0;font-size:19px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:18px}.enemy{padding:24px;background:var(--surface);border:1px solid var(--line)}.enemy h3{margin:15px 0 8px;font-size:21px}.enemy a{display:inline-block;min-height:44px;padding-top:8px}.swatches{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.swatch{padding:16px;background:var(--surface);border:1px solid var(--line);font-size:13px}.paint{height:52px;margin:10px 0;border:1px solid #0002;display:flex}.paint span{flex:1}.priority{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.priority>div{border-top:3px solid var(--accent);padding:18px 0}.priority h3{margin:0}.doc{margin-top:65px;padding-top:32px;border-top:2px solid var(--ink)}.doc-head{padding-bottom:20px;border-bottom:1px solid var(--line)}.doc-head h2{margin:8px 0}.table-wrap{overflow-x:auto;margin:22px 0;background:var(--surface);border:1px solid var(--line)}table{border-collapse:collapse;width:100%;min-width:700px;text-align:left;font-size:14px}th{background:#e7e9df;font-weight:800}td,th{padding:13px 16px;border-bottom:1px solid var(--line);vertical-align:top}tr:last-child td{border-bottom:0}tbody tr:nth-child(even){background:#f8f6ef}code,kbd{font-family:Consolas,"Courier New",monospace;font-size:.9em;background:#eae8df;padding:2px 4px;border-radius:3px;word-break:break-word}pre{white-space:pre;overflow:auto;padding:22px;background:#29332e;color:#f2efe4;line-height:1.75;font-size:13px}pre code{background:none;padding:0;color:inherit;word-break:normal}.citation{font-size:11px;color:var(--muted)}.raw{margin-top:35px;border:1px solid var(--line);padding:15px}.raw pre{white-space:pre-wrap;max-height:560px}footer{border-top:1px solid var(--line);margin-top:60px;padding-top:25px;font-size:13px;color:var(--muted)}
@media(min-width:1200px){.doc p,.doc li{max-width:96ch}}@media(max-width:1000px){.layout{grid-template-columns:220px minmax(0,1fr);gap:24px;padding:25px 20px}.priority{grid-template-columns:1fr}}@media(max-width:760px){.layout{display:block;padding:24px 18px}aside{position:relative;top:0;max-height:360px;margin-bottom:35px;padding:15px;border:1px solid var(--line)}.topbar{padding:8px 14px}.topbar .brand{display:none}.overview,.cards{grid-template-columns:1fr}body{font-size:15px}.lead{font-size:18px}h2{font-size:25px}table{min-width:640px}.note{padding:20px}}
@media print{@page{margin:15mm}body{background:white;color:black;font-size:12pt;line-height:1.65}.topbar,aside,.skip,.raw{display:none}.layout{display:block;max-width:none;padding:0}main{max-width:none}.doc{break-before:page}.table-wrap{overflow:visible;border:0}table{min-width:0;font-size:12pt;table-layout:fixed}td,th{padding:6pt;overflow-wrap:anywhere}.cards,.overview,.priority{display:block}.enemy,.swatch{break-inside:avoid}.swatches{grid-template-columns:repeat(2,1fr)}h1{font-size:32pt}h2,h3,h4{break-after:avoid}pre{white-space:pre-wrap;background:#eee;color:black;font-size:12pt}a{color:inherit}header,section{box-shadow:none}.paint{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
'''

def find_heading(key, prefix):
    return next(h[3] for h in headings[key] if h[2].startswith(prefix))

nav = '<a href="#overview">편집 안내</a><a href="#priorities">P0 / P1 / P2</a><a href="#enemies">신규 좀비 제안</a><a href="#palette">제안 팔레트</a>'
for key, _, title in FILES:
    nav += '<details open><summary><a href="#' + key + '">' + title + '</a></summary>'
    nav += ''.join('<a class="' + ('sub' if level >= 3 else '') + '" href="#' + hid + '">' + inline(text, key) + '</a>' for _, level, text, hid in headings[key])
    nav += '</details>'

enemies = [
    ('4.1 ', '급식 배식원', 'C4_SERVE', 'P1 권장', '낮은 위생모 · 어두운 앞치마 · 수평 식판', '준비 자세를 읽고 옆으로 빠지는 근접 역할. 기존 요청 일부를 대체하는 우선 후보.'),
    ('4.2 ', '식판 운반원', 'C4_TRAY', 'P2 선택', '비대칭 어깨 식판 묶음 · 넓은 발', '방향을 고정한 짧은 직진과 회복의 빈틈. 방패 면역·장비 파괴 시스템은 제외.'),
    ('4.3 ', '국자 투척수', 'C4_LADLE', 'P2 선택', '긴 국자 · 작은 통 · 낮은 두건', '눈에 보이는 단발 음식 투사체. 지속 장판·느려짐·별도 무제한 투사체 풀은 제외.'),
    ('4.4 ', '청소 당번', 'C4_MOP', 'P2 선택', '긴 걸레 · 노란 장갑 · 작은 양동이', '짧은 정면 쓸기. 잔여 얼룩은 무해하며 둔화·미끄러짐·추가 충돌체는 제외.'),
]
cards = ''.join('<article class="enemy"><span class="badge proposal">PROPOSAL · ' + priority + '</span><h3>' + name + '</h3><code>' + alias + '</code><p><strong>' + silhouette + '</strong></p><p>' + description + '</p><a href="#' + find_heading('graphics', prefix) + '">외형 · 수치 후보 · 동작 · 수용 기준 전체 읽기 →</a></article>' for prefix, name, alias, priority, silhouette, description in enemies)
swatches = []
for line in texts['graphics'].splitlines():
    if line.startswith('|') and re.search(r'#[A-Fa-f0-9]{6}', line):
        cells = line.strip('|').split('|')
        colors = re.findall(r'#[A-Fa-f0-9]{6}', cells[1])
        swatches.append('<div class="swatch"><strong>' + escape(cells[0].strip()) + '</strong><div class="paint" aria-hidden="true">' + ''.join('<span style="background:' + color + '"></span>' for color in colors) + '</div>' + ' / '.join('<code>' + color + '</code>' for color in colors) + '<p>' + inline(cells[2].strip(), 'graphics') + '</p></div>')

body = '''<section id="overview"><p class="eyebrow">Escape! zombie school / Editorial document collection</p><h1>급식실 대탈출<br>Stage 4 고도화 문서집</h1><div class="labels"><span class="badge">원문 작성 2026-10-22</span><span class="badge">편집 2026-10-23</span><span class="badge proposal">DOCUMENT ONLY · 승인 전 제안 포함</span></div><p class="lead">가마솥의 주기를 읽고, 사선을 끊고, 빈 방향을 선택하는 전투. 완성된 종합 기획·그래픽 및 신규 좀비·오디오 피드백을 하나의 읽기 흐름으로 묶었습니다.</p><div class="note"><strong>문서 편집 완료 ≠ 게임 구현 완료</strong><p>이 HTML은 기존 완성 문서를 제시하는 오프라인 열람본입니다. 게임 코드·모델·자산·Firebase·배포·실플레이 검증을 수행하거나 완료했다고 주장하지 않습니다. 원문의 제안 수치는 사용자 확정값을 대체하지 않습니다.</p></div><div class="overview"><div><h3>기존 / 확정 / 조사 근거</h3><p>SOURCE DEFAULT는 조사한 소스 기본값입니다. 사용자 확정 규칙, 과거 고정판, 작업본 W, 로컬 원격 추적 참조 R, 미조회 운영/Firebase를 구분해 읽습니다.</p></div><div><h3>제안 / 미실행 / 후속 승인</h3><p>PROPOSAL과 P0/P1/P2는 후속 승인·검증 대상입니다. 위험 가설은 화면 관측 사실이 아니며, 체크리스트는 실행 결과가 아닙니다.</p></div></div><p class="meta">읽는 법: 좌측 전체 목차 또는 상단 바로가기를 사용하세요. 본문 검색은 브라우저 <kbd>Ctrl</kbd> + <kbd>F</kbd> / <kbd>⌘</kbd> + <kbd>F</kbd>, 인쇄는 <kbd>Ctrl</kbd> + <kbd>P</kbd>입니다. 표는 좁은 화면에서 좌우 스크롤할 수 있습니다. JavaScript 없이 모두 열람 가능합니다.</p></section>'''
body += '<section id="priorities"><h2>우선순위로 읽기</h2><p>아래는 원문을 찾기 위한 편집 안내이며, 새 일정·구현 승인·새 의존성을 추가하지 않습니다.</p><div class="priority">'
for p, desc, links in [
    ('P0', '진행도 계약·시간과 국물 순서·실효 통로부터 확인', [('plan', '11.', '종합 실행 체크리스트'), ('plan', '12.', '미실행 수용 시나리오')]),
    ('P1', '국소 공정성 개선과 급식 배식원 우선 후보', [('plan', '승인 후', 'B04 최소 개선 후보'), ('graphics', '4.1 ', '급식 배식원 상세')]),
    ('P2', '필요할 때만 공유 풀 검토·선택 좀비 후보', [('graphics', '4.2 ', '식판 운반원'), ('graphics', '4.3 ', '국자 투척수'), ('graphics', '4.4 ', '청소 당번')]),
]:
    body += '<div id="priority-' + p.lower() + '"><h3>' + p + '</h3><span class="badge proposal">후속 승인 대상</span><p>' + desc + '</p>' + ''.join('<p><a href="#' + find_heading(k, prefix) + '">' + label + ' →</a></p>' for k, prefix, label in links) + '</div>'
body += '</div></section><section id="enemies"><h2>신규 좀비 — 네 가지 제안</h2><p>모두 <strong>PROPOSAL · 미등록 콘셉트</strong>입니다. P1은 배식원 우선 후보, P2 세 종류는 독립 선택지이며 동시 투입 계획이 아닙니다. 가칭은 실제 enemy ID·DB 키·Studio item ID가 아닙니다.</p><div class="cards">' + cards + '</div></section>'
body += '<section id="palette"><h2>제안 팔레트 · 실제 HEX 견본</h2><span class="badge proposal">PROPOSAL · Studio 덮어쓰기용 아님</span><p>그래픽 상세안 §3.1의 역할·HEX·사용 규칙을 그대로 옮긴 색상 견본입니다. 기존 색의 유지 제안도 포함되며, 적용 완료 색상표가 아닙니다.</p><div class="swatches">' + ''.join(swatches) + '</div><p><a href="#' + find_heading('graphics', '3.1 ') + '">팔레트·재질 원문으로 →</a></p></section>'
for key, path, title in FILES:
    relative = href_fix(path, key)
    body += '<section class="doc" id="' + key + '"><header class="doc-head"><p class="eyebrow">' + ('INDEX' if key == 'index' else 'FULL DOCUMENT') + '</p><h2>' + title + ' · 전체 원문</h2><p class="meta">출처: <a href="' + relative + '">' + escape(path) + '</a><br>입력 SHA-256: <code>' + sha(raw[key]) + '</code></p></header>' + render(key)
    body += '<details class="raw"><summary>원문 Markdown 대조 보기 · ' + title + '</summary><p class="meta">아래 텍스트는 서식 기호·원래 인용 경로까지 보존한 원문입니다. 본문 링크는 이 열람본에 맞게 변환했으며, 아래 원문 경로는 문자 그대로 제시합니다.</p><pre id="raw-' + key + '">' + escape(texts[key]) + '</pre></details></section>'
body += '<footer><p>편집일 2026-10-23 · 기존 완성 문서만 수록 · 문서 패키징 madangsue</p><p>본문의 문서 간 링크는 이 페이지 내부로 연결합니다. 소스 파일 인용은 Planner 기준 상대 경로로 연결하며, 원문 줄 번호는 인용 라벨로만 보존합니다. 로컬 파일 열기는 브라우저/운영체제 정책에 따라 제한될 수 있습니다. 원격 추적 참조의 줄 인용은 원문의 조사 기록이지 현재 작업본의 동일성 보증이 아닙니다.</p><a href="#overview">처음으로 ↑</a></footer>'
html = '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>Stage 4 급식실 대탈출 — 고도화 문서집 · 2026-10-23</title><style>' + CSS + '</style></head><body><a class="skip" href="#overview">본문으로 건너뛰기</a><header class="topbar"><span class="brand">STAGE 04 / DOCUMENT COLLECTION</span><nav aria-label="빠른 이동"><a href="#plan">종합</a><a href="#graphics">그래픽</a><a href="#audio">오디오</a><a href="#priority-p0">P0</a><a href="#priority-p1">P1</a><a href="#priority-p2">P2</a></nav></header><div class="layout"><aside aria-label="전체 제목 목차"><p class="eyebrow">CONTENTS / 전체 목차</p>' + nav + '</aside><main>' + body + '</main></div></body></html>\n'

class Audit(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids=[]; self.links=[]; self.stack=[]; self.errors=[]; self.capture=None; self.originals={}; self.tags=[]; self.attrs=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); self.tags.append(tag); self.attrs.append((tag,a))
        if 'id' in a: self.ids.append(a['id'])
        if 'href' in a: self.links.append(a['href'])
        if tag=='pre' and a.get('id','').startswith('raw-'):
            self.capture=a['id'][4:]; self.originals[self.capture]=''
        if tag not in {'meta','br','hr','input','link','img','wbr','source','area','base','embed','param','track','col'}: self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag=='pre': self.capture=None
        if not self.stack or self.stack[-1]!=tag: self.errors.append('unbalanced '+tag)
        else: self.stack.pop()
    def handle_data(self, data):
        if self.capture: self.originals[self.capture]+=data

audit=Audit(); audit.feed(html)
assert not audit.errors and not audit.stack, (audit.errors, audit.stack)
assert len(audit.ids)==len(set(audit.ids)), 'Duplicate IDs'
missing=[h for h in audit.links if h.startswith('#') and h[1:] not in audit.ids]
assert not missing, missing
assert all(audit.originals[key]==text for key,text in texts.items()), 'Original content mismatch'
assert not set(audit.tags)&{'script','link','iframe','img','audio','video','object','embed','form','base'}, 'Unexpected active/resource tag'
assert not re.search(r'@import|url\s*\(|localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest', CSS), 'Unexpected dependency'
assert all(not re.match(r'^(?:https?:|//|javascript:|data:)', h, re.I) for h in audit.links), 'External or active hyperlink'
assert not re.search(r'AIza[0-9A-Za-z_-]{30,}|-----BEGIN .*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{30,}', html), 'Credential-shaped literal'
local_targets=[]
for h in audit.links:
    if not h.startswith('#'):
        assert '#' not in h, 'Fake line fragment retained'
        target=(OUT.parent / unquote(h)).resolve()
        assert target.is_relative_to(ROOT), 'Link escapes repository'
        local_targets.append((h,target.exists()))
assert all(ok for _,ok in local_targets), [h for h,ok in local_targets if not ok]
for key,path,_ in FILES:
    assert (ROOT/path).read_bytes()==raw[key], 'Input modified during packaging'
OUT.write_text(html, encoding='utf-8', newline='\n')
# Reparse the actual on-disk output, not only the in-memory construction.
check=Audit(); check.feed(OUT.read_text(encoding='utf-8'))
assert not check.errors and not check.stack and check.originals==texts
result={'input_files':len(FILES),'full_detail_documents':3,'headings':sum(map(len,headings.values())),'unique_ids':len(audit.ids),'internal_links':sum(h.startswith('#') for h in audit.links),'broken_internal_links':len(missing),'local_file_links':len(local_targets),'missing_local_files':sum(not ok for _,ok in local_targets),'palette_roles':len(swatches),'palette_hex_values':sum(len(re.findall(r'#[A-Fa-f0-9]{6}',line)) for line in texts['graphics'].splitlines() if line.startswith('|')),'source_text_exact_match':True,'input_bytes_unchanged':True,'balanced_html_tags':True,'external_resource_tags':0,'javascript':False,'credential_pattern_hits':0,'browser_launched':False,'output_bytes':OUT.stat().st_size,'output_sha256':sha(OUT.read_bytes())}
receipt = '# Stage4 HTML 패키징 영수증 · 2026-10-23\n\n- 담당: madangsue / Kanban `t_b4952283`\n- Reuse decision: 기존 등록 문서 패키징 담당 madangsue 재사용. uimini 별도 런타임 lane과 중복 편집 없음.\n- 범위: 기존 완성 문서의 표현·묶음만 수행. 게임 구현/오디오 제작/그래픽 모델링 아님.\n- 변경 소유: `Planner/stage4_advancement_20261023.html`, 이 `receipt.md`, 같은 디렉터리의 `build_html.py`만.\n- 브라우저·서버·상주 프로세스·서브에이전트 실행 없음. Advisor가 최종 HTML을 연다. Python은 문서 생성/정적 검사 용도로만 실행.\n- Git stage/commit/push, Firebase, 배포, stage-list lane 변경 없음. Main Advisor가 Git과 보드 최종 처리를 담당.\n\n## 필수 선행 게이트\n\n- 명령: `powershell -NoProfile -ExecutionPolicy Bypass -File F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile madangsue -Domain auto -TaskSummary "document packaging"`\n- 실제 exit code: 0\n- resolved_domains: common, operations (프로필 기본 포함, 중복 제거).\n- matched_domains: []; match_evidence: [] — 추가 키워드 매칭 없음.\n- combined_receipt_sha256: `53a7ae50313bb4c3d069b41b19d88be91b45206fce152e1b770aca09e2d993d0`\n- emitted 필독 문서 전체 확인. SESSION_MEMORY는 최신 Session 9 / Entry 1 (2026-10-10 2323 KST)을 별도 추출 확인. 최초 앞부분 110행을 잘못 읽은 뒤 과거 추가 탐색 없이 최신 엔트리로 교정함.\n- gstack: GSTACK_OK. 로드 스킬: kanban-worker, claude-design.\n\n## 입력 provenance 및 바이트 보존\n\n| 입력 | 줄 수 | 입력 SHA-256 |\n|---|---:|---|\n'
for key,path,_ in FILES:
    receipt += '| `'+path+'` | '+str(len(texts[key].splitlines()))+' | `'+sha(raw[key])+'` |\n'
receipt += '\n모든 입력은 읽기 전용으로 사용했다. 생성 직전 각 입력 바이트를 최초 캡처와 재비교하여 동일성을 확인했다. 각 전체 문서는 본문에 서식화하고, 접을 수 있는 원문 Markdown 대조란에도 문자 단위 동일하게 보존했다.\n\n## 산출물\n\n- HTML: `'+str(OUT).replace('\\','/')+'`\n- HTML SHA-256: `'+result['output_sha256']+'`\n- 빌더: `'+str(Path(__file__).resolve()).replace('\\','/')+'`\n- 재생성/검사 명령: `python Developer/agent_room/stage4_html_20261023/build_html.py`\n- 표준 라이브러리만 사용. 패키지 설치, CDN, 폰트, JS, 네트워크, 저장소, API, 서버 의존성 없음.\n\n## 편집 및 링크 처리\n\n- index와 세 상세안 전체 포함, 따뜻한 종이색/짙은 잉크색, 반응형, 고정 전체 목차, 모든 원문 제목의 고유 앵커, P0/P1/P2 바로가기.\n- PROPOSAL 명시 좀비 4카드, 실제 제안 HEX 표 기반 색상 견본, 가로 스크롤 표, 코드 서식, 인쇄 스타일.\n- 포함 문서 간 링크는 내부 section anchor로 변환. 그래픽 문서의 저장소 경로는 Planner 기준 상대 경로로 보정.\n- `#L…`은 로컬 파일에 존재하지 않는 앵커를 꾸미지 않고 제거. 조사 줄 표시는 원문 인용 라벨/원문 대조란으로 보존. 로컬 파일 존재는 현재 위치 확인일 뿐 원문 조사 판본/줄/운영 실효값 재검증이 아니다.\n- 자동 로드 리소스 없음. 원문 URL/경로/해시 인용은 텍스트로만 보존. 현재/제안 및 W/R/과거/미조회 운영 상태 구분을 유지.\n\n## 실제 정적 검사 결과\n\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n\n검사: 저장된 HTML 재파싱, 태그 균형, 중복 ID, 내부 href 목적지, 모든 로컬 파일 링크 존재, 전체 원문 문자 동일성(따라서 숫자·경로·조사 해시 보존), 입력 바이트 동일성, 리소스 태그/외부 href/가짜 줄 앵커 부재, 일반 credential 패턴 부재.\n\n제한: 브라우저/스크린샷/실기기 렌더링은 요청대로 미실행. 시각 품질과 실제 인쇄 결과는 정적 CSS 구성까지만 확인했다. credential 검사는 일반 패턴 검사이며 모든 형식의 비밀 부재를 수학적으로 증명하는 감사는 아니다. 게임 플레이·빌드·Firebase·오디오 청감 검증을 수행하거나 PASS로 표시하지 않았다.\n'
RECEIPT.write_text(receipt,encoding='utf-8',newline='\n')
assert sha(OUT.read_bytes())==result['output_sha256']
print(json.dumps(result,ensure_ascii=False,indent=2))
print('HTML:', OUT)
print('RECEIPT:', RECEIPT)
