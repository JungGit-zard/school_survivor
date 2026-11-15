// Terry 2026-11-15 VFX picks — shader + material kit ported from the VFX trial page
// (F:/ezs-work/backup/vfx_assets/trial/trial_src.js). Every effect here follows the trial look
// (toneMapped false, normal alpha blending, no tone curve) with ONE deliberate change:
// Terry's global rule "no black/dark outline on any effect" — the trial's ink rim (rimW / outlineW / C.ink)
// is gone from every shader, and the trial's two additive effects (Binbun 4-way star, Kenney soft star)
// use normal blending with a luminance alpha so they neither wash out on the beige floor nor grow a dark halo.
//
// Credits (full text + per-file provenance: src/assets/vfx/License.txt and PROVENANCE.json):
// - REEBOO stylized 2D VFX lite shader ports (ring / rays / blob / flash / swirl / pillar) and the
//   noise / twinkle / puff textures: MIT, Copyright (c) 2026 REEBOO Labs.
// - Binbun3D Battle FX (fresnel shield shell) and Hit FX (4-way star) shader ports: CC0.
// - Kenney Particle Pack textures: CC0. AD_FX FREE Hand-Painted VFX Sampler heart: CC0.
// - cs5475 Free Pixel Effects hit spark: CC0. CodeManu VFX Free Pack (codemanu.itch.io/vfx-free-pack) via the
//   Brackeys VFX Bundle: explosion + impact_white flipbooks.
import * as THREE from 'three'
import reeboNoiseUrl from '../assets/vfx/reebo_noise.png'
import reeboTwinkleUrl from '../assets/vfx/reebo_twinkle.png'
import reeboPuffUrl from '../assets/vfx/reebo_puff.png'
import kenneyMagic03Url from '../assets/vfx/kenney_magic_03.png'
import kenneyCircle02Url from '../assets/vfx/kenney_circle_02.png'
import kenneyCircle03Url from '../assets/vfx/kenney_circle_03.png'
import kenneyCircle05Url from '../assets/vfx/kenney_circle_05.png'
import kenneyStar06Url from '../assets/vfx/kenney_star_06.png'
import kenneyStar07Url from '../assets/vfx/kenney_star_07.png'
import adfxHeartUrl from '../assets/vfx/adfx_heart.png'
import codemanuExplosionUrl from '../assets/vfx/codemanu_explosion.png'
import codemanuImpactWhiteUrl from '../assets/vfx/codemanu_impact_white.png'
import pixelHitSparkUrl from '../assets/vfx/px_hit_spark_48.png'

// cols/rows/frames match trial/manifest.json.
export const VFX_TEXTURES = Object.freeze({
  reebo_noise: { url: reeboNoiseUrl, cols: 1, rows: 1, frames: 1 },
  reebo_twinkle: { url: reeboTwinkleUrl, cols: 1, rows: 1, frames: 1 },
  reebo_puff: { url: reeboPuffUrl, cols: 1, rows: 1, frames: 1 },
  kenney_magic_03: { url: kenneyMagic03Url, cols: 1, rows: 1, frames: 1 },
  kenney_circle_02: { url: kenneyCircle02Url, cols: 1, rows: 1, frames: 1 },
  kenney_circle_03: { url: kenneyCircle03Url, cols: 1, rows: 1, frames: 1 },
  kenney_circle_05: { url: kenneyCircle05Url, cols: 1, rows: 1, frames: 1 },
  kenney_star_06: { url: kenneyStar06Url, cols: 1, rows: 1, frames: 1 },
  kenney_star_07: { url: kenneyStar07Url, cols: 1, rows: 1, frames: 1 },
  adfx_heart: { url: adfxHeartUrl, cols: 4, rows: 4, frames: 9 },
  codemanu_explosion: { url: codemanuExplosionUrl, cols: 6, rows: 5, frames: 27 },
  codemanu_impact_white: { url: codemanuImpactWhiteUrl, cols: 6, rows: 4, frames: 15 },
  px_hit_spark_48: { url: pixelHitSparkUrl, cols: 8, rows: 1, frames: 7 },
})

