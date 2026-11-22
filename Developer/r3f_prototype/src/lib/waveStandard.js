// 웨이브 표준 구성표 — 2026-11-21 Terry 지시·승인 ("모두 차근차근 구현해").
//   "좀비 웨이브마다 밥줄 좀비 한 종이 70% 정도, 나머지는 특히 강해 보이고 다른 역할을 하는 좀비 몇 종".
// 정본 기획: F:/ezs-work/backup/wave_standard_20261121/plan.md · standard.json (levelmini). 스테이지 1~6만. 7~10은 기존 순환 규칙 그대로.
//
// 웨이브 = 30초 한 칸(W1 0–30초 … W8 210–240초). 240초 이후는 W9·W10을 30초마다 번갈아 되풀이한다(복습 웨이브).
// fodder = 밥줄(그 웨이브 몸의 약 70%), specials = 역할이 서로 다른 특수 2~3종(약 30%). 규칙은 lib/waveComposition.js.
// 2026-11-22 balanceqa 게이트 뒤: 스테이지 1~5 밥줄은 전 구간 E01(초록). E07 웃는얼굴(속도·접촉 피해 2배)·E03 달리기를 밥줄로
// 쓰면 바뀐 몸이 더 빠르고 세게 때려서 사망률이 올랐다(스1 약한 봇 +11%p). E07·E03은 몸이 그 종으로 올 때 그대로 남는다(규칙 3).
// 순수 데이터 모듈 — import 없음.

export const WAVE_STANDARD_WAVE_SEC = 30
export const WAVE_STANDARD_OVERTIME_START_SEC = 240

