# Escape Zombie School CDN 리소스 공급 적용 문서

작성일: 2026-09-23
대상: Escape Zombie School / R3F prototype
목표: 대용량 리소스를 초기 번들에 모두 넣지 않고 필요한 시점에 CDN에서 공급한다.

---

## 1. 핵심 결론

CDN을 써도 모델과 텍스처를 화면에 보여주려면 결국 클라이언트가 다운로드하고 메모리와 GPU에 적재해야 한다.
현실적인 목표는 클라이언트에 전혀 적재하지 않기가 아니라 초기 앱 또는 웹 번들에는 넣지 않고 필요한 순간에만 받아서 캐시하는 것이다.

권장 구조:

- Cloudflare R2 또는 Firebase Storage
- CDN 캐시
- 버전이 붙은 리소스 파일
- manifest.json
- 클라이언트 AssetLoader
- 스테이지, 몬스터, 보스 단위 lazy loading

---

## 2. 추천 인프라

### 2.1 1순위: Cloudflare R2 + Cloudflare CDN

추천 이유:

- 정적 게임 리소스 공급에 적합하다.
- 소규모 프로젝트에서 비용 부담이 낮은 편이다.
- S3 호환 API로 자동 업로드 스크립트를 만들기 쉽다.
- custom domain과 CDN 캐시를 붙이기 좋다.

권장 저장 대상:

- glb, gltf
- ktx2, webp, png, jpg
- ogg, mp3
- manifest.json

### 2.2 대안: Firebase Storage

이미 Firebase를 쓰는 프로젝트라면 빠르게 붙일 수 있다. 다만 트래픽이 늘면 비용과 캐시 정책을 별도로 확인해야 한다.

---

## 3. 리소스 분리 기준

앱 또는 웹 번들에 남길 것:

- 핵심 게임 코드
- 최소 UI
- 로딩 화면
- 작은 placeholder 모델과 텍스처
- CDN 실패 시 사용할 fallback 리소스

CDN으로 뺄 것:

- 캐릭터, 좀비, 보스 GLB
- 큰 배경 텍스처
- 스테이지별 환경 리소스
- BGM
- 큰 효과음 묶음
- 이벤트와 시즌 리소스

우선 이전 순서:

1. 보스 모델
2. 스테이지별 배경 텍스처
3. BGM
4. 일반 좀비 변종 모델
5. 이벤트와 시즌 리소스

---

## 4. CDN 디렉터리 구조 예시

예시 주소:

https://cdn.example.com/escape-zombie-school/

권장 구조:

- manifest.v1.json
- models/player_student.v1.glb
- models/zombie_basic.v3.glb
- models/zombie_runner.v2.glb
- models/boss_stage1.v2.glb
- textures/classroom_floor.v4.ktx2
- textures/classroom_wall.v4.ktx2
- audio/bgm_stage1.v1.ogg
- audio/hit_zombie.v2.ogg
- fallback/fallback_zombie.v1.glb

운영 원칙:

- 같은 파일명을 덮어쓰지 않는다.
- 내용이 바뀌면 파일명 버전을 올린다.
- 예: zombie_basic.v3.glb 에서 zombie_basic.v4.glb 로 변경한다.

---

## 5. manifest 설계

코드에 CDN URL을 직접 여러 곳에 박지 말고 manifest를 통해 관리한다.

예시 구조:

- schemaVersion: manifest 형식 버전
- baseUrl: CDN 기본 주소
- assets: 개별 리소스 목록
- groups: boot, stage, boss 단위 프리로드 그룹

예시 asset 필드:

- key: zombie_basic
- type: model
- url: models/zombie_basic.v3.glb
- version: 3
- critical: true
- preloadGroup: stage1
- fallback: fallback/fallback_zombie.v1.glb

권장 그룹:

- boot: 게임 시작 전 최소 리소스
- stage1: 스테이지 1 진입 전 리소스
- stage1_boss: 보스 등장 예고 구간 리소스

