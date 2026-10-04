오빠, 찾았어. CDN 이용 정리 문서는 이거야.

**주 문서**
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/cdn_asset_delivery_plan_2026-09-23.md`
- 제목: **Escape Zombie School CDN 리소스 공급 적용 문서**
- 작성일: `2026-09-23`
- 목적: 대용량 리소스를 초기 번들에 모두 넣지 않고, 필요한 시점에 CDN에서 공급

**관련 보조 문서**
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Planner/escape_zombie_school_bgm_external_delivery_implementation_plan_2026-09-12.md`
- BGM을 AAB/Vite 번들에 넣지 않고 Cloudflare R2/CDN에서 지연 로드하는 계획 문서

핵심 내용은 이렇게 정리돼 있어:

- CDN을 써도 리소스를 화면에 보여주려면 결국 클라이언트가 다운로드하고 메모리/GPU에 적재해야 함
- 현실적인 목표는 **클라이언트에 전혀 적재하지 않기**가 아니라  
  **초기 앱/AAB/웹 번들에 넣지 않고 필요한 순간에만 받아서 캐시하는 것**
- 추천 구조:
  - Cloudflare R2 또는 Firebase Storage
  - CDN 캐시
  - 버전 붙은 리소스 파일
  - `manifest.json`
  - 클라이언트 `AssetLoader`
  - 스테이지/몬스터/보스 단위 lazy loading

추천 인프라는:
- **1순위: Cloudflare R2 + Cloudflare CDN**
  - 소규모 프로젝트 비용 부담 낮음
  - 정적 게임 리소스 공급에 적합
  - S3 호환 API로 자동 업로드 가능
  - custom domain/CDN 캐시 붙이기 좋음
- **2순위: Firebase Storage**
  - 이미 Firebase를 쓰니까 빠르게 붙일 수 있음
  - 다만 트래픽 증가 시 비용/캐시 정책 확인 필요

CDN으로 빼는 우선순위:
1. 보스 모델
2. 스테이지별 배경 텍스처
3. BGM
4. 일반 좀비 변종 모델
5. 이벤트/시즌 리소스

문서에서 바로 다음 작업으로 제안한 순서:
1. 현재 프로젝트 대용량 리소스 인벤토리 작성
2. `asset-manifest.local.json` 초안 작성
3. `src/lib/assetLoader.js` 구현
4. `assetLoader.test.js` 작성
5. 보스 또는 좀비 GLB 1개만 CDN URL 방식으로 교체
6. Vite build 후 번들 크기와 네트워크 요청 확인

오빠가 아까 말한 “소규모 프로젝트에서 CDN으로 클라이언트에 리소스를 적재하지 않고 공급”이라는 질문에 대해, 이 문서의 결론은 명확해:

**완전히 클라이언트에 안 싣는 건 불가능하고, 설치 파일/초기 번들에 안 넣고 필요한 시점에만 CDN에서 받아 쓰는 게 현실적인 방식이야.**