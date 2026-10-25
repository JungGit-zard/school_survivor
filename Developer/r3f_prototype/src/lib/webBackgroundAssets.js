// 랜딩 아트는 게임 빌드 내부 에셋(해시 파일명 WebP → 장기 캐시)으로 가져온다. 외부 이미지 호스트 의존 없음.
// 원본 PNG(1672x941, ~2.3MB): 포스팅/원고보관_20261011_210230/이미지/landing_*.png
// - *_bg.webp: 1600x900 q68 (~150KB) — 스테이지 배경, 페이지 로드당 1장만 받는다.
// - *.webp: 720x405 q74 (~60KB) — 소개 카드·갤러리·영상 자리 공용(lazy).
// 기존 web_game_side_gutters_01~04 PNG 원본은 D: 유실로 로컬에 없어 같은 승인 랜딩 아트로 대체했다.
import classroomSurvivalBg from '../assets/web-landing/landing_classroom_survival_bg.webp'
import schoolSuppliesBg from '../assets/web-landing/landing_school_supplies_bg.webp'
import sunsetEscapeBg from '../assets/web-landing/landing_sunset_escape_bg.webp'
import classroomSurvival from '../assets/web-landing/landing_classroom_survival.webp'
import schoolSupplies from '../assets/web-landing/landing_school_supplies.webp'
import sunsetEscape from '../assets/web-landing/landing_sunset_escape.webp'

const WEB_BACKGROUND_ASSET_URLS = Object.freeze([classroomSurvivalBg, schoolSuppliesBg, sunsetEscapeBg])

function chooseOncePerPageLoad() {
  const index = Math.floor(Math.random() * WEB_BACKGROUND_ASSET_URLS.length)
  return WEB_BACKGROUND_ASSET_URLS[Math.min(index, WEB_BACKGROUND_ASSET_URLS.length - 1)]
}

export const WEB_BACKGROUND_URLS = WEB_BACKGROUND_ASSET_URLS
export const WEB_LANDING_ART_URLS = Object.freeze({ classroomSurvival, schoolSupplies, sunsetEscape })
// 갤러리·영상 자리 썸네일은 소개 카드와 같은 파일을 재사용해 추가 전송이 없다.
export const WEB_BACKGROUND_THUMB_URLS = Object.freeze([classroomSurvival, schoolSupplies, sunsetEscape])
export const selectedWebBackgroundUrl = chooseOncePerPageLoad()

export function getSelectedWebBackgroundStyle() {
  return {
    backgroundImage: `url("${selectedWebBackgroundUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
  }
}