const textureCache = new Map()

// One THREE.Texture per (key, sampling) for the whole app. Same colour space as the trial (sRGB).
export function getVfxTexture(key, { pixel = false, repeat = false } = {}) {
  const cacheKey = `${key}|${pixel ? 'p' : ''}${repeat ? 'r' : ''}`
  const cached = textureCache.get(cacheKey)
  if (cached) return cached
  const info = VFX_TEXTURES[key]
  if (!info) throw new Error(`[vfxShaders] unknown texture ${key}`)
  const texture = new THREE.TextureLoader().load(info.url)
  texture.colorSpace = THREE.SRGBColorSpace
  if (pixel) {
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false
  }
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  textureCache.set(cacheKey, texture)
  return texture
}

// ── vertex: per-instance data (iData) or per-mesh data (uData); optional camera-facing billboard ──
// vData: x = progress / decay, y = opacity, z = flipbook frame or toon threshold, w = seed.
export const VFX_QUAD_VS = /* glsl */`
#ifdef USE_INSTANCING
attribute vec4 iData;
#endif
uniform vec4 uData;
varying vec2 vUv;
varying vec4 vData;
void main() {
  vUv = uv;
#ifdef USE_INSTANCING
  vData = iData;
  mat4 m = modelViewMatrix * instanceMatrix;
#else
  vData = uData;
  mat4 m = modelViewMatrix;
#endif
#ifdef BILLBOARD
  vec4 c = m * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * vec2(length(m[0].xyz), length(m[1].xyz));
  gl_Position = projectionMatrix * c;
#else
  gl_Position = projectionMatrix * m * vec4(position, 1.0);
#endif
}
`

// ── sprite / flipbook (trial SPRITE_FS without the rim) ──
// MODE 0 soft: tinted, luminance as alpha (stands in for the trial's additive soft star on normal blending).
// MODE 1 toon: hard alpha cut at threshold vData.z, flat colour, NO dark rim (trial rimW dropped).
// MODE 3 as-is: drawn flipbook art in its own colours, frame vData.z.
export const VFX_SPRITE_FS = /* glsl */`
uniform sampler2D map;
uniform vec2 grid;
uniform vec3 color;
uniform float lum;
varying vec2 vUv;
varying vec4 vData;
void main() {
#if MODE == 3
  float f = floor(vData.z + 0.0001);
  vec2 cell = vec2(mod(f, grid.x), grid.y - 1.0 - floor(f / grid.x));
  vec4 t = texture2D(map, (vUv + cell) / grid);
  vec3 rgb = t.rgb;
  float a = t.a * vData.y;
#else
  vec4 t = texture2D(map, vUv);
  float lumA = max(t.r, max(t.g, t.b)) * t.a;
  vec3 rgb = color;
  #if MODE == 1
  float src = mix(t.a, lumA, lum);
  float a = smoothstep(vData.z - 0.03, vData.z + 0.03, src) * vData.y;
  #else
  float a = lumA * vData.y;
  #endif
#endif
  if (a < 0.004) discard;
  gl_FragColor = vec4(rgb, a);
}
`

// ── REEBOO stylized 2D VFX ports (MIT, Copyright (c) 2026 REEBOO Labs) — outline pass removed ──
const REEBO_COMMON = /* glsl */`
uniform vec3 cCore; uniform vec3 cMid; uniform vec3 cEdge; uniform float bands;
uniform sampler2D noiseTex; uniform float uTime;
varying vec2 vUv;
varying vec4 vData;
#define uP vData.x
#define seed vData.w
float easeOut(float x, float k){ return 1.0 - pow(1.0 - clamp(x,0.0,1.0), k); }
float aa(float d){ float w = max(fwidth(d), 0.0001); return clamp(0.5 - d / w, 0.0, 1.0); }
float band(float t){ float s = clamp(t,0.0,0.999)*bands; float f = fract(s); float w = clamp(fwidth(s)*1.5,0.02,0.5); return (floor(s)+smoothstep(1.0-w,1.0,f))/bands; }
vec3 ramp(float t){ vec3 c = mix(cCore, cMid, smoothstep(0.0,0.5,t)); return mix(c, cEdge, smoothstep(0.5,1.0,t)); }
float nz(vec2 uv){ return texture2D(noiseTex, uv).r; }
float hash(float n){ return fract(sin(n*127.1 + seed*31.7)*43758.5453); }
void outp(vec3 col, float d, float mask){
  float a = aa(d) * mask * vData.y;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
}
`

