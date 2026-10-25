// 탈출! 좀비학교 4컷 만화 뷰어 — 게임 코드/번들 의존 없음. 데이터: comics/episodes.json
(() => {
  'use strict'

  const LANGS = ['ko', 'en', 'ja', 'vi']
  const list = document.getElementById('comic-list')
  const select = document.getElementById('language-select')
  const viewer = document.getElementById('viewer')
  const viewerTitle = document.getElementById('viewer-title')
  const viewerImage = document.getElementById('viewer-image')
  const viewerCount = document.getElementById('viewer-count')
  let data = null
  let lang = 'ko'
  let current = -1

  function pickInitialLanguage() {
    const fromQuery = new URLSearchParams(location.search).get('lang')
    if (LANGS.includes(fromQuery)) return fromQuery
    const fromHash = location.hash.match(/^#(ko|en|ja|vi)\//)
    if (fromHash) return fromHash[1]
    const browser = (navigator.language || 'ko').slice(0, 2).toLowerCase()
    return LANGS.includes(browser) ? browser : 'ko'
  }

  function episodeLabel(number) {
    const suffix = data.ui[lang].episodeSuffix
    return lang === 'ko' || lang === 'ja' ? `${number}${suffix}` : `${suffix} ${number}`
  }

  function applyUi() {
    const ui = data.ui[lang]
    document.documentElement.lang = lang
    document.title = `${ui.title} · ${ui.label}`
    document.querySelectorAll('[data-ui]').forEach((node) => {
      const value = ui[node.dataset.ui]
      if (value) node.textContent = value
    })
    select.setAttribute('aria-label', ui.languageLabel)
    list.setAttribute('aria-label', ui.list)
    viewer.querySelector('[data-action="close"]').textContent = ui.close
    viewer.querySelector('[data-action="close"]').setAttribute('aria-label', ui.closeViewer)
    viewer.querySelector('[data-action="prev"]').textContent = ui.previous
    viewer.querySelector('[data-action="next"]').textContent = ui.next
    viewer.querySelector('.viewer-controls').setAttribute('aria-label', ui.comicNavigation)
  }

  function renderList() {
    const fragment = document.createDocumentFragment()
    data.episodes.forEach((episode, index) => {
      const item = document.createElement('li')
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'comic-card'
      button.dataset.index = String(index)
      const image = document.createElement('img')
      image.src = `comics/thumbs/${episode.thumb[lang]}`
      image.width = 400
      image.height = 300
      image.loading = index < 4 ? 'eager' : 'lazy'
      image.decoding = 'async'
      image.alt = ''
      const copy = document.createElement('span')
      copy.className = 'copy'
      const badge = document.createElement('span')
      badge.className = 'episode'
      badge.textContent = episodeLabel(episode.number)
      const title = document.createElement('span')
      title.className = 'title'
      title.textContent = episode.title[lang]
      const summary = document.createElement('span')
      summary.className = 'summary'
      summary.textContent = episode.summary[lang]
      copy.append(badge, title, summary)
      button.append(image, copy)
      button.setAttribute('aria-label', `${episodeLabel(episode.number)} ${episode.title[lang]} — ${data.ui[lang].openComic}`)
      item.append(button)
      fragment.append(item)
    })
    list.replaceChildren(fragment)
  }

  function show(index) {
    const total = data.episodes.length
    current = (index + total) % total
    const episode = data.episodes[current]
    viewerTitle.textContent = `${episodeLabel(episode.number)} · ${episode.title[lang]}`
    viewerImage.src = `comics/full/${episode.image[lang]}`
    viewerImage.width = episode.width
    viewerImage.height = episode.height
    viewerImage.alt = episode.title[lang]
    viewerCount.textContent = `${current + 1} / ${total}`
    viewer.querySelector('.viewer-body').scrollTop = 0
    history.replaceState(null, '', `#${lang}/${String(episode.number).padStart(2, '0')}`)
    if (!viewer.open) viewer.showModal()
  }

  function close() {
    if (viewer.open) viewer.close()
  }

  function setLanguage(next) {
    lang = next
    select.value = lang
    applyUi()
    renderList()
    if (viewer.open) show(current)
  }

  list.addEventListener('click', (event) => {
    const card = event.target.closest('.comic-card')
    if (card) show(Number(card.dataset.index))
  })
  select.addEventListener('change', () => setLanguage(select.value))
  viewer.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action
    if (action === 'close') close()
    else if (action === 'prev') show(current - 1)
    else if (action === 'next') show(current + 1)
    else if (event.target === viewer) close() // backdrop 클릭
  })
  viewer.addEventListener('close', () => {
    history.replaceState(null, '', location.pathname + location.search)
  })
  document.addEventListener('keydown', (event) => {
    if (!viewer.open) return
    if (event.key === 'ArrowLeft') show(current - 1)
    if (event.key === 'ArrowRight') show(current + 1)
  })

  fetch('comics/episodes.json')
    .then((response) => {
      if (!response.ok) throw new Error(`episodes.json HTTP ${response.status}`)
      return response.json()
    })
    .then((json) => {
      data = json
      select.replaceChildren(...data.languages.map(({ code, label }) => new Option(label, code)))
      setLanguage(pickInitialLanguage())
      const deepLink = location.hash.match(/^#(?:ko|en|ja|vi)\/(\d{2})$/)
      if (deepLink) {
        const index = data.episodes.findIndex((episode) => episode.number === Number(deepLink[1]))
        if (index >= 0) show(index)
      }
    })
    .catch((error) => {
      list.textContent = '만화 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
      console.warn(error)
    })
})()
