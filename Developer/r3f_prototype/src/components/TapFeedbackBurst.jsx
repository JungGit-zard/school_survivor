import { useEffect, useRef } from 'react'
import { loadTitleSettings, vibrateFeedback } from '../lib/titleSettings.js'

const COLORS = ['#fff7ad', '#ffd6e8', '#ffc6ff', '#c7f9ff', '#caffbf']
const MAX_PARTICLES = 96
const DPR_CAP = 1.5
const MIN_CLICK_INTERVAL_MS = 45
const GRAVITY = 190
const TARGET_SELECTOR = 'button, a[href], [role="button"]'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
}

function effectsAreReducedBySetting() {
  if (document.documentElement.dataset.reducedEffects === 'true') return true
  try { return loadTitleSettings().reducedEffects === true } catch { return false }
}

function isDisabledTarget(target) {
  if (!(target instanceof Element)) return true
  const button = target.closest(TARGET_SELECTOR)
  if (!button) return true
  if (button.closest('[data-fx="none"]')) return true
  if (button.closest('[disabled], [aria-disabled="true"], .cursor-not-allowed')) return true
  const label = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`.trim()
  if (/^(×|닫기|취소|cancel|close)$/i.test(label)) return true
  return false
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function drawStar(ctx, x, y, outer, rotation) {
  const inner = outer * 0.46
  ctx.beginPath()
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = rotation - Math.PI / 2 + i * Math.PI / 5
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

export default function TapFeedbackBurst() {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const frameRef = useRef(0)
  const lastFrameMsRef = useRef(0)
  const lastClickMsRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      const w = Math.max(1, Math.floor(window.innerWidth * dpr))
      const h = Math.max(1, Math.floor(window.innerHeight * dpr))
      const size = sizeRef.current
      if (size.w === w && size.h === h && size.dpr === dpr) return
      sizeRef.current = { w, h, dpr }
      canvas.width = w
      canvas.height = h
      canvas.style.width = '100vw'
      canvas.style.height = '100vh'
    }

    function draw(now) {
      resizeCanvas()
      const ctx = (() => {
        try { return canvas.getContext?.('2d') ?? null } catch { return null }
      })()
      if (!ctx) {
        particlesRef.current = []
        cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
        return
      }
      const size = sizeRef.current
      const last = lastFrameMsRef.current || now
      const dt = Math.min(0.034, Math.max(0.001, (now - last) / 1000))
      lastFrameMsRef.current = now
      ctx.clearRect(0, 0, size.w, size.h)
      ctx.save()
      ctx.scale(size.dpr, size.dpr)
      ctx.globalCompositeOperation = 'lighter'

      const next = []
      for (const p of particlesRef.current) {
        p.age += dt
        if (p.age >= p.ttl) continue
        p.vy += GRAVITY * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.spin * dt
        const t = p.age / p.ttl
        const alpha = Math.max(0, (1 - t) * 0.9)
        if (p.kind === 'ring') {
          ctx.globalAlpha = alpha * p.alpha
          ctx.strokeStyle = p.color
          ctx.lineWidth = p.width
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r + t * p.spread, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.globalAlpha = alpha
          ctx.fillStyle = p.color
          drawStar(ctx, p.x, p.y, p.r * (1 - t * 0.35), p.rot)
          ctx.fill()
        }
        next.push(p)
      }
      ctx.restore()
      particlesRef.current = next
      if (next.length === 0) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
        lastFrameMsRef.current = 0
        return
      }
      frameRef.current = requestAnimationFrame(draw)
    }

    function startLoop() {
      if (frameRef.current !== 0) return
      frameRef.current = requestAnimationFrame(draw)
    }

    function burstAt(x, y, count = 9) {
      if (prefersReducedMotion() || effectsAreReducedBySetting()) return
      const particles = particlesRef.current
      particles.push(
        { kind: 'ring', x, y, vx: 0, vy: 0, r: 7, spread: 46, width: 2, alpha: 0.55, rot: 0, spin: 0, age: 0, ttl: 0.34, color: '#ffffff' },
        { kind: 'ring', x, y, vx: 0, vy: 0, r: 3, spread: 26, width: 1.3, alpha: 0.32, rot: 0, spin: 0, age: 0, ttl: 0.24, color: '#ffd6e8' },
      )
      for (let i = 0; i < count; i += 1) {
        const angle = rand(-Math.PI, Math.PI)
        const speed = rand(190, 360)
        particles.push({
          kind: 'star',
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(45, 115),
          r: rand(4.2, 7.4),
          rot: rand(0, Math.PI * 2),
          spin: rand(-8, 8),
          age: 0,
          ttl: rand(0.42, 0.68),
          color: COLORS[i % COLORS.length],
        })
      }
      if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES)
      vibrateFeedback(10)
      startLoop()
    }

    function handleClick(event) {
      if (event.detail === 0) return
      if (isDisabledTarget(event.target)) return
      const now = performance.now()
      if (now - lastClickMsRef.current < MIN_CLICK_INTERVAL_MS) return
      lastClickMsRef.current = now
      burstAt(event.clientX, event.clientY)
    }

    function handleCustom(event) {
      const detail = event.detail || {}
      const x = Number.isFinite(detail.x) ? detail.x : window.innerWidth / 2
      const y = Number.isFinite(detail.y) ? detail.y : window.innerHeight / 2
      burstAt(x, y, Number.isFinite(detail.count) ? Math.max(1, Math.min(14, detail.count)) : 9)
    }

    resizeCanvas()
    document.addEventListener('click', handleClick, true)
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('fx:tap-burst', handleCustom)
    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('fx:tap-burst', handleCustom)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      particlesRef.current = []
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="tap-feedback-burst"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 60,
        contain: 'strict',
      }}
    />
  )
}
