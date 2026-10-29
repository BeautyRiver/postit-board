# Firebase 설정 가이드 (무료 Spark 요금제, 카드 등록 없음)

이 프로젝트는 **카드 등록 없이 무료(Spark) 요금제**로 운영합니다.
사진은 Storage를 쓰지 않고 Firestore(데이터베이스)에 작게 줄여 저장하므로 **Storage는 만들지 않습니다.**

> 콘솔 화면 문구는 Firebase 업데이트에 따라 조금씩 다를 수 있습니다. 비슷한 이름의 버튼을 찾으면 됩니다.

---

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 접속 → **본인 개인 Google 계정**으로 로그인
2. **프로젝트 만들기**(Create a project / Get started) 클릭
3. 프로젝트 이름: `postit-board` 입력
   - 아래에 자동으로 만들어지는 **프로젝트 ID**(예: `postit-board-a1b2c`)를 메모해 두세요.
     나중에 배포 주소가 `https://<프로젝트ID>.web.app` 이 됩니다. 연필 아이콘으로 바꿀 수 있지만 **생성 후에는 못 바꿉니다.**
4. 약관 동의 → 계속
5. **Gemini in Firebase**(AI 도우미) 화면이 나오면 꺼도 됩니다 → 계속
6. **Google 애널리틱스**: 필요 없으니 **사용 안 함**으로 끄기 → **프로젝트 만들기**
7. 1분 정도 기다리면 완료 → 계속

✅ 확인: 콘솔 왼쪽 아래(또는 상단)에 요금제가 **Spark**(무료)로 표시되어야 합니다. **업그레이드 버튼은 누르지 마세요.**

---

## 2. 웹 앱 등록 (설정값 받기)

1. 프로젝트 개요(Project Overview) 화면에서 **`</>` 웹** 아이콘 클릭
   (안 보이면 왼쪽 위 톱니바퀴 ⚙ → 프로젝트 설정 → 아래쪽 "내 앱" → 앱 추가 → 웹)
2. 앱 닉네임: `postit-board-web`
3. **"이 앱의 Firebase 호스팅도 설정합니다"는 체크하지 마세요** (5단계에서 따로 설정)
4. **앱 등록** 클릭
5. 화면에 아래와 같은 코드가 나옵니다. **이 값들을 복사해 두세요** (나중에 ⚙ 프로젝트 설정 → 내 앱에서 다시 볼 수 있음)
   ```js
   const firebaseConfig = {
     apiKey: "AIza....",
     authDomain: "postit-board-a1b2c.firebaseapp.com",
     projectId: "postit-board-a1b2c",
     storageBucket: "postit-board-a1b2c.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef..."
   };
   ```
6. "npm 사용" 안내는 무시하고 **콘솔로 이동**

---

## 3. 로그인(Authentication) 켜기

1. 왼쪽 메뉴 **빌드(Build) → Authentication** → **시작하기**
2. **로그인 방법(Sign-in method)** 탭
3. **Google** 선택
   - **사용 설정** 스위치 켜기
   - 프로젝트의 공개용 이름: `의견을 나누는 포스트잇`
   - 프로젝트 지원 이메일: 본인 이메일 선택
   - **저장**
4. **새 제공업체 추가** → **익명(Anonymous)** 선택 → **사용 설정** 켜기 → **저장**
   (참여자는 로그인 화면 없이 자동으로 익명 로그인됩니다)
5. **설정(Settings) 탭 → 승인된 도메인(Authorized domains)**
   - `localhost`, `<프로젝트ID>.firebaseapp.com`, `<프로젝트ID>.web.app`이 이미 있으면 OK
   - 휴대폰으로 PC 개발 서버에 접속해 테스트할 때(`http://192.168.x.x:5173`)는 그 IP(`192.168.x.x`)를 **도메인 추가**로 넣어야 Google 로그인이 됩니다

---

## 4. 데이터베이스(Firestore) 만들기

