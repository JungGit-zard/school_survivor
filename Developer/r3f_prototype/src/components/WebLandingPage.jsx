import { useEffect, useRef, useState } from 'react'
import TitleSceneCanvas from './TitleSceneCanvas.jsx'
import '../assets/fonts/nanumMyeongjo.css'
import { WEB_BACKGROUND_URLS, WEB_LANDING_ART_URLS, WEB_LANDING_COMIC_URLS, getSelectedWebBackgroundStyle } from '../lib/webBackgroundAssets.js'

export const LANDING_HERO_VIDEO_URL = ''
export const LANDING_FEATURE_VIDEO_URL = ''

const TITLE_BGM_URL = new URL('../assets/audio/title_bgm.m4a', import.meta.url).href

const FEATURE_FACTS = [
  '3분 30초 생존',
  '4개 스테이지',
  '설치 없이 즉시 시작',
]

const GAMEPLAY_CARDS = [
  {
    title: '방과후 생존 액션',
    body: '교실에서 시작해 복도, 급식실까지 이어지는 방과후 생존 액션. 자동 공격과 성장 선택으로 짧고 강한 한 판을 만든다.',
    image: WEB_LANDING_ART_URLS.classroomSurvival,
  },
  {
    title: '무기와 업그레이드',
    body: '연필, 가방, 과학 플라스크처럼 학교 콘셉트 무기를 모아 좀비 무리를 밀어낸다.',
    image: WEB_LANDING_ART_URLS.schoolSupplies,
  },
  {
    title: '즉시 플레이',
    body: '설치 없이 웹에서 바로 시작하고, 모바일에서도 큰 버튼과 읽기 쉬운 정보 위계로 진입한다.',
    image: WEB_LANDING_ART_URLS.sunsetEscape,
  },
]

const NEWS_ITEMS = [
  ['웹에서 바로 시작', '설치 없이 게임 시작 버튼을 누르면 학교 탈출에 바로 도전할 수 있습니다.'],
  ['생존 루트 안내', '이동, 자동 공격, 업그레이드 선택으로 이어지는 기본 흐름을 안내합니다.'],
  ['미디어 아카이브', '게임 속 학교와 생존 장면을 공식 이미지로 확인할 수 있습니다.'],
]

const SURVIVAL_STEPS = [
  '체육복을 챙길 틈도 없이 시작되는 교실 탈출',
  '경험치를 모아 무기 카드를 고르고 생존 루트를 만든다',
  '탈출구가 열릴 때까지 몰려오는 좀비와 선생님 보스를 버틴다',
]

const START_STEPS = [
  '1. 웹에서 바로 플레이를 누른다',
  '2. 방향키 또는 모바일 터치로 이동한다',
  '3. 자동 공격과 업그레이드 선택으로 학교를 탈출한다',
]

const COMIC_EPISODES = [
  {
    id: 'attendance',
    image: WEB_LANDING_COMIC_URLS.attendance,
    title: '출석부를 찾아라!',
    accent: '#16A34A',
    summary: '출석부를 찾던 좀비들, 연필 한 번에 모범생 모드!',
    beats: ['교실 문 앞 출석부 소동', '노란 연필 지휘봉으로 멈춤', '작은 별 반짝임과 어지럼', '손을 들고 출석 체크'],
  },
  {
    id: 'lunch-line',
    image: WEB_LANDING_COMIC_URLS.lunchLine,
    title: '급식 줄은 한 줄로',
    accent: '#2563EB',
    summary: '급식 줄도 연필처럼 반듯하게! 오늘의 메뉴는 질서 한 스푼.',
    beats: ['지그재그 급식 줄', '연필 끝으로 방향 안내', '한 줄 정렬 성공', '반듯하게 식판 받기'],
  },
  {
    id: 'homework-wind',
    image: WEB_LANDING_COMIC_URLS.homeworkWind,
    title: '바람아, 숙제는 이쪽!',
    accent: '#7C3AED',
    summary: '날아간 숙제도 걱정 끝. 연필이 가리키는 곳이 제출함!',
    beats: ['창문 바람에 과제 종이 휘날림', '연필 끝에 종이 한 장 포착', '교실 문 쪽으로 안전 유도', '교탁 위에 차곡차곡 정리'],
  },
  {
    id: 'gym-bounce',
    image: WEB_LANDING_COMIC_URLS.gymBounce,
    title: '체육관의 슈퍼 바운드',
    accent: '#16A34A',
    summary: '체육 시간도 안전 제일! 연필 지우개는 의외로 공 받기 명수.',
    beats: ['농구공이 천장까지 통통', '연필을 안전 방망이처럼 들기', '매트로 부드럽게 방향 전환', '공손히 공을 건네기'],
  },
  {
    id: 'library-quiet',
    image: WEB_LANDING_COMIC_URLS.libraryQuiet,
    title: '도서관의 쉿! 작전',
    accent: '#2563EB',
    summary: '도서관에서는 조용히. 좀비도 연필 신호엔 독서 모드!',
    beats: ['책장 사이 큰 입 소동', '연필로 조용한 신호', '작은 별과 함께 꾸벅', '거꾸로 든 책을 살짝 바로잡기'],
  },
]