---

## 6. 클라이언트 적용 방식

### 6.1 리소스 import 금지

다음처럼 코드에서 직접 import 하면 번들에 리소스가 포함될 가능성이 크다.

import zombieModel from ./assets/zombie.glb

대신 manifest에서 URL을 얻어 로드한다.

예상 흐름:

- assetLoader.loadManifest 로 manifest 다운로드
- assetLoader.preloadGroup 으로 boot 또는 stage 그룹 로딩
- assetLoader.resolveUrl 로 asset key를 실제 CDN URL로 변환
- useGLTF 또는 Three.js loader에 URL 전달

### 6.2 AssetLoader 책임

AssetLoader는 다음을 담당한다.

- manifest 다운로드
- asset key 에서 실제 CDN URL 변환
- preload group 로딩
- 중복 로딩 방지
- 실패 시 fallback URL 반환
- 로딩 상태와 진행률 제공
- 캐시 버전 관리

예상 API:

- loadManifest(manifestUrl)
- preloadGroup(groupName)
- resolveUrl(assetKey)
- getFallbackUrl(assetKey)

---

## 7. 로딩 전략

### Boot 단계

게임 시작 전에 최소 리소스만 받는다.

- 기본 좀비 1종
- 기본 플레이어 모델 또는 placeholder
- 필수 UI 사운드

### Stage 진입 단계

스테이지 선택 또는 진입 직전에 해당 스테이지 리소스를 받는다.

흐름:

1. Stage 1 선택
2. stage1 group preload
3. 완료 후 게임 시작

### Boss 예고 단계

보스는 등장 직전에 받으면 끊길 수 있으므로 5초에서 10초 전에 미리 받는다.

흐름:

1. 보스 조건 충족
2. boss group preload 시작
3. 로딩 완료 또는 제한 시간 도달
4. 보스 등장

### 실패 시 진행 정책

- critical 리소스 실패: 로딩 화면에서 재시도 버튼 표시
- non critical 리소스 실패: fallback 사용 후 게임 진행
- BGM 실패: 무음 진행
- 텍스처 실패: 기본 색상 머티리얼 사용

---

## 8. 캐시 정책

### 버전 파일

리소스 파일은 긴 캐시를 적용한다.

권장 헤더:

Cache-Control: public, max-age=31536000, immutable

예시:

- zombie_basic.v3.glb
- boss_stage1.v2.glb

### manifest 파일

manifest는 자주 바뀔 수 있으므로 캐시를 짧게 둔다.

권장 헤더:

Cache-Control: public, max-age=60

또는 manifest도 파일명 버전을 사용한다.

- manifest.v1.json
- manifest.v2.json

---

## 9. Cloudflare R2 적용 순서

1. Cloudflare Dashboard 접속
2. R2 버킷 생성. 예: escape-zombie-school-assets
3. custom domain 연결. 예: https://cdn.example.com/escape-zombie-school/
4. 파일 업로드. models, textures, audio, manifest
5. CORS 설정
6. 게임 클라이언트에서 manifest URL 연결
7. 네트워크 탭에서 CDN 요청 확인
8. 파일 404 또는 네트워크 실패 시 fallback 확인

CORS 개발 설정 개념:

- AllowedOrigins: http://localhost:5173
- AllowedMethods: GET, HEAD
- AllowedHeaders: 모든 헤더
- ExposeHeaders: ETag
- MaxAgeSeconds: 3600

CORS 운영 설정 개념:

- AllowedOrigins: 실제 게임 도메인
- AllowedMethods: GET, HEAD
- AllowedHeaders: 모든 헤더
- ExposeHeaders: ETag
- MaxAgeSeconds: 86400

---

## 10. 보안과 치팅 주의

CDN에 올린 파일은 사용자가 다운로드할 수 있다고 봐야 한다.

올리면 안 되는 것:

- 비밀키
- Firebase service account
- 운영자 토큰
- 서버 로직
- 결제와 보상 판정 로직