// Kind bodies are copied verbatim from the trial REEBO table.
export const REEBO_KINDS = Object.freeze({
  ring: `uniform float r0; uniform float r1; uniform float w0; uniform float w1; uniform float breakup;
  void main(){ float p=clamp(uP,0.0,1.0); vec2 c=vUv*2.0-1.0; float r=length(c); float ang=atan(c.y,c.x)/6.28318+0.5;
    float R=mix(r0,r1,easeOut(p,3.0)); float W=max(mix(w0,w1,pow(p,0.7)),0.0); float d=abs(r-R)-W*0.5;
    float n=nz(vec2(ang*3.0+seed, r*0.7-p*0.35)); float er=breakup*smoothstep(0.15,1.0,p);
    float mask=smoothstep(er-0.04,er+0.04,n)*step(0.0005,W);
    float across=clamp((R+W*0.5-r)/max(W,0.001),0.0,1.0); float heat=clamp(across*0.75+p*0.55,0.0,1.0);
    outp(ramp(band(heat)), d, mask); }`,
  rays: `uniform float count; uniform float fill; uniform float rw;
  void main(){ float p=clamp(uP,0.0,1.0); vec2 c=vUv*2.0-1.0; float r=length(c); float a=atan(c.y,c.x)/6.28318+0.5;
    float bin=floor(a*count); float h1=hash(bin+1.0); float h2=hash(bin+17.0); float centre=(bin+0.5+(h1-0.5)*0.6)/count;
    float perp=r*(a-centre)*6.28318; float lenf=mix(0.4,1.0,h2);
    float rin=mix(0.15,0.85*lenf,easeOut(p,3.0)); float rout=mix(0.3,1.0*lenf,easeOut(min(p*1.6,1.0),3.0));
    float u=clamp((r-rin)/max(rout-rin,0.001),0.0,1.0); float w=rw*(1.0-p)*mix(0.6,1.3,h1)*4.0*u*(1.0-u);
    float d=abs(perp)-w; float on=step(h2*0.999,fill)*step(rin,r)*step(r,rout);
    outp(ramp(band(clamp((1.0-u)*0.6+p*0.6,0.0,1.0))), d, on); }`,
  blob: `uniform float s0; uniform float s1; uniform float distort; uniform float ns; uniform float e0; uniform float e1; uniform float drift; uniform float cool;
  void main(){ float p=clamp(uP,0.0,1.0); vec2 c=vUv*2.0-1.0; float r=length(c); float S=max(mix(s0,s1,easeOut(p,3.5)),0.001);
    float n1=nz(c*ns*0.5+vec2(seed,seed*0.37)+vec2(0.0,p*drift)); float n2=nz(c*ns*1.3+vec2(seed*1.7,0.21)+vec2(0.0,p*drift*1.6));
    float dens=1.0-r/S+(n1-0.5)*distort+(n2-0.5)*distort*0.5; float ero=mix(e0,e1,smoothstep(0.0,1.0,p));
    float heat=clamp(1.0-dens+p*cool-0.15,0.0,1.0);
    outp(ramp(band(heat)), (ero-dens)*0.25, smoothstep(1.0,0.92,r)); }`,
  flash: `uniform float peak; uniform float core; uniform float crossAmt; uniform float crossW;
  void main(){ float p=clamp(uP,0.0,1.0); float s=p<peak?easeOut(p/peak,2.0):pow(1.0-(p-peak)/(1.0-peak),1.6);
    vec2 c=vUv*2.0-1.0; float r=length(c); float ang=atan(c.y,c.x)/6.28318+0.5; float wob=(nz(vec2(ang*3.0+seed,p*0.5))-0.5)*0.15;
    float R=core*s; float d=r-R*(1.0+wob); float L=0.98*s;
    float ax=abs(c.y)-crossW*s*max(1.0-abs(c.x)/max(L,0.001),0.0); float ay=abs(c.x)-crossW*s*max(1.0-abs(c.y)/max(L,0.001),0.0);
    float dc=min(max(ax, abs(c.x)-L), max(ay, abs(c.y)-L));
    float dd = crossAmt>0.0 ? min(d, dc) : d;
    float heat=clamp(r/max(R,0.001)*0.8+(1.0-s)*0.5,0.0,1.0);
    outp(ramp(band(heat)), dd, step(0.001,R)); }`,
  swirl: `uniform float arms; uniform float twist; uniform float spin; uniform float armW; uniform float inner; uniform float outer;
  void main(){ vec2 c=vUv*2.0-1.0; float r=length(c); float a=atan(c.y,c.x)/6.28318;
    float s=fract(a*arms+r*twist-uTime*spin+seed); float n=nz(vec2(a*2.0+seed,r-uTime*0.3));
    float bd=abs(s-0.5)*2.0-armW*(0.75+0.5*n); float rd=max(inner-r, r-outer); float d=max(bd*0.35, rd);
    outp(ramp(band(clamp(r/outer*0.85,0.0,1.0))), d, 1.0); }`,
  pillar: `uniform float width; uniform float rise; uniform float scrollS; uniform float streaks;
  void main(){ float p=clamp(uP,0.0,1.0); float x=vUv.x*2.0-1.0; float y=vUv.y; float top=1.0-easeOut(p/rise,2.5);
    float narrow=1.0-smoothstep(0.45,1.0,p); float w=width*narrow*mix(1.0,0.7,1.0-y); float d=abs(x)-w;
    float n=nz(vec2(x*1.5+seed, y*1.2+uTime*scrollS)); float cut=streaks*(0.35+0.65*(1.0-y))*mix(0.2,1.0,clamp(abs(x)/max(w,0.001),0.0,1.0));
    float vert=smoothstep(top,top+0.3,y)*smoothstep(0.0,0.25,y);
    float heat=clamp(abs(x)/max(w,0.001)*0.8+(1.0-y)*0.35+p*0.2,0.0,1.0);
    outp(ramp(band(heat)), d, vert*smoothstep(cut-0.06,cut+0.06,n)*step(0.002,w)); }`,
})

