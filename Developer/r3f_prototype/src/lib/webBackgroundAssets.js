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
  attendance: 'https://escape-zombie-school-assets.web.app/web-comics/v2/comic_ep01_attendance_vertical_1x4_ko_dialogue_v2.png',
  lunchLine: 'https://escape-zombie-school-assets.web.app/web-comics/v2/comic_ep02_lunch_line_vertical_1x4_ko_dialogue_v2.png',
  homeworkWind: 'https://escape-zombie-school-assets.web.app/web-comics/v2/comic_ep03_homework_wind_vertical_1x4_ko_dialogue_v2.png',
  gymBounce: 'https://escape-zombie-school-assets.web.app/web-comics/v2/comic_ep04_gym_bounce_vertical_1x4_ko_dialogue_v2.png',
  libraryQuiet: 'https://escape-zombie-school-assets.web.app/web-comics/v2/comic_ep05_library_quiet_vertical_1x4_ko_dialogue_v2.png',
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

