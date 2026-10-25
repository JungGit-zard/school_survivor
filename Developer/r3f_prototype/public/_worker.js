// Cloudflare Pages advanced-mode Worker (escapezombie.com). Owner: backendmini. 2026-10-25.
//
// _routes.json sends ONLY /__/* here; every other path is served as a static asset with
// _headers/_redirects applied, so normal traffic never spends Workers requests.
//
// Why: src/lib/firebaseAuth.js pins authDomain to escapezombie.com (same-origin auth helper,
// needed for TWA/Chrome third-party storage partitioning). Firebase Hosting used to answer the
// reserved /__/auth/* and /__/firebase/* paths; Cloudflare Pages SPA fallback returned the game
// index.html instead, so the sign-in iframe/redirect booted a second copy of the game.
// Fix = Firebase "reverse proxy to <project>.firebaseapp.com" option.
//
// /__/firebase/init.json is answered locally: the firebaseapp.com default site is over its
// Hosting bandwidth quota (HTTP 509) while the Google-managed /__/auth/* helper still works.
// These values are the public web config already embedded in the game bundle (not secrets).
const FIREBASE_ORIGIN_HOST = "escape-zombie-school.firebaseapp.com"
const INIT_JSON = {
  "apiKey": "AIzaSyAPuRAyG-aVsz4s-EZV0tBoT-feTEgWkFM",
  "appId": "1:1081021544915:web:034b24a6563f3297a09726",
  "authDomain": "escape-zombie-school.firebaseapp.com",
  "databaseURL": "https://escape-zombie-school-default-rtdb.asia-southeast1.firebasedatabase.app",
  "measurementId": "G-HZ3LTGHV6F",
  "messagingSenderId": "1081021544915",
  "projectId": "escape-zombie-school",
  "storageBucket": "escape-zombie-school.firebasestorage.app"
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === "/__/firebase/init.json") {
      return new Response(JSON.stringify(INIT_JSON), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      })
    }
    if (url.pathname.startsWith("/__/auth/") || url.pathname.startsWith("/__/firebase/")) {
      url.hostname = FIREBASE_ORIGIN_HOST
      url.port = ""
      const headers = new Headers(request.headers)
      headers.delete("host")
      const init = { method: request.method, headers, redirect: "manual" }
      if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body
      return fetch(url.toString(), init)
    }
    return env.ASSETS.fetch(request)
  },
}
