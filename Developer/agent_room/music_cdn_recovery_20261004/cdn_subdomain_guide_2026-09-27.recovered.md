응 오빠, **게임을 웹에서 서비스할 도메인이 이미 있으면 그 도메인의 서브도메인으로 CDN/audio용 주소를 만들 수 있어.**

예를 들면:

```text
게임 웹:
https://zombieschool.com

음악/CDN:
https://audio.zombieschool.com
```

또는:

```text
게임 웹:
https://game.jungsil.com

리소스 CDN:
https://cdn.jungsil.com
audio.jungsil.com
assets.jungsil.com
```

## 추천 구조

오빠 게임이면 이렇게 나누는 게 좋아:

```text
game.example.com     → 게임 웹 앱
cdn.example.com      → 모델, 텍스처, 이미지
audio.example.com    → BGM, 노래, 효과음
```

처음에는 단순하게 하나만 써도 돼:

```text
game.example.com
cdn.example.com
```

그리고 `cdn.example.com` 아래에:

```text
cdn.example.com/escape-zombie-school/audio/
cdn.example.com/escape-zombie-school/models/
cdn.example.com/escape-zombie-school/textures/
```

이렇게 둬도 충분해.

## Cloudflare에서 가능한 방식

도메인을 Cloudflare가 관리하고 있으면:

1. Cloudflare에 도메인 등록
2. R2 버킷 생성
3. R2 버킷에 custom domain 연결
4. 예: `audio.example.com`
5. DNS에 자동/수동으로 CNAME 연결
6. SSL은 Cloudflare가 처리

그러면 게임에서는 이런 URL을 쓰면 돼:

```text
https://audio.example.com/escape-zombie-school/bgm/stage-01/stage-01-bgm.hash.opus.webm
```

## 주의점

서브도메인을 만들 수는 있는데, **어디에 연결할지**를 정해야 해.

예:

```text
game.example.com  → Firebase Hosting / Vercel / Cloudflare Pages
audio.example.com → Cloudflare R2
cdn.example.com   → Cloudflare R2
```

즉, 같은 메인 도메인을 쓰더라도 서브도메인마다 목적지를 다르게 연결할 수 있어.

## CORS는 여전히 설정 필요

게임 도메인과 리소스 도메인이 다르면 브라우저 입장에서는 다른 origin이야.

예:

```text
https://game.example.com
https://audio.example.com
```

둘은 서로 다른 origin이므로 R2 CORS에 게임 주소를 허용해야 해.

예:

```text
AllowedOrigins:
- https://game.example.com
- http://localhost:5173
```

허용 메서드:

```text
GET
HEAD
```

## 결론

응, 오빠.  
**게임 웹 도메인이 있으면 그 하위에 `audio.`나 `cdn.` 서브도메인을 만들어서 R2/CDN 리소스 공급용으로 쓰면 돼.**

가장 추천하는 형태는:

```text
game.오빠도메인.com  → 게임 실행
cdn.오빠도메인.com   → 음악/모델/텍스처 리소스
```

처음에는 `cdn.` 하나로 시작하고, 나중에 커지면 `audio.`, `assets.`로 분리하면 돼.