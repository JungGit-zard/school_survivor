const WEB_BACKGROUND_ASSET_URLS = Object.freeze([
  'https://escape-zombie-school-assets.web.app/web-side-gutters/v2/web_game_side_gutters_01.png',
  'https://escape-zombie-school-assets.web.app/web-side-gutters/v1/web_game_side_gutters_02.png',
  'https://escape-zombie-school-assets.web.app/web-side-gutters/v1/web_game_side_gutters_03.png',
  'https://escape-zombie-school-assets.web.app/web-side-gutters/v1/web_game_side_gutters_04.png',
])

function chooseOncePerPageLoad() {
  const index = Math.floor(Math.random() * WEB_BACKGROUND_ASSET_URLS.length)
  return WEB_BACKGROUND_ASSET_URLS[Math.min(index, WEB_BACKGROUND_ASSET_URLS.length - 1)]
}

export const WEB_BACKGROUND_URLS = WEB_BACKGROUND_ASSET_URLS
export const WEB_LANDING_ART_URLS = Object.freeze({
  classroomSurvival: 'https://escape-zombie-school-assets.web.app/web-landing/v1/landing_classroom_survival.png',
  schoolSupplies: 'https://escape-zombie-school-assets.web.app/web-landing/v1/landing_school_supplies.png',
  sunsetEscape: 'https://escape-zombie-school-assets.web.app/web-landing/v1/landing_sunset_escape.png',
})
export const WEB_LANDING_COMIC_URLS = Object.freeze({
  attendance: '/web-comics/v3/comic_ep01_attendance.png',
  lunchLine: '/web-comics/v3/comic_ep02_lunch_line.png',
  homeworkWind: '/web-comics/v3/comic_ep03_homework_wind.png',
  gymBounce: '/web-comics/v3/comic_ep04_gym_bounce.png',
  libraryQuiet: '/web-comics/v3/comic_ep05_library_quiet.png',
})
export const selectedWebBackgroundUrl = chooseOncePerPageLoad()

export function getSelectedWebBackgroundStyle() {
  return {
    backgroundImage: `url("${selectedWebBackgroundUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
  }
}