export const WAVE_STANDARD = Object.freeze({
  stage1: Object.freeze([
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E34']) }), // W1 0–30초 초록 좀비 | 박자접기형(돌진)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E34', 'E35']) }), // W2 30–60초 초록 좀비 | 박자접기형(돌진), 모서리비껴형(근접기술)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E35', 'E66', 'E02']) }), // W3 60–90초 초록 좀비 | 모서리비껴형(근접기술), 플라나리아 좀비(분열), 덩치 좀비(탱크)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E02', 'E66']) }), // W4 90–120초 초록 좀비 | 덩치 좀비(탱크), 플라나리아 좀비(분열)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E05', 'E56', 'E91']) }), // W5 120–150초 초록 좀비 | 돌진 좀비(돌진), 보건실 좀비(지원), 교과서 미믹(기습)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E56', 'E90']) }), // W6 150–180초 초록 좀비 | 보건실 좀비(지원), 숙제 걷기 당번 좀비(방해)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E36', 'E90', 'E06']) }), // W7 180–210초 초록 좀비 | 반걸음되짚기형(돌진), 숙제 걷기 당번 좀비(방해), 거대 좀비(탱크)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E77', 'E06', 'E91']) }), // W8 210–240초 초록 좀비 | 충돌실험 인형 좀비(돌진), 거대 좀비(탱크), 교과서 미믹(기습)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E05', 'E02', 'E56']) }), // W9 240–270초 초록 좀비 | 돌진 좀비(돌진), 덩치 좀비(탱크), 보건실 좀비(지원)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E34', 'E06', 'E66']) }), // W10 270–초 초록 좀비 | 박자접기형(돌진), 거대 좀비(탱크), 플라나리아 좀비(분열)
  ]),
  stage2: Object.freeze([
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E37', 'E38']) }), // W1 0–30초 초록 좀비 | 빗금엇갈림형(돌진), 빈칸반응형(근접기술)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E37', 'E46']) }), // W2 30–60초 초록 좀비 | 빗금엇갈림형(돌진), 지우개튕김 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E93', 'E47', 'E02']) }), // W3 60–90초 초록 좀비 | 그림자밟기 좀비(기습), 종이비행기 좀비(원거리), 덩치 좀비(탱크)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E39', 'E63', 'E94']) }), // W4 90–120초 초록 좀비 | 선끝접기형(돌진), 마이크줄 좀비(원거리), 대걸레 밀기 좀비(방해)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E49', 'E51']) }), // W5 120–150초 초록 좀비 | 양동이청소 좀비(장판·포격), 합창지휘 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E65', 'E81']) }), // W6 150–180초 초록 좀비 | 시험감독 좀비(장판·포격), PC방 게이머 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E05', 'E67', 'E57']) }), // W7 180–210초 초록 좀비 | 돌진 좀비(돌진), 학생회방패 좀비(지원), 출석부 생활지도 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E06', 'E74', 'E56']) }), // W8 210–240초 초록 좀비 | 거대 좀비(탱크), 로봇부 번개 좀비(원거리), 보건실 좀비(지원)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E04', 'E34', 'E02']) }), // W9 240–270초 초록 좀비 | 투척 좀비(원거리), 박자접기형(돌진), 덩치 좀비(탱크)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E38', 'E46', 'E06']) }), // W10 270–초 초록 좀비 | 빈칸반응형(근접기술), 지우개튕김 좀비(원거리), 거대 좀비(탱크)
  ]),
  stage3: Object.freeze([
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E41', 'E80']) }), // W1 0–30초 초록 좀비 | 쌍박자교대형(근접기술), 축제 부채 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E96', 'E64', 'E80']) }), // W2 30–60초 초록 좀비 | 드리블 좀비(돌진), 분필가루 좀비(장판·포격), 축제 부채 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E97', 'E68', 'E96']) }), // W3 60–90초 초록 좀비 | 뜀틀 좀비(기습), 지구본 좀비(장판·포격), 드리블 좀비(돌진)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E42', 'E57']) }), // W4 90–120초 초록 좀비 | 반원발맞춤형(탱크), 출석부 생활지도 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E42', 'E85', 'E58']) }), // W5 120–150초 초록 좀비 | 반원발맞춤형(탱크), 매점 아저씨 좀비(돌진), 줄넘기 매복 좀비(기습)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E40', 'E74']) }), // W6 150–180초 초록 좀비 | 중심축비틀기형(탱크), 로봇부 번개 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E82', 'E40', 'E46']) }), // W7 180–210초 초록 좀비 | 씨름부 좀비(돌진), 중심축비틀기형(탱크), 지우개튕김 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E62', 'E06', 'E04']) }), // W8 210–240초 초록 좀비 | 셔틀런 좀비(돌진), 거대 좀비(탱크), 투척 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E37', 'E02', 'E97']) }), // W9 240–270초 초록 좀비 | 빗금엇갈림형(돌진), 덩치 좀비(탱크), 뜀틀 좀비(기습)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E05', 'E06', 'E68']) }), // W10 270–초 초록 좀비 | 돌진 좀비(돌진), 거대 좀비(탱크), 지구본 좀비(장판·포격)
  ]),
  stage4: Object.freeze([
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E37', 'E04']) }), // W1 0–30초 초록 좀비 | 빗금엇갈림형(돌진), 투척 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E43', 'E04']) }), // W2 30–60초 초록 좀비 | 엇높이교차형(탱크), 투척 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E60', 'E61']) }), // W3 60–90초 초록 좀비 | 배수구잠복 좀비(기습), 급식판 좀비(돌진)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E61', 'E44', 'E84']) }), // W4 90–120초 초록 좀비 | 급식판 좀비(돌진), 발맞춤후퇴형(근접기술), 영양사 좀비(지원)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E99', 'E59', 'E84']) }), // W5 120–150초 초록 좀비 | 압력밥솥 좀비(탱크), 우유당번 좀비(장판·포격), 영양사 좀비(지원)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E45', 'E100']) }), // W6 150–180초 초록 좀비 | 무게중심넘김형(근접기술), 찹쌀떡 좀비(기습)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E69', 'E47', 'E05']) }), // W7 180–210초 초록 좀비 | 도미노 좀비(장판·포격), 종이비행기 좀비(원거리), 돌진 좀비(돌진)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E06', 'E85', 'E49']) }), // W8 210–240초 초록 좀비 | 거대 좀비(탱크), 매점 아저씨 좀비(돌진), 양동이청소 좀비(장판·포격)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E02', 'E37', 'E59']) }), // W9 240–270초 초록 좀비 | 덩치 좀비(탱크), 빗금엇갈림형(돌진), 우유당번 좀비(장판·포격)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E06', 'E05', 'E84']) }), // W10 270–초 초록 좀비 | 거대 좀비(탱크), 돌진 좀비(돌진), 영양사 좀비(지원)
  ]),
  stage5: Object.freeze([
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E04', 'E39']) }), // W1 0–30초 초록 좀비 | 투척 좀비(원거리), 선끝접기형(돌진)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E66', 'E48']) }), // W2 30–60초 초록 좀비 | 플라나리아 좀비(분열), 부메랑자 좀비(원거리) — 2026-11-22: 원거리 없는 웨이브를 없애려 E44를 W10으로
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E54', 'E64', 'E02']) }), // W3 60–90초 초록 좀비 | 확성기방송 좀비(원거리), 분필가루 좀비(장판·포격), 덩치 좀비(탱크)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E52', 'E68', 'E02']) }), // W4 90–120초 초록 좀비 | 플라스크분열 좀비(원거리), 지구본 좀비(장판·포격), 덩치 좀비(탱크)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E48', 'E102', 'E103']) }), // W5 120–150초 초록 좀비 | 부메랑자 좀비(원거리), 회전의자 좀비(돌진), 커피 셔틀 좀비(지원) — 2026-11-22: 보스 직전 원거리를 가장 센 E48로(스5 약한 봇 사망률을 트렁크 쪽으로)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E86', 'E50']) }), // W6 150–180초 초록 좀비 | 장학사 좀비(지원), 배구스파이크 좀비(장판·포격)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E75', 'E51', 'E06']) }), // W7 180–210초 초록 좀비 | 로봇부 하트 좀비(돌진), 합창지휘 좀비(원거리), 거대 좀비(탱크)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E53', 'E40', 'E65']) }), // W8 210–240초 초록 좀비 | 물감뿌림 좀비(원거리), 중심축비틀기형(탱크), 시험감독 좀비(장판·포격)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E37', 'E43', 'E57']) }), // W9 240–270초 초록 좀비 | 빗금엇갈림형(돌진), 엇높이교차형(탱크), 출석부 생활지도 좀비(원거리)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E42', 'E05', 'E44']) }), // W10 270–초 초록 좀비 | 반원발맞춤형(탱크), 돌진 좀비(돌진), 발맞춤후퇴형(근접기술)
  ]),
  stage6: Object.freeze([
    Object.freeze({ fodder: 'E19', specials: Object.freeze(['E87', 'E79', 'E20']) }), // W1 0–30초 조회 줄서기 좀비 | 오리엔티어링부 좀비(돌진), 학부모회장 좀비(원거리), 국민체조 좀비(탱크)
    Object.freeze({ fodder: 'E19', specials: Object.freeze(['E21', 'E71', 'E20']) }), // W2 30–60초 조회 줄서기 좀비 | 계주 바통 좀비(돌진), 학예회 닌자 좀비(기습), 국민체조 좀비(탱크)
    Object.freeze({ fodder: 'E19', specials: Object.freeze(['E21', 'E70']) }), // W3 60–90초 조회 줄서기 좀비 | 계주 바통 좀비(돌진), 술래 좀비(기습)
    Object.freeze({ fodder: 'E19', specials: Object.freeze(['E73', 'E80', 'E02']) }), // W4 90–120초 조회 줄서기 좀비 | 해적 분장 좀비(장판·포격), 축제 부채 좀비(원거리), 덩치 좀비(탱크)
    Object.freeze({ fodder: 'E19', specials: Object.freeze(['E76', 'E72', 'E06']) }), // W5 120–150초 조회 줄서기 좀비 | 연극부 오크 좀비(돌진), 교통지도 좀비(원거리), 거대 좀비(탱크)
    Object.freeze({ fodder: 'E19', specials: Object.freeze(['E105', 'E78']) }), // W6 150–180초 조회 줄서기 좀비 | 2인3각 좀비(편대), 텃밭 할아버지 좀비(지원)
    Object.freeze({ fodder: 'E19', specials: Object.freeze(['E106', 'E55', 'E88']) }), // W7 180–210초 조회 줄서기 좀비 | 기마전 좀비(편대), 강속구 야구부 좀비(원거리), 육상부 좀비(돌진)
    Object.freeze({ fodder: 'E19', specials: Object.freeze(['E83', 'E04', 'E20']) }), // W8 210–240초 조회 줄서기 좀비 | 응원단장 좀비(돌진), 투척 좀비(원거리), 국민체조 좀비(탱크)
    Object.freeze({ fodder: 'E01', specials: Object.freeze(['E05', 'E06', 'E71']) }), // W9 240–270초 초록 좀비 | 돌진 좀비(돌진), 거대 좀비(탱크), 학예회 닌자 좀비(기습)
    Object.freeze({ fodder: 'E07', specials: Object.freeze(['E21', 'E02', 'E73']) }), // W10 270–초 웃는얼굴 좀비 | 계주 바통 좀비(돌진), 덩치 좀비(탱크), 해적 분장 좀비(장판·포격)
  ]),
})