1. 왼쪽 메뉴 **빌드 → Firestore Database** → **데이터베이스 만들기**
2. 버전(Edition)을 묻는 화면이 나오면 **Standard** 선택
3. 데이터베이스 ID: `(default)` 그대로
4. **위치(Location)**: **`asia-northeast3 (Seoul)`** 선택
   - ⚠ **생성 후 바꿀 수 없습니다.** 한국에서 쓰므로 서울이 가장 빠릅니다.
5. 보안 규칙: **프로덕션 모드에서 시작**(Start in production mode) 선택 → **만들기**
   - 처음엔 모든 접근이 막혀 있습니다. 2단계에서 앱에 맞는 규칙을 드리면 **규칙(Rules) 탭**에 붙여넣고 **게시**하면 됩니다.

> **Storage(사진 저장소)는 만들지 마세요.** 만들려고 하면 요금제 업그레이드(카드 등록)를 요구합니다.

---

## 5. 내 PC에 설정값 넣기 (`.env.local`)

저장소 맨 위 폴더(`package.json`이 있는 곳)에 **`.env.local`** 파일을 만들고, 2번에서 복사한 값을 아래처럼 넣습니다.

```
VITE_FIREBASE_API_KEY=AIza....
VITE_FIREBASE_AUTH_DOMAIN=postit-board-a1b2c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=postit-board-a1b2c
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef...
```

- 따옴표 없이, `=` 앞뒤 띄어쓰기 없이
- 이 파일은 `.gitignore`에 있어서 **GitHub에 올라가지 않습니다** → **PC마다 직접 만들어야 합니다** (메신저·메모 등으로 복사)
- 2단계 코드에 `.env.example`(빈 양식)을 넣어 둘 예정이라, 그 파일을 복사해서 이름을 `.env.local`로 바꿔 채워도 됩니다

---

## 6. (2단계 코드 이후) 강사 계정 등록

강사 화면은 **Firestore의 `admins` 목록에 등록된 Google 계정만** 들어갈 수 있습니다.
계정의 고유번호(UID)는 그 계정으로 **한 번 로그인해야** 생기므로 순서는 이렇습니다.

1. 앱(`npm run dev`)의 `/host`에서 등록할 Google 계정(누나 계정, 테스트용 본인 계정)으로 로그인
   → "등록된 강사 계정이 아닙니다" 화면에 **UID**가 표시됩니다
   (또는 콘솔 **Authentication → 사용자(Users)** 탭의 "사용자 UID" 열에서 복사)
2. 콘솔 **Firestore Database → 데이터** 탭 → **컬렉션 시작**
   - 컬렉션 ID: `admins` → 다음
   - 문서 ID: **복사한 UID 붙여넣기**
   - 필드: `name` / 유형 string / 값 `누나` (메모용, 아무거나)
   - 저장
3. 다른 계정도 추가하려면 `admins` 컬렉션에서 **문서 추가**로 같은 방법 반복
4. 앱에서 다시 "Google로 로그인" → 보드 목록이 보이면 성공

---

## 7. (4~5단계 때 필요) Firebase CLI 설치

보안 규칙 배포·사이트 배포용 명령줄 도구입니다. 지금 미리 해 둬도 됩니다.

```bash
npm install -g firebase-tools
firebase login
```

`firebase login`을 하면 브라우저가 열립니다 → 1번에서 쓴 같은 Google 계정으로 로그인 → 허용.

---

## 무료 한도 참고 (Spark, 프로젝트당)

| 항목 | 무료 한도 | 이 앱 예상 사용량 |
|---|---|---|
| Firestore 저장 | 1 GiB | 사진 포함 포스트잇 1장 ≈ 0.1~0.3MB → 수천 장 |
| Firestore 읽기 | 하루 5만 회 | 벽 1회 열기 ≈ 포스트잇 수만큼 |
| Firestore 쓰기 | 하루 2만 회 | 포스트잇 1장 = 1회 |
| Hosting | 저장 10GB, 전송 월 10GB | 충분 |
| 로그인 | 무료 | 충분 |

한도를 넘으면 **요금이 청구되지 않고 그날 사용만 막힙니다** (자정(태평양 시간)에 초기화).
