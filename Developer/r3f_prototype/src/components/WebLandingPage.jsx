import { useEffect, useRef, useState } from 'react'
import TitleSceneCanvas from './TitleSceneCanvas.jsx'
import '../assets/fonts/nanumMyeongjo.css'
import { WEB_BACKGROUND_URLS, WEB_LANDING_ART_URLS, WEB_LANDING_COMIC_URLS, getSelectedWebBackgroundStyle } from '../lib/webBackgroundAssets.js'
import { LANDING_COPY, LANDING_LANGUAGES } from './webLandingCopy.js'

export const LANDING_HERO_VIDEO_URL = ''
export const LANDING_FEATURE_VIDEO_URL = ''

const TITLE_BGM_URL = new URL('../assets/audio/title_bgm.m4a', import.meta.url).href

const COMIC_EPISODES = [
  {
    id: 'attendance',
    image: WEB_LANDING_COMIC_URLS.attendance,
    accent: '#16A34A',
  },
  {
    id: 'lunch-line',
    image: WEB_LANDING_COMIC_URLS.lunchLine,
    accent: '#2563EB',
  },
  {
    id: 'homework-wind',
    image: WEB_LANDING_COMIC_URLS.homeworkWind,
    accent: '#7C3AED',
  },
  {
    id: 'gym-bounce',
    image: WEB_LANDING_COMIC_URLS.gymBounce,
    accent: '#16A34A',
  },
  {
    id: 'library-quiet',
    image: WEB_LANDING_COMIC_URLS.libraryQuiet,
    accent: '#2563EB',
  },
]

const VIDEO_PLACEHOLDERS = WEB_BACKGROUND_URLS.slice(0, 3)
const GAMEPLAY_IMAGES = [WEB_LANDING_ART_URLS.classroomSurvival, WEB_LANDING_ART_URLS.schoolSupplies, WEB_LANDING_ART_URLS.sunsetEscape]