// ── Binbun3D Hit FX 4-way star (CC0) — normal blending, no premultiplied darkening ──
// Trial output was vec4(col*v*op, v*op) on additive blending; on normal blending that darkens the rim,
// so the colour is kept full and only alpha carries the falloff. vData.x = decay, vData.y = opacity.
export const BINBUN_STAR_FS = /* glsl */`
uniform vec3 primary; uniform vec3 secondary; uniform float shape; uniform float smoothv;
varying vec2 vUv;
varying vec4 vData;
void main(){ vec2 uv=abs(vUv*2.0-1.0); float k=shape*vData.x; float v=clamp(pow(uv.x,k)+pow(uv.y,k),0.0,2.0);
  v=smoothstep(0.95,0.95-smoothv,v); float a=v*vData.y; if (a < 0.004) discard;
  gl_FragColor=vec4(mix(secondary,primary,v), a); }
`

// ── Binbun3D Battle FX shield shell (CC0): fresnel, 3-step toon (trial `hard` = 1) ──
export const FRESNEL_VS = /* glsl */`varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`
export const BINBUN_SHELL_FS = /* glsl */`uniform vec3 primary; uniform vec3 secondary; uniform float decay; uniform float hard; varying vec3 vN; varying vec3 vV;
void main(){ float fr=1.0-abs(dot(vV,vN)); float v=smoothstep(0.0,1.0,fr); if(hard>0.0){ v = v>0.55?1.0:(v>0.3?0.45:0.12);}
  gl_FragColor=vec4(mix(secondary,primary,v), max(v-decay,0.0)); }`