올려도 되는 것:

- 모델
- 텍스처
- 사운드
- 공개 가능한 manifest

랭킹, 보상, 결제, 계정 판정은 서버 또는 Firebase 보안 규칙으로 보호해야 한다.

---

## 11. 최적화 체크리스트

모델:

- GLB 사용
- Meshopt 또는 Draco 압축 검토
- 불필요한 애니메이션 제거
- 중복 머티리얼 정리
- 폴리곤 수 제한

텍스처:

- KTX2 또는 Basis 우선 검토
- 모바일 대상이면 해상도 제한
- WebP 사용 가능 리소스는 WebP 사용

사운드:

- OGG 사용
- 긴 BGM은 지연 로딩
- 효과음은 짧게 압축

---

## 12. 단계별 구현 계획

### Phase 1: 리소스 인벤토리

- 현재 public, src/assets, 모델 폴더의 대용량 파일 목록 작성
- 파일별 사용 위치 확인
- CDN 이전 우선순위 정하기

완료 기준:

- asset-inventory.md 작성
- boot, stage, boss 그룹 초안 작성

### Phase 2: manifest 도입

- asset-manifest.local.json 작성
- 개발환경은 로컬 URL, 운영환경은 CDN URL 지원
- asset key 기반 접근으로 변경

완료 기준:

- manifest로 zombie_basic 같은 asset key 해석 가능

### Phase 3: AssetLoader 구현

- src/lib/assetLoader.js 추가
- manifest fetch
- URL resolve
- preloadGroup
- fallback 처리
- 단위 테스트 작성

완료 기준:

- 그룹 preload와 fallback 동작 테스트 통과

### Phase 4: 일부 리소스 CDN 전환

첫 적용 대상 추천:

1. 보스 GLB 1개
2. 스테이지 BGM 1개
3. 일반 좀비 GLB 1개

완료 기준:

- 빌드 번들에 해당 리소스가 직접 포함되지 않음
- 네트워크 탭에서 CDN URL 요청 확인
- CDN 실패 시 fallback 확인

### Phase 5: 스테이지 단위 전환

- Stage 1 리소스 그룹 전환
- Stage 2 리소스 그룹 전환
- 보스와 이벤트 리소스 전환

완료 기준:

- 초기 로딩 용량 감소
- 스테이지 진입 전 preload UI 정상 표시
- 모바일 네트워크 실패 대응 확인

---

## 13. QA 체크리스트

기능:

- manifest 로드 성공
- manifest 로드 실패 시 fallback 또는 오류 화면 표시
- boot group preload 성공
- stage group preload 성공
- boss group 지연 preload 성공
- CDN 파일 404 시 fallback 사용
- BGM 실패 시 게임 진행 가능

성능:

- 초기 번들 크기 감소 확인
- 첫 실행 로딩 시간 확인
- 스테이지 전환 로딩 시간 확인
- 같은 리소스 재방문 시 캐시 히트 확인

모바일:

- 느린 네트워크에서 로딩 UI 표시
- 오프라인 또는 불안정 네트워크에서 멈추지 않음
- 메모리 부족 방지를 위해 과도한 preload 금지

릴리즈:

- CDN URL이 운영 도메인인지 확인
- CORS 설정 확인
- Cache-Control 확인
- manifest 버전 확인
- 오래된 manifest와 파일 조합에서 오류 없는지 확인

---

## 14. 바로 다음 작업

다음 구현 순서를 추천한다.

1. 현재 프로젝트 대용량 리소스 인벤토리 작성
2. asset-manifest.local.json 초안 작성
3. src/lib/assetLoader.js 구현
4. assetLoader.test.js 작성
5. 보스 또는 좀비 GLB 1개만 CDN URL 방식으로 교체
6. Vite build 후 번들 크기와 네트워크 요청 확인

이 순서로 가면 위험을 작게 유지하면서 CDN 리소스 공급 구조를 검증할 수 있다.