export default function WebLandingPage() {
  const [language, setLanguage] = useState('ko')
  const copy = LANDING_COPY[language]
  const [activeMedia, setActiveMedia] = useState(null)
  const [mediaScrollRequest, setMediaScrollRequest] = useState(0)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [musicStatus, setMusicStatus] = useState('musicIdle')
  const [selectedComicIndex, setSelectedComicIndex] = useState(null)
  const audioRef = useRef(null)
  const heroActionsRef = useRef(null)
  const [heroActionsPassed, setHeroActionsPassed] = useState(false)
  const selectedComic = selectedComicIndex === null ? null : { ...COMIC_EPISODES[selectedComicIndex], ...copy.comics[selectedComicIndex] }

  useEffect(() => {
    const previousLanguage = document.documentElement.lang
    return () => { document.documentElement.lang = previousLanguage }
  }, [])

  useEffect(() => { document.documentElement.lang = language }, [language])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => {
      setHeroActionsPassed(!entry.isIntersecting && entry.boundingClientRect.bottom < 0)
    })
    observer.observe(heroActionsRef.current)
    return () => observer.disconnect()
  }, [])

  const selectMedia = (media, shouldScrollToToolbar = false) => {
    if (media !== 'music' && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsMusicPlaying(false)
      setMusicStatus('musicIdle')
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
      setMusicStatus('musicPaused')
      return
    }

    try {
      await audio.play()
      setIsMusicPlaying(true)
      setMusicStatus('musicPlaying')
    } catch {
      setIsMusicPlaying(false)
      setMusicStatus('musicBlocked')
    }
  }

  return (
    <main className="web-landing" style={styles.viewport} aria-label={copy.homeAria} lang={language}>
      <style>{landingCss}</style>
      <a className="web-landing__skip-link" href="#game-intro">{copy.skip}</a>
      <section
        data-testid="web-landing-stage"
        className="web-landing__stage"
        style={{
          ...styles.stage,
          ...getSelectedWebBackgroundStyle(),
        }}
      >
        <div className="web-landing__content">
          <nav aria-label={copy.navigation} className="web-landing__nav">
            <a href="/" className="web-landing__brand web-landing__link" aria-label={copy.brandHome}>
              <span className="web-landing__brand-mark">!</span>
              <span>{copy.official}</span>
            </a>
            <div className="web-landing__nav-links">
              <a href="#game-intro" className="web-landing__nav-link web-landing__link">{copy.intro}</a>
              <a href="#section-start" className="web-landing__nav-link web-landing__link">{copy.howTo}</a>
              <a href="#comics" className="web-landing__nav-link web-landing__link" onClick={openMediaLink('comics')}>{copy.comicNav}</a>
              <a href="#music" className="web-landing__nav-link web-landing__link" onClick={openMediaLink('music')}>{copy.musicNav}</a>
              <a href="#videos" className="web-landing__nav-link web-landing__link" onClick={openMediaLink('videos')}>{copy.videoNav}</a>
              <a href="#news" className="web-landing__nav-link web-landing__link">{copy.news}</a>
              <a href="/game" className="web-landing__nav-cta web-landing__link">{copy.startGame}</a>
            </div>
            <label className="web-landing__language">
              <span className="web-landing__visually-hidden">{copy.languageLabel}</span>
              <select id="web-landing-language" aria-label={copy.languageLabel} value={language} onChange={(event) => setLanguage(event.target.value)}>
                {LANDING_LANGUAGES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
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
                <p className="web-landing__eyebrow">{copy.eyebrow}</p>
                <h1 id="landing-title" className="web-landing__title">{copy.title}</h1>
                <p className="web-landing__headline">{copy.headline}</p>
                <p className="web-landing__support">{copy.support}</p>
                <div ref={heroActionsRef} className="web-landing__hero-actions" aria-label={copy.mainActions}>
                  <a href="/game" className="web-landing__cta web-landing__link">{copy.playWeb}</a>
                  <a href="#section-start" className="web-landing__ghost-link web-landing__link">{copy.howToLink}</a>
                  <a href="#comics" className="web-landing__comic-link web-landing__link" onClick={openMediaLink('comics')}>{copy.comicNav}</a>
                </div>
              </div>

              <aside className="web-landing__notice" aria-label={copy.officialNotice}>
                <strong>{copy.official}</strong>
                <span>{copy.notice}</span>
              </aside>
            </div>
          </section>

          <ul aria-label={copy.factsAria} className="web-landing__facts">
            {copy.facts.map((fact) => (
              <li key={fact} className="web-landing__fact-card">{fact}</li>
            ))}
          </ul>

          <section id="game-intro" aria-labelledby="section-gameplay-title" className="web-landing__panel web-landing__panel--wide" data-reveal>
            <div className="web-landing__section-heading">
              <p>{copy.gameplayLabel}</p>
              <h2 id="section-gameplay-title">{copy.intro}</h2>
            </div>
            <div className="web-landing__card-grid">
              {copy.gameplay.map((card, index) => (
                <article key={card.title} className="web-landing__info-card">
                  <img src={GAMEPLAY_IMAGES[index]} loading="lazy" decoding="async" alt="" />
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="section-survival" aria-labelledby="section-survival-title" className="web-landing__panel web-landing__split-panel" data-reveal>
            <div className="web-landing__section-heading">
              <p>{copy.survivalLabel}</p>
              <h2 id="section-survival-title">{copy.survivalTitle}</h2>
            </div>
            <ol className="web-landing__step-list">
              {copy.survival.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section id="section-start" aria-labelledby="section-start-title" className="web-landing__panel web-landing__split-panel" data-reveal>
            <div className="web-landing__section-heading">
              <p>{copy.guideLabel}</p>
              <h2 id="section-start-title">{copy.howTo}</h2>
            </div>
            <ol className="web-landing__start-list">
              {copy.guide.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <a href="/game" className="web-landing__bottom-cta web-landing__link">{copy.guideCta}</a>
          </section>

          <section id="media" aria-labelledby="section-media-controls-title" className="web-landing__panel web-landing__panel--wide" data-reveal>
            <div className="web-landing__section-heading">
              <p>{copy.mediaLabel}</p>
              <h2 id="section-media-controls-title">{copy.mediaTitle}</h2>
            </div>
            <div className="web-landing__media-controls" aria-label={copy.mediaControls}>
              <button type="button" aria-pressed={activeMedia === 'comics'} onClick={() => selectMedia('comics')}>{copy.comicButton}</button>
              <button type="button" aria-pressed={activeMedia === 'music'} onClick={() => selectMedia('music')}>{copy.musicButton}</button>
              <button type="button" aria-pressed={activeMedia === 'videos'} onClick={() => selectMedia('videos')}>{copy.videoButton}</button>
            </div>

            {activeMedia === 'comics' ? (
              <section id="comics" aria-labelledby="section-comics-title" className="web-landing__media-panel">
                <div className="web-landing__section-heading">
                  <p>{copy.comicsLabel}</p>
                  <h2 id="section-comics-title">{copy.comicsTitle}</h2>
                </div>
                <p className="web-landing__media-intro">{copy.comicsIntro}</p>
                <div className="web-landing__comic-grid" aria-label={copy.comicsList}>
                  {COMIC_EPISODES.map((comic, index) => (
                    <a key={comic.id} className="web-landing__comic-feature" style={{ '--comic-accent': comic.accent }} href={comic.image} target="_blank" rel="noreferrer" aria-label={`${copy.comics[index].title} ${copy.openComicAria}`} onClick={(event) => { event.preventDefault(); setSelectedComicIndex(index) }}>
                      <div className="web-landing__comic-thumbnail"><img src={comic.image} loading="lazy" decoding="async" alt={`${copy.comics[index].title} ${copy.thumbnail}`} /><span>{language === 'ko' || language === 'ja' ? `${index + 1}${copy.episodeSuffix}` : `${copy.episodeSuffix} ${index + 1}`}</span></div>
                      <div className="web-landing__comic-copy"><h3>{copy.comics[index].title}</h3><p>{copy.comics[index].summary}</p><span className="web-landing__comic-action">{copy.openComic} <span aria-hidden="true">→</span></span></div>
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
                  <button type="button" onClick={() => setSelectedComicIndex(null)} aria-label={copy.closeViewer}>{copy.close}</button>
                </div>
                <img src={selectedComic.image} alt={`${selectedComic.title} ${copy.fullComic}`} />
                <div className="web-landing__comic-viewer-controls" aria-label={copy.comicNavigation}>
                  <button type="button" onClick={() => setSelectedComicIndex((index) => (index + COMIC_EPISODES.length - 1) % COMIC_EPISODES.length)}>{copy.previous}</button>
                  <span>{selectedComicIndex + 1} / {COMIC_EPISODES.length}</span>
                  <button type="button" onClick={() => setSelectedComicIndex((index) => (index + 1) % COMIC_EPISODES.length)}>{copy.next}</button>
                </div>
              </section>
            </div>
          ) : null}

          {activeMedia === 'music' ? (
          <section id="music" aria-labelledby="section-music-title" className="web-landing__media-panel">
            <div className="web-landing__section-heading">
              <p>{copy.musicLabel}</p>
              <h2 id="section-music-title">{copy.musicButton}</h2>
            </div>
            <div className="web-landing__music-card">
              <div>
                <h3>{copy.musicTitle}</h3>
                <p>{copy.musicDescription}</p>
              </div>
              <button
                type="button"
                className="web-landing__music-button"
                aria-pressed={isMusicPlaying}
                aria-describedby="music-status"
                onClick={toggleMusic}
              >
                {isMusicPlaying ? copy.pause : copy.play}
              </button>
              <audio
                ref={audioRef}
                src={TITLE_BGM_URL}
                preload="metadata"
                aria-label={copy.musicPlayer}
                onPause={() => setIsMusicPlaying(false)}
                onEnded={() => {
                  setIsMusicPlaying(false)
                  setMusicStatus('musicEnded')
                }}
              >
                <source src={TITLE_BGM_URL} type="audio/mp4" />
              </audio>
              <p id="music-status" className="web-landing__music-status" aria-live="polite">{copy[musicStatus]}</p>
            </div>
          </section>
          ) : null}

          {activeMedia === 'videos' ? (
          <section id="videos" aria-labelledby="section-video-title" className="web-landing__media-panel">
            <div className="web-landing__section-heading">
              <p>{copy.videoLabel}</p>
              <h2 id="section-video-title">{copy.videoButton}</h2>
            </div>
            <p className="web-landing__media-intro"><strong>{copy.noVideo}</strong> · {copy.videoIntro}</p>
            <div className="web-landing__video-grid">
              {VIDEO_PLACEHOLDERS.map((image, index) => (
                <article key={image} className="web-landing__video-card">
                  <div style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
                  <h3>{copy.videos[index]}</h3>
                  <p>{copy.videoFuture}</p>
                </article>
              ))}
            </div>
            {LANDING_FEATURE_VIDEO_URL ? <p className="web-landing__media-intro">{copy.videoActive}</p> : null}
          </section>
          ) : null}
          </section>

          <section aria-labelledby="section-media-title" className="web-landing__panel web-landing__panel--wide" data-reveal>
            <div className="web-landing__section-heading">
              <p>{copy.galleryLabel}</p>
              <h2 id="section-media-title">{copy.galleryTitle}</h2>
            </div>
            <div className="web-landing__gallery" aria-label={copy.galleryAria}>
              {WEB_BACKGROUND_URLS.map((url) => (
                <div
                  key={url}
                  className="web-landing__gallery-item"
                  style={{ backgroundImage: `url(${url})` }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <a href="/game" className="web-landing__bottom-cta web-landing__link">{copy.galleryCta}</a>
          </section>

          <section id="news" aria-labelledby="section-news-title" className="web-landing__panel web-landing__panel--wide" data-reveal>
            <div className="web-landing__section-heading">
              <p>{copy.newsLabel}</p>
              <h2 id="section-news-title">{copy.news}</h2>
            </div>
            <div className="web-landing__news-grid">
              {copy.newsItems.map(([title, body]) => (
                <article key={title} className="web-landing__news-card">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={copy.finalAria} className="web-landing__final-cta" data-reveal>
            <p>{copy.finalEyebrow}</p>
            <h2>{copy.finalTitle}</h2>
            <a href="/game" className="web-landing__cta web-landing__link">{copy.startGame}</a>
          </section>

          <footer className="web-landing__footer">
            <span>{copy.footerBrand}</span>
            <span>{copy.footer}</span>
          </footer>
        </div>
      </section>
      {heroActionsPassed && !selectedComic ? <a href="/game" className="web-landing__mobile-sticky-cta web-landing__link">{copy.startGame}</a> : null}
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
    opacity: 1,
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
    background: 'linear-gradient(90deg, #F6F8FF 0%, rgba(246, 248, 255, 0.96) 36%, rgba(246, 248, 255, 0.25) 68%, rgba(246, 248, 255, 0.06) 100%)',
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
  min-height: clamp(350px, 58vh, 500px);
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
  align-content: start;
  gap: clamp(16px, 1.6vw, 26px);
  padding: clamp(16px, 2vw, 36px);
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
  gap: 12px;
  flex-wrap: wrap;
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
  flex: 1 1 auto;
}

.web-landing__language {
  flex: 0 0 auto;
  margin-left: auto;
}

.web-landing__language select {
  min-height: 44px;
  max-width: 150px;
  padding: 0 30px 0 12px;
  border: 2px solid #2563EB;
  border-radius: 12px;
  background: #FFFFFF;
  color: #172033;
  font: inherit;
  cursor: pointer;
}

.web-landing__language select:focus-visible {
  outline: 3px solid #7C3AED;
  outline-offset: 2px;
}

.web-landing__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
  grid-template-columns: minmax(0, 1.35fr) minmax(180px, 0.65fr);
  align-items: center;
  min-height: inherit;
  gap: 24px;
  padding: clamp(22px, 2.4vw, 38px);
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
  font-size: clamp(36px, 4.7vw, 82px);
  line-height: 0.93;
  letter-spacing: -0.06em;
  color: #FFFFFF;
  font-family: 'Nanum Myeongjo', serif;
  -webkit-text-stroke: 2px #05070b;
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow: 0 5px 22px rgba(37, 99, 235, 0.16);
}

.web-landing:lang(en) .web-landing__title,
.web-landing:lang(ja) .web-landing__title,
.web-landing:lang(vi) .web-landing__title {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.05;
  font-size: clamp(32px, 3.8vw, 68px);
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

.web-landing__hero-actions .web-landing__comic-link {
  min-height: 44px;
  padding: 8px 16px;
  border-width: 2px;
  box-shadow: none;
}

.web-landing__cta,
.web-landing__bottom-cta,
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
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 8px;
    background: rgba(246, 248, 255, 0.96);
    border-radius: 16px;
    padding: 6px 10px;
  }

  .web-landing__language {
    grid-column: 2;
    grid-row: 1;
  }

  .web-landing__nav-links {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .web-landing [id] {
    scroll-margin-top: 132px;
  }

  .web-landing__nav-links,
  .web-landing__hero-actions,
  .web-landing__facts {
    width: 100%;
  }

  .web-landing__nav-links {
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 12px;
    padding: 4px;
  }

  .web-landing__nav-link {
    flex: 0 0 auto;
    min-width: 44px;
    white-space: nowrap;
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
    display: none;
  }

  .web-landing__title {
    white-space: normal;
    font-size: clamp(38px, 11vw, 52px);
    line-height: 1.05;
  }

  .web-landing__hero-shell {
    min-height: 0;
  }

  .web-landing__hero {
    padding: 24px 20px;
    gap: 22px;
  }

  .web-landing__hero-copy {
    gap: 12px;
  }

  .web-landing__hero-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .web-landing__hero-actions .web-landing__cta {
    grid-column: 1 / -1;
  }

  .web-landing__hero-actions .web-landing__ghost-link,
  .web-landing__hero-actions .web-landing__comic-link {
    font-size: 14px;
    padding: 8px;
    text-align: center;
  }

  .web-landing__notice {
    padding: 16px;
  }

  .web-landing__hero-scrim {
    background: linear-gradient(180deg, #F6F8FF 0%, rgba(246, 248, 255, 0.96) 45%, rgba(246, 248, 255, 0.25) 100%) !important;
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