const baseMaterialOptions = Object.freeze({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
  blending: THREE.NormalBlending,
})

const MODES = Object.freeze({ soft: 0, toon: 1, asis: 3 })

// Like the trial (noDepth): camera-facing quads skip the depth test so a hit spark inside a zombie body still
// shows; floor quads keep it so characters stand on top of them.
function quadDefines(billboard, extra = {}) {
  return billboard ? { BILLBOARD: '', ...extra } : { ...extra }
}

export function createVfxSpriteMaterial(key, { mode = 'soft', color = 0xffffff, lum = false, billboard = true, pixel = false } = {}) {
  const info = VFX_TEXTURES[key]
  return new THREE.ShaderMaterial({
    ...baseMaterialOptions,
    depthTest: !billboard,
    defines: quadDefines(billboard, { MODE: MODES[mode] ?? 0 }),
    uniforms: {
      map: { value: getVfxTexture(key, { pixel }) },
      grid: { value: new THREE.Vector2(info.cols, info.rows) },
      color: { value: new THREE.Color(color) },
      lum: { value: lum ? 1 : 0 },
      uData: { value: new THREE.Vector4(0, 1, 0.5, 0) },
    },
    vertexShader: VFX_QUAD_VS,
    fragmentShader: VFX_SPRITE_FS,
  })
}

export function createReeboMaterial(kind, { core = 0xfffbe6, mid = 0xffb83f, edge = 0xeb471f, bands = 3, u = {}, billboard = true } = {}) {
  const uniforms = {
    cCore: { value: new THREE.Color(core) },
    cMid: { value: new THREE.Color(mid) },
    cEdge: { value: new THREE.Color(edge) },
    bands: { value: bands },
    noiseTex: { value: getVfxTexture('reebo_noise', { repeat: true }) },
    uTime: { value: 0 },
    uData: { value: new THREE.Vector4(0, 1, 0, 0) },
  }
  for (const [name, value] of Object.entries(u)) uniforms[name] = { value }
  return new THREE.ShaderMaterial({
    ...baseMaterialOptions,
    depthTest: !billboard,
    defines: quadDefines(billboard),
    uniforms,
    vertexShader: VFX_QUAD_VS,
    fragmentShader: REEBO_COMMON + REEBO_KINDS[kind],
  })
}

export function createBinbunStarMaterial({ primary = [1, 1, 0.9], secondary = [1, 0.75, 0.25], shape = 2, smoothv = 0.1, billboard = true } = {}) {
  return new THREE.ShaderMaterial({
    ...baseMaterialOptions,
    depthTest: !billboard,
    defines: quadDefines(billboard),
    uniforms: {
      primary: { value: new THREE.Color(...primary) },
      secondary: { value: new THREE.Color(...secondary) },
      shape: { value: shape },
      smoothv: { value: smoothv },
      uData: { value: new THREE.Vector4(1, 1, 0, 0) },
    },
    vertexShader: VFX_QUAD_VS,
    fragmentShader: BINBUN_STAR_FS,
  })
}

// Inucon guard shell. Front faces only (an open hemisphere seen from above), like the trial.
export function createBinbunShellMaterial({ primary = 0xbdf0ff, secondary = 0x3aa0ff } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.NormalBlending,
    uniforms: {
      primary: { value: new THREE.Color(primary) },
      secondary: { value: new THREE.Color(secondary) },
      decay: { value: 0 },
      hard: { value: 1 },
    },
    vertexShader: FRESNEL_VS,
    fragmentShader: BINBUN_SHELL_FS,
  })
}

// Trial easing helpers.
export const vfxEase = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2
export const vfxPop = (p) => Math.sin(Math.min(1, p) * Math.PI)