// 특수 역할(기획 표기). 한 웨이브 안 특수는 역할이 전부 다르다(waveStandard.test.js가 검사).
export const WAVE_SPECIAL_ROLE = Object.freeze({
  E02: '탱크', E04: '원거리', E05: '돌진', E06: '탱크', E20: '탱크', E21: '돌진',
  E34: '돌진', E35: '근접기술', E36: '돌진', E37: '돌진', E38: '근접기술', E39: '돌진',
  E40: '탱크', E41: '근접기술', E42: '탱크', E43: '탱크', E44: '근접기술', E45: '근접기술',
  E46: '원거리', E47: '원거리', E48: '원거리', E49: '장판·포격', E50: '장판·포격', E51: '원거리',
  E52: '원거리', E53: '원거리', E54: '원거리', E55: '원거리', E56: '지원', E57: '원거리',
  E58: '기습', E59: '장판·포격', E60: '기습', E61: '돌진', E62: '돌진', E63: '원거리',
  E64: '장판·포격', E65: '장판·포격', E66: '분열', E67: '지원', E68: '장판·포격', E69: '장판·포격',
  E70: '기습', E71: '기습', E72: '원거리', E73: '장판·포격', E74: '원거리', E75: '돌진',
  E76: '돌진', E77: '돌진', E78: '지원', E79: '원거리', E80: '원거리', E81: '원거리',
  E82: '돌진', E83: '돌진', E84: '지원', E85: '돌진', E86: '지원', E87: '돌진',
  E88: '돌진', E90: '방해', E91: '기습', E93: '기습', E94: '방해', E96: '돌진',
  E97: '기습', E99: '탱크', E100: '기습', E102: '돌진', E103: '지원', E105: '편대',
  E106: '편대',
})