const VIDEO_PLACEHOLDERS = WEB_BACKGROUND_URLS.slice(0, 3).map((image, index) => ({
  title: [`교실 생존 미리보기`, `학교 배경 둘러보기`, `탈출 루트 티저`][index],
  image,
}))

export default function WebLandingPage() {
  const [activeMedia, setActiveMedia] = useState(null)
  const [mediaScrollRequest, setMediaScrollRequest] = useState(0)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [musicStatus, setMusicStatus] = useState('수동 재생 전용 · 아직 재생하지 않음')
  const [selectedComicIndex, setSelectedComicIndex] = useState(null)
  const audioRef = useRef(null)
  const selectedComic = selectedComicIndex === null ? null : COMIC_EPISODES[selectedComicIndex]

  const selectMedia = (media, shouldScrollToToolbar = false) => {
    if (media !== 'music' && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsMusicPlaying(false)
      setMusicStatus('수동 재생 전용 · 아직 재생하지 않음')
    }
    setActiveMedia(media)
    if (shouldScrollToToolbar) setMediaScrollRequest((request) => request + 1)
  }

  const openMediaLink = (media) => (event) => {
    event.preventDefault()
    selectMedia(media, true)
  }

  useEffect(() => {
    if (mediaScrollRequest) document.getElementById('media')?.scrollIntoView?.({ block: 'start' })
  }, [mediaScrollRequest])

  useEffect(() => {
    if (!selectedComic) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedComicIndex(null)
      if (event.key === 'ArrowLeft') setSelectedComicIndex((index) => (index + COMIC_EPISODES.length - 1) % COMIC_EPISODES.length)
      if (event.key === 'ArrowRight') setSelectedComicIndex((index) => (index + 1) % COMIC_EPISODES.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedComic])

  const toggleMusic = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMusicPlaying) {
      audio.pause()
      setIsMusicPlaying(false)
      setMusicStatus('일시정지됨')
      return
    }

    try {
      await audio.play()
      setIsMusicPlaying(true)
      setMusicStatus('타이틀 테마 재생 중')
    } catch {
      setIsMusicPlaying(false)
      setMusicStatus('브라우저가 재생을 막았습니다. 버튼을 다시 눌러 주세요.')
    }
  }

  return (
    <main className="web-landing" style={styles.viewport} aria-label="탈출! 좀비학교 공식 홈페이지">
      <style>{landingCss}</style>
      <a className="web-landing__skip-link" href="#game-intro">본문으로 건너뛰기</a>
      <section
        data-testid="web-landing-stage"
        className="web-landing__stage"
        style={{
          ...styles.stage,
          ...getSelectedWebBackgroundStyle(),
        }}
      >
        <div className="web-landing__content">
          <nav aria-label="공식 홈페이지 주요 탐색" className="web-landing__nav">
            <a href="/" className="web-landing__brand web-landing__link" aria-label="탈출! 좀비학교 홈">
              <span className="web-landing__brand-mark">!</span>
              <span>공식 홈페이지</span>
            </a>
            <div className="web-landing__nav-links">
              <a href="#game-intro" className="web-landing__nav-link web-landing__link">게임 소개</a>
              <a href="#section-start" className="web-landing__nav-link web-landing__link">플레이 방법</a>
              <a href="#comics" className="web-landing__nav-link web-landing__link" onClick={openMediaLink('comics')}>4컷 만화 보기</a>
              <a href="#music" className="web-landing__nav-link web-landing__link" onClick={openMediaLink('music')}>음악</a>
              <a href="#videos" className="web-landing__nav-link web-landing__link" onClick={openMediaLink('videos')}>영상</a>
              <a href="#news" className="web-landing__nav-link web-landing__link">새소식</a>
              <a href="/game" className="web-landing__nav-cta web-landing__link">게임 시작</a>
            </div>
          </nav>

          <section className="web-landing__hero-shell" aria-labelledby="landing-title">
            <div aria-hidden="true" className="web-landing__scene-layer" style={styles.sceneLayer}>
              <TitleSceneCanvas style={styles.titleSceneCanvas} />
            </div>
            {LANDING_HERO_VIDEO_URL ? (
              <video className="web-landing__hero-video" autoPlay muted loop playsInline>
                <source src={LANDING_HERO_VIDEO_URL} />
              </video>
            ) : null}
            <div className="web-landing__hero-scrim" style={styles.scrim} aria-hidden="true" />
            <div className="web-landing__hero">
              <div className="web-landing__hero-copy">
                <p className="web-landing__eyebrow">KOREAN SCHOOL SURVIVAL ACTION</p>
                <h1 id="landing-title" className="web-landing__title">탈출! 좀비학교</h1>
                <p className="web-landing__headline">종이 울리기 전에 탈출하자</p>
                <p className="web-landing__support">3분 30초 동안 몰려오는 좀비를 버티고 잠긴 탈출구를 열어라.</p>
                <div className="web-landing__hero-actions" aria-label="주요 행동">
                  <a href="/game" className="web-landing__cta web-landing__link">웹에서 바로 플레이</a>
                  <a href="#section-start" className="web-landing__ghost-link web-landing__link">플레이 방법 보기</a>
                  <a href="#comics" className="web-landing__comic-link web-landing__link" onClick={openMediaLink('comics')}>4컷 만화 보기</a>
                </div>
              </div>

              <aside className="web-landing__notice" aria-label="공식 안내">
                <strong>공식 홈페이지</strong>
                <span>게임에 들어가기 전, 만화·음악·영상을 둘러보세요.</span>
              </aside>
            </div>
          </section>

          <ul aria-label="게임 특징" className="web-landing__facts">
            {FEATURE_FACTS.map((fact) => (
              <li key={fact} className="web-landing__fact-card">{fact}</li>
            ))}
          </ul>

          <a href="/game" className="web-landing__mobile-cta web-landing__link">모바일에서 바로 플레이</a>

          <section id="game-intro" aria-labelledby="section-gameplay-title" className="web-landing__panel web-landing__panel--wide" data-reveal>
            <div className="web-landing__section-heading">
              <p>GAMEPLAY</p>
              <h2 id="section-gameplay-title">게임 소개</h2>
            </div>
            <div className="web-landing__card-grid">
              {GAMEPLAY_CARDS.map((card) => (
                <article key={card.title} className="web-landing__info-card">
                  <img src={card.image} loading="lazy" decoding="async" alt="" />
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="section-survival" aria-labelledby="section-survival-title" className="web-landing__panel web-landing__split-panel" data-reveal>
            <div className="web-landing__section-heading">
              <p>SURVIVAL ROUTE</p>
              <h2 id="section-survival-title">생존 포인트</h2>
            </div>
            <ol className="web-landing__step-list">
              {SURVIVAL_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section id="section-start" aria-labelledby="section-start-title" className="web-landing__panel web-landing__split-panel" data-reveal>
            <div className="web-landing__section-heading">
              <p>START GUIDE</p>
              <h2 id="section-start-title">플레이 방법</h2>
            </div>
            <ol className="web-landing__start-list">
              {START_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <a href="/game" className="web-landing__bottom-cta web-landing__link">지금 학교 탈출 시작</a>
          </section>

          <section id="media" aria-labelledby="section-media-controls-title" className="web-landing__panel web-landing__panel--wide" data-reveal>
            <div className="web-landing__section-heading">
              <p>OFFICIAL MEDIA</p>
              <h2 id="section-media-controls-title">만화 · 음악 · 동영상</h2>
            </div>
            <div className="web-landing__media-controls" aria-label="공식 미디어 선택">
              <button type="button" aria-pressed={activeMedia === 'comics'} onClick={() => selectMedia('comics')}>만화 보기</button>
              <button type="button" aria-pressed={activeMedia === 'music'} onClick={() => selectMedia('music')}>음악 듣기</button>
              <button type="button" aria-pressed={activeMedia === 'videos'} onClick={() => selectMedia('videos')}>동영상 보기</button>
            </div>

            {activeMedia === 'comics' ? (
              <section id="comics" aria-labelledby="section-comics-title" className="web-landing__media-panel">
                <div className="web-landing__section-heading">
                  <p>4-CUT COMICS</p>
                  <h2 id="section-comics-title">연필 구조대의 학교 일지</h2>
                </div>
                <p className="web-landing__media-intro">좀비 친구들이 기절 대신 제자리로 돌아오는, 가볍고 명랑한 다섯 편의 4컷 만화입니다.</p>
                <div className="web-landing__comic-grid" aria-label="4컷 만화 5편 목록">
                  {COMIC_EPISODES.map((comic, index) => (
                    <a key={comic.id} className="web-landing__comic-feature" style={{ '--comic-accent': comic.accent }} href={comic.image} target="_blank" rel="noreferrer" aria-label={`${comic.title} 전체 만화 열기`} onClick={(event) => { event.preventDefault(); setSelectedComicIndex(index) }}>
                      <div className="web-landing__comic-thumbnail"><img src={comic.image} loading="lazy" decoding="async" alt={`${comic.title} 썸네일`} /><span>{index + 1}화</span></div>
                      <div className="web-landing__comic-copy"><h3>{comic.title}</h3><p>{comic.summary}</p><span className="web-landing__comic-action">전체 만화 보기 <span aria-hidden="true">→</span></span></div>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

          {selectedComic ? (
            <div className="web-landing__comic-viewer-backdrop" role="presentation" onMouseDown={() => setSelectedComicIndex(null)}>
              <section
                className="web-landing__comic-viewer"
                role="dialog"
                aria-modal="true"
                aria-labelledby="comic-viewer-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="web-landing__comic-viewer-header">
                  <h2 id="comic-viewer-title">{selectedComic.title}</h2>
                  <button type="button" onClick={() => setSelectedComicIndex(null)} aria-label="만화 뷰어 닫기">닫기</button>
                </div>
                <img src={selectedComic.image} alt={`${selectedComic.title} 전체 만화`} />
                <div className="web-landing__comic-viewer-controls" aria-label="만화 편 이동">
                  <button type="button" onClick={() => setSelectedComicIndex((index) => (index + COMIC_EPISODES.length - 1) % COMIC_EPISODES.length)}>이전 편</button>
                  <span>{selectedComicIndex + 1} / {COMIC_EPISODES.length}</span>
                  <button type="button" onClick={() => setSelectedComicIndex((index) => (index + 1) % COMIC_EPISODES.length)}>다음 편</button>
                </div>
              </section>
            </div>
          ) : null}

          {activeMedia === 'music' ? (
          <section id="music" aria-labelledby="section-music-title" className="web-landing__media-panel">
            <div className="web-landing__section-heading">
              <p>MUSIC PLAYER</p>
              <h2 id="section-music-title">음악 듣기</h2>
            </div>
            <div className="web-landing__music-card">
              <div>
                <h3>타이틀 테마</h3>
                <p>현재 게임에서 들을 수 있는 잠긴 정본 타이틀 BGM입니다. 수동 재생 전용이며 자동으로 시작하지 않습니다.</p>
              </div>
              <button
                type="button"
                className="web-landing__music-button"
                aria-pressed={isMusicPlaying}
                aria-describedby="music-status"
                onClick={toggleMusic}
              >
                {isMusicPlaying ? '일시정지' : '재생'}
              </button>
              <audio
                ref={audioRef}
                src={TITLE_BGM_URL}
                preload="metadata"
                aria-label="타이틀 테마 재생기"
                onPause={() => setIsMusicPlaying(false)}
                onEnded={() => {
                  setIsMusicPlaying(false)
                  setMusicStatus('재생이 끝났습니다')
                }}
              >
                <source src={TITLE_BGM_URL} type="audio/mp4" />
              </audio>
              <p id="music-status" className="web-landing__music-status" aria-live="polite">{musicStatus}</p>
            </div>
          </section>
          ) : null}

          {activeMedia === 'videos' ? (
          <section id="videos" aria-labelledby="section-video-title" className="web-landing__media-panel">
            <div className="web-landing__section-heading">
              <p>VIDEO</p>
              <h2 id="section-video-title">영상 보기</h2>
            </div>
            <p className="web-landing__media-intro"><strong>승인된 영상 URL 없음</strong> · 현재는 기존 승인 이미지로만 영상 자리를 안내합니다.</p>
            <div className="web-landing__video-grid">
              {VIDEO_PLACEHOLDERS.map((video) => (
                <article key={video.title} className="web-landing__video-card">
                  <div style={{ backgroundImage: `url(${video.image})` }} aria-hidden="true" />
                  <h3>{video.title}</h3>
                  <p>공식 영상이 등록되면 이 카드에 수동 재생 플레이어가 연결됩니다.</p>
                </article>
              ))}
            </div>
            {LANDING_FEATURE_VIDEO_URL ? <p className="web-landing__media-intro">승인 영상 슬롯이 활성화되었습니다.</p> : null}
          </section>
          ) : null}
          </section>

          <section aria-labelledby="section-media-title" className="web-landing__panel web-landing__panel--wide" data-reveal>
            <div className="web-landing__section-heading">
              <p>MEDIA</p>
              <h2 id="section-media-title">학교 배경 미리보기</h2>
            </div>
            <div className="web-landing__gallery" aria-label="공식 배경 이미지">
              {WEB_BACKGROUND_URLS.map((url) => (
                <div
                  key={url}
                  className="web-landing__gallery-item"
                  style={{ backgroundImage: `url(${url})` }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <a href="/game" className="web-landing__bottom-cta web-landing__link">배경 속 학교로 입장</a>
          </section>

          <section id="news" aria-labelledby="section-news-title" className="web-landing__panel web-landing__panel--wide" data-reveal>
            <div className="web-landing__section-heading">
              <p>NEWS</p>
              <h2 id="section-news-title">새소식</h2>
            </div>
            <div className="web-landing__news-grid">
              {NEWS_ITEMS.map(([title, body]) => (
                <article key={title} className="web-landing__news-card">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label="게임 시작 안내" className="web-landing__final-cta" data-reveal>
            <p>지금, 종이 울리기 전에</p>
            <h2>학교 탈출을 시작하세요.</h2>
            <a href="/game" className="web-landing__cta web-landing__link">게임 시작</a>
          </section>

          <footer className="web-landing__footer">
            <span>ESCAPE! ZOMBIE SCHOOL</span>
            <span>공식 게임 홈페이지</span>
          </footer>
        </div>
      </section>
      {!selectedComic ? <a href="/game" className="web-landing__mobile-sticky-cta web-landing__link">게임 시작</a> : null}
    </main>
  )
}

const fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const styles = {
  viewport: {
    width: '100vw',
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    background: '#F6F8FF',
    color: '#172033',
    fontFamily: fontStack,
  },
  stage: {
    position: 'relative',
    width: 'min(100vw, 1920px, 177.7778dvh)',
    maxWidth: '1920px',
    maxHeight: '1080px',
    height: 'auto',
    aspectRatio: '16 / 9',
    overflow: 'hidden',
    backgroundColor: '#F6F8FF',
    boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.16), 0 30px 90px rgba(23, 32, 51, 0.18)',
  },
  sceneLayer: {
    position: 'absolute',
    inset: 0,
    transform: 'translateX(28%) scale(1.08)',
    opacity: 0.58,
    pointerEvents: 'none',
  },
  titleSceneCanvas: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.96) 0%, rgba(246, 248, 255, 0.9) 38%, rgba(255, 255, 255, 0.3) 68%, rgba(246, 248, 255, 0.72) 100%)',
    pointerEvents: 'none',
  },
}

const landingCss = `
/* contract tokens: aspect-ratio:16 / 9; height:100dvh; overflow-y:auto; prefers-reduced-motion:reduce; 본문으로 건너뛰기 */
.web-landing *,
.web-landing *::before,
.web-landing *::after {
  box-sizing: border-box;
}

.web-landing__stage {
  scrollbar-color: #2563EB #E8ECFF;
}

.web-landing__skip-link {
  position: fixed;
  z-index: 20;
  top: 8px;
  left: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #FFFFFF;
  color: #172033;
  border: 2px solid #2563EB;
  font-weight: 900;
  text-decoration: none;
  transform: translateY(-140%);
}

.web-landing__skip-link:focus {
  transform: translateY(0);
}

.web-landing__hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.web-landing__hero-shell {
  position: relative;
  isolation: isolate;
  min-height: clamp(410px, 48vw, 690px);
  overflow: hidden;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 28px;
  background: #F6F8FF;
  box-shadow: 0 18px 54px rgba(23, 32, 51, 0.12);
}

.web-landing__hero-shell .web-landing__scene-layer,
.web-landing__hero-shell .web-landing__hero-video {
  z-index: 0;
}

.web-landing__hero-scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.web-landing__content {
  position: relative;
  z-index: 1;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  grid-template-rows: auto auto auto auto auto auto;
  gap: clamp(18px, 2vw, 34px);
  padding: clamp(24px, 3.6vw, 68px);
}

.web-landing__nav {
  position: sticky;
  z-index: 5;
  top: 0;
  padding: 8px 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(246, 248, 255, 0.84), transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  font-size: clamp(12px, 0.95vw, 16px);
  font-weight: 900;
  letter-spacing: 0.04em;
}

.web-landing__brand,
.web-landing__nav-links,
.web-landing__hero-actions {
  display: inline-flex;
  align-items: center;
}

.web-landing__brand {
  gap: 10px;
  color: #172033;
  text-decoration: none;
  min-height: 44px;
}

.web-landing__brand-mark {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #7C3AED;
  color: #FFFFFF;
  font-size: 24px;
  line-height: 1;
}

.web-landing__nav-links {
  justify-content: flex-end;
  gap: clamp(8px, 1vw, 18px);
  flex-wrap: wrap;
}

.web-landing__nav-link,
.web-landing__nav-cta,
.web-landing__ghost-link {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2563EB;
  text-decoration: none;
}

.web-landing__nav-cta {
  padding: 0 16px;
  border: 2px solid #2563EB;
  border-radius: 999px;
  background: #FFFFFF;
  color: #7C3AED;
}

.web-landing__hero {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 820px) minmax(220px, 360px);
  align-items: center;
  min-height: inherit;
  gap: clamp(18px, 3vw, 54px);
  padding: clamp(24px, 4vw, 68px);
}

.web-landing__hero-copy {
  display: grid;
  justify-items: start;
  gap: clamp(10px, 1.25vw, 22px);
}

.web-landing__eyebrow,
.web-landing__section-heading p {
  margin: 0;
  color: #7C3AED;
  font-size: clamp(12px, 1vw, 18px);
  font-weight: 950;
  letter-spacing: 0.18em;
}

.web-landing__title {
  margin: 0;
  word-break: keep-all;
  font-size: clamp(36px, 5.5vw, 106px);
  line-height: 0.93;
  letter-spacing: -0.06em;
  color: #FFFFFF;
  font-family: 'Nanum Myeongjo', serif;
  -webkit-text-stroke: 2px #05070b;
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow: 0 5px 22px rgba(37, 99, 235, 0.16);
}

.web-landing__headline {
  margin: 0;
  max-width: 760px;
  color: #2563EB;
  font-size: clamp(23px, 2.4vw, 46px);
  line-height: 1.08;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.web-landing__support {
  margin: 0;
  max-width: 660px;
  color: #172033;
  font-size: clamp(15px, 1.22vw, 24px);
  line-height: 1.55;
  font-weight: 750;
}

.web-landing__hero-actions {
  gap: 12px;
  flex-wrap: wrap;
  margin-top: clamp(4px, 0.8vw, 12px);
}

.web-landing__cta,
.web-landing__bottom-cta,
.web-landing__mobile-cta,
.web-landing__hero-mini-cta,
.web-landing__comic-link,
.web-landing__music-button {
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 26px;
  border-radius: 999px;
  border: 3px solid #FFFFFF;
  background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
  color: #FFFFFF;
  font-size: clamp(16px, 1.15vw, 22px);
  font-weight: 950;
  text-decoration: none;
  box-shadow: 0 14px 38px rgba(37, 99, 235, 0.28);
  cursor: pointer;
}

.web-landing__ghost-link {
  padding: 0 18px;
  border-radius: 999px;
  border: 2px solid #7C3AED;
  background: rgba(255, 255, 255, 0.9);
  color: #7C3AED;
  font-weight: 900;
}

.web-landing__comic-link {
  min-height: 54px;
  padding: 14px 22px;
  border: 3px solid #16A34A;
  border-radius: 999px;
  background: #FFFFFF;
  color: #16A34A;
  font-size: clamp(16px, 1.15vw, 22px);
  font-weight: 950;
  text-decoration: none;
  box-shadow: 0 12px 28px rgba(22, 163, 74, 0.18);
}

.web-landing__notice,
.web-landing__panel,
.web-landing__fact-card {
  border: 1px solid rgba(37, 99, 235, 0.2);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 54px rgba(23, 32, 51, 0.12);
}

.web-landing__notice {
  display: grid;
  gap: 8px;
  align-self: end;
  padding: 22px;
  border-radius: 22px;
  max-width: 360px;
}

.web-landing__notice strong {
  color: #172033;
  font-size: clamp(18px, 1.5vw, 26px);
}

.web-landing__notice span {
  color: #172033;
  line-height: 1.55;
  font-weight: 750;
}

.web-landing__facts {
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(10px, 1.2vw, 20px);
  list-style: none;
}

.web-landing__fact-card {
  min-height: 70px;
  display: grid;
  place-items: center;
  padding: 14px 16px;
  border-radius: 18px;
  color: #7C3AED;
  font-size: clamp(14px, 1.05vw, 20px);
  font-weight: 900;
  text-align: center;
}

.web-landing__panel {
  scroll-margin-top: 76px;
  border-radius: 24px;
  padding: clamp(18px, 2vw, 32px);
}

.web-landing__panel--wide {
  display: grid;
  gap: 18px;
}

.web-landing__split-panel {
  display: grid;
  grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.28fr);
  gap: clamp(18px, 2.2vw, 36px);
  align-items: start;
}

.web-landing__section-heading {
  display: grid;
  gap: 8px;
}

.web-landing__section-heading h2 {
  margin: 0;
  color: #172033;
  font-size: clamp(26px, 2.2vw, 42px);
  letter-spacing: -0.04em;
}

.web-landing__card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.web-landing__info-card {
  min-height: 170px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(246, 248, 255, 0.94);
  border: 1px solid rgba(124, 58, 237, 0.16);
}

.web-landing__info-card img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin: -6px 0 16px;
  border-radius: 12px;
  object-fit: cover;
}

.web-landing__info-card h3 {
  margin: 0 0 10px;
  color: #172033;
  font-size: clamp(18px, 1.35vw, 24px);
}

.web-landing__info-card p,
.web-landing__step-list,
.web-landing__start-list,
.web-landing__media-intro {
  margin: 0;
  color: #172033;
  font-weight: 750;
  line-height: 1.6;
}

.web-landing__media-intro {
  margin: -2px 0 0;
  max-width: 780px;
}

.web-landing__media-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

#media {
  scroll-margin-top: 76px;
}

.web-landing__media-controls button {
  min-width: 0;
  min-height: 48px;
  padding: 10px 8px;
  border: 2px solid #2563EB;
  border-radius: 12px;
  background: #FFFFFF;
  color: #172033;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.web-landing__media-controls button[aria-pressed="true"] {
  background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
  color: #FFFFFF;
}

.web-landing__media-controls button:focus-visible {
  outline: 4px solid rgba(37, 99, 235, 0.28);
  outline-offset: 3px;
}

.web-landing__media-panel {
  display: grid;
  gap: 20px;
  margin-top: 24px;
  scroll-margin-top: 76px;
}

.web-landing__comic-picker {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-color: #7C3AED #E8ECFF;
}

.web-landing__comic-tab {
  min-height: 46px;
  flex: 0 0 auto;
  padding: 10px 16px;
  border: 2px solid rgba(124, 58, 237, 0.3);
  border-radius: 999px;
  background: #FFFFFF;
  color: #172033;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.web-landing__comic-tab[aria-selected="true"] {
  border-color: #16A34A;
  background: #16A34A;
  color: #FFFFFF;
}

.web-landing__comic-tab:focus-visible {
  outline: 4px solid rgba(37, 99, 235, 0.28);
  outline-offset: 3px;
}

.web-landing__comic-feature {
  display: grid;
  grid-template-columns: minmax(180px, 0.36fr) minmax(0, 1fr);
  width: 100%;
  gap: clamp(18px, 2.4vw, 36px);
  align-items: center;
  padding: clamp(14px, 2vw, 24px);
  border: 3px solid var(--comic-accent, #16A34A);
  border-radius: 20px;
  background: #FFFFFF;
  color: #172033;
  text-decoration: none;
  box-shadow: 0 12px 28px rgba(23, 32, 51, 0.08);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.web-landing__comic-grid {
  display: grid;
  gap: 16px;
}

.web-landing__comic-feature:hover,
.web-landing__comic-feature:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 18px 36px rgba(23, 32, 51, 0.16);
}

.web-landing__comic-thumbnail {
  position: relative;
  height: 136px;
  overflow: hidden;
  border-radius: 12px;
  background: #F6F8FF;
}

.web-landing__comic-thumbnail img {
  display: block;
  width: 100%;
  height: 100%;
  height: 136px;
  object-fit: cover;
  object-position: top;
}

.web-landing__comic-thumbnail span {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--comic-accent, #16A34A);
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 950;
}

.web-landing__comic-copy h3,
.web-landing__music-card h3 {
  margin: 0;
  color: #172033;
  font-size: clamp(22px, 1.8vw, 32px);
}

.web-landing__comic-copy p,
.web-landing__music-card p {
  margin: 12px 0 0;
  color: #172033;
  font-weight: 750;
  line-height: 1.6;
}

.web-landing__comic-action {
  display: inline-flex;
  gap: 8px;
  margin-top: 18px;
  color: var(--comic-accent, #16A34A);
  font-weight: 950;
}

.web-landing__comic-action span {
  transition: transform 180ms ease;
}

.web-landing__comic-feature:hover .web-landing__comic-action span,
.web-landing__comic-feature:focus-visible .web-landing__comic-action span {
  transform: translateX(4px);
}

.web-landing__comic-viewer-backdrop {
  position: fixed;
  z-index: 30;
  inset: 0;
  display: grid;
  place-items: center;
  padding: clamp(16px, 3vw, 40px);
  background: rgba(5, 7, 11, 0.78);
}

.web-landing__comic-viewer {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(100%, 920px);
  max-height: min(92dvh, 980px);
  overflow: hidden;
  border: 3px solid #FFFFFF;
  border-radius: 20px;
  background: #F6F8FF;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.38);
}

.web-landing__comic-viewer-header,
.web-landing__comic-viewer-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
}

.web-landing__comic-viewer-header {
  border-bottom: 1px solid rgba(37, 99, 235, 0.2);
}

.web-landing__comic-viewer-header h2,
.web-landing__comic-viewer-controls span {
  margin: 0;
  color: #172033;
  font-size: clamp(16px, 2vw, 24px);
  font-weight: 950;
}

.web-landing__comic-viewer img {
  display: block;
  width: 100%;
  max-height: calc(min(92dvh, 980px) - 136px);
  object-fit: contain;
  background: #FFFFFF;
}

.web-landing__comic-viewer-controls {
  border-top: 1px solid rgba(37, 99, 235, 0.2);
}

.web-landing__comic-viewer button {
  min-height: 42px;
  padding: 9px 14px;
  border: 2px solid #2563EB;
  border-radius: 999px;
  background: #FFFFFF;
  color: #172033;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.web-landing__music-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 22px;
  align-items: center;
  padding: clamp(18px, 2.4vw, 32px);
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 20px;
  background: linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 100%);
}

.web-landing__music-card audio {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.web-landing__music-status {
  grid-column: 1 / -1;
  margin: 0;
  color: #2563EB;
  font-weight: 900;
}

.web-landing__video-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.web-landing__video-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(37, 99, 235, 0.2);
  background: #FFFFFF;
}

.web-landing__video-card div {
  min-height: 160px;
  border-radius: 14px;
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(124, 58, 237, 0.18);
}

.web-landing__video-card h3,
.web-landing__video-card p {
  margin: 0;
}

.web-landing__video-card h3 {
  color: #172033;
  font-size: clamp(18px, 1.35vw, 24px);
}

.web-landing__video-card p {
  color: #172033;
  font-weight: 750;
  line-height: 1.55;
}

.web-landing__step-list,
.web-landing__start-list {
  display: grid;
  gap: 12px;
  padding-left: 1.3em;
}

.web-landing__start-list {
  list-style: none;
  padding-left: 0;
}

.web-landing__bottom-cta {
  justify-self: start;
  margin-top: 6px;
}

.web-landing__gallery {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.web-landing__gallery-item {
  min-height: 170px;
  border-radius: 16px;
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(37, 99, 235, 0.24);
}

.web-landing__news-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.web-landing__news-card {
  min-height: 146px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(246, 248, 255, 0.94);
  border: 1px solid rgba(124, 58, 237, 0.16);
}

.web-landing__news-card h3,
.web-landing__news-card p {
  margin: 0;
}

.web-landing__news-card h3 {
  color: #172033;
  font-size: clamp(18px, 1.35vw, 24px);
}

.web-landing__news-card p {
  margin-top: 10px;
  color: #172033;
  font-weight: 750;
  line-height: 1.55;
}

.web-landing__final-cta {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: clamp(34px, 6vw, 80px) 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
  text-align: center;
}

.web-landing__final-cta p,
.web-landing__final-cta h2 {
  margin: 0;
}

.web-landing__final-cta p {
  color: #FFFFFF;
  font-weight: 900;
}

.web-landing__final-cta h2 {
  color: #FFFFFF;
  font-size: clamp(30px, 3vw, 56px);
  letter-spacing: -0.05em;
}

.web-landing__footer {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 0 76px;
  color: #172033;
  font-size: 13px;
  font-weight: 700;
}

.web-landing__mobile-sticky-cta {
  display: none;
}

.web-landing__link {
  outline: 4px solid transparent;
  outline-offset: 4px;
}

.web-landing__link:focus-visible {
  outline-color: #7C3AED;
  box-shadow: 0 0 0 7px rgba(37, 99, 235, 0.22), 0 14px 38px rgba(124, 58, 237, 0.2);
}

@keyframes web-landing-reveal {
  from {
    opacity: 0;
    transform: translateY(42px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .web-landing [data-reveal] {
      animation: web-landing-reveal linear both;
      animation-timeline: view();
      animation-range: entry 10% cover 30%;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .web-landing [data-reveal],
  .web-landing__comic-feature,
  .web-landing__comic-action span {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}

@media (max-width: 980px) {
  .web-landing__content {
    grid-template-rows: auto auto auto auto auto auto;
  }

  .web-landing__hero,
  .web-landing__split-panel,
  .web-landing__music-card {
    grid-template-columns: 1fr;
  }

  .web-landing__comic-feature {
    grid-template-columns: minmax(160px, 0.36fr) minmax(0, 1fr);
  }

  .web-landing__notice {
    max-width: none;
  }

  .web-landing__card-grid {
    grid-template-columns: 1fr;
  }

  .web-landing__gallery,
  .web-landing__news-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .web-landing {
    overflow: auto;
  }

  .web-landing__stage {
    width: 100vw !important;
    min-height: 100dvh;
    max-height: none !important;
    aspect-ratio: auto !important;
    overflow-y: auto !important;
  }

  .web-landing__content {
    height: auto;
    min-height: 100dvh;
    padding: max(18px, env(safe-area-inset-top)) 16px max(22px, env(safe-area-inset-bottom));
    gap: 18px;
  }

  .web-landing__nav {
    align-items: flex-start;
    flex-direction: column;
  }

  .web-landing__nav-links,
  .web-landing__hero-actions,
  .web-landing__facts {
    width: 100%;
  }

  .web-landing__nav-links {
    justify-content: flex-start;
  }

  .web-landing__nav-link,
  .web-landing__nav-cta,
  .web-landing__cta,
  .web-landing__ghost-link,
  .web-landing__bottom-cta,
  .web-landing__comic-link {
    min-height: 44px;
  }

  .web-landing__nav-cta,
  .web-landing__cta,
  .web-landing__ghost-link,
  .web-landing__bottom-cta,
  .web-landing__comic-link {
    width: 100%;
  }

  .web-landing__nav-cta {
    border-color: rgba(37, 99, 235, 0.45);
    background: transparent;
    color: #2563EB;
  }

  .web-landing__title {
    white-space: normal;
    font-size: clamp(42px, 15vw, 68px);
  }

  .web-landing__hero-shell {
    min-height: 620px;
  }

  .web-landing__facts {
    grid-template-columns: 1fr;
  }

  .web-landing__gallery,
  .web-landing__news-grid {
    grid-template-columns: 1fr;
  }

  .web-landing__footer {
    padding-bottom: 78px;
    flex-direction: column;
  }

  .web-landing__mobile-sticky-cta {
    position: fixed;
    z-index: 10;
    right: 16px;
    bottom: max(16px, env(safe-area-inset-bottom));
    left: 16px;
    min-height: 54px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 3px solid #FFFFFF;
    border-radius: 999px;
    background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
    color: #FFFFFF;
    font-weight: 950;
    text-decoration: none;
    box-shadow: 0 14px 38px rgba(37, 99, 235, 0.28);
  cursor: pointer;
  }

  .web-landing__scene-layer {
    opacity: 0.38 !important;
  }

  .web-landing__comic-feature {
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 14px;
  }

  .web-landing__comic-thumbnail,
  .web-landing__comic-thumbnail img {
    height: 96px;
  }

  .web-landing__comic-viewer-backdrop {
    padding: 10px;
  }

  .web-landing__comic-viewer-header,
  .web-landing__comic-viewer-controls {
    padding: 10px 12px;
  }

  .web-landing__comic-viewer-controls button {
    padding: 8px 10px;
  }
}

@media (max-width: 600px) {
  .web-landing__media-controls {
    gap: 6px;
  }

  .web-landing__media-controls button {
    min-height: 44px;
    padding: 8px 4px;
    font-size: 13px;
    white-space: nowrap;
  }

  .web-landing__comic-feature {
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
  }

  .web-landing__comic-copy h3 {
    font-size: 16px;
    line-height: 1.2;
  }

  .web-landing__comic-copy p {
    display: none;
  }

  .web-landing__comic-action {
    margin-top: 8px;
    color: var(--comic-accent, #16A34A);
    font-size: 14px;
    white-space: nowrap;
  }
}
`
