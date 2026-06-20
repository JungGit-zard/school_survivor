# Firebase Google Login / Realtime Database Validation - 2026-06-20

## Validation Target

- Google 로그인과 Firebase Realtime Database 진행 정보 저장 연결이 빌드 가능한지 확인한다.
- 로컬 진행 정보 스냅샷이 유저별 `users/{uid}` 경로에 저장될 수 있는 구조인지 테스트한다.

## Automated Checks

실행 위치:

```text
Developer/r3f_prototype
```

실행 명령:

```powershell
npm test -- src/components/GoogleAccountPanel.test.jsx src/lib/firebaseAuth.test.js src/lib/firebaseProgress.test.js src/store/useAuthStore.cloudProgress.test.js src/store/useGameStore.cloudProgress.test.js
npm run build
```

결과:

- 테스트: 5개 파일, 14개 테스트 통과
- 빌드: 성공
- 빌드 경고: Vite chunk size warning 존재. 이번 Firebase 연동 전에도 발생 가능한 번들 크기 경고이며, 기능 실패는 아님.

## Manual Validation Needed

Firebase 콘솔에서 다음이 켜져 있어야 실제 로그인/DB 저장이 된다.

- Authentication > Sign-in method > Google 활성화
- Realtime Database Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

수동 확인 절차:

1. `http://127.0.0.1:5173` 접속
2. 타이틀 화면의 `Google 로그인` 클릭
3. Google 계정 선택
4. Firebase Console > Authentication에 유저가 생기는지 확인
5. Realtime Database > 데이터 탭에서 `users/{uid}` 아래에 `profile`, `progress`가 생기는지 확인

