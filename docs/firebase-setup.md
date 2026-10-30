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
4. **익명(Anonymous)은 켜지 않습니다.** 참여자는 로그인 없이 입장 코드만으로 의견을 남깁니다.
   (이미 켜 두었다면 익명 → 사용 설정 끄기 → 저장. 같은 와이파이에서 익명 계정이 시간당 약 100개까지만 만들어져 대규모 수업에서 입장이 막히는 문제가 있어 사용하지 않기로 함)
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
   - 처음엔 모든 접근이 막혀 있습니다. 아래 **4-1**에서 앱용 규칙을 붙여넣어야 앱이 동작합니다.

### 4-1. 보안 규칙 게시 (규칙 파일이 바뀔 때마다)

1. 저장소의 **`firestore.rules`** 파일을 열어 **내용 전체를 복사**
   (GitHub 저장소 페이지에서 `firestore.rules` 클릭 → 오른쪽 위 복사 버튼)
2. 콘솔 **Firestore Database → 규칙(Rules)** 탭
3. 기존 내용을 **모두 지우고** 붙여넣기 → **게시(Publish)**
4. 1분 정도 지나면 적용됩니다

> Firebase CLI를 설치했다면 저장소 폴더에서 `firebase deploy --only firestore:rules` 한 줄로도 됩니다.

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

## 7. (선택) Firebase CLI 설치

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

---

## 8. 자동 배포 (GitHub Actions) — 설정 완료

- `main`에 푸시하면 GitHub Actions가 빌드해서 `https://postit-board-74a67.web.app`에 자동 배포합니다
  (설정 파일: `.github/workflows/firebase-hosting-merge.yml`, `firebase.json`, `.firebaserc`)
- 진행 상황: GitHub 저장소 → **Actions** 탭 (초록 체크 = 배포 성공, 빨간 X = 실패)
- 수동 재배포: Actions 탭 → "Deploy to Firebase Hosting on merge" → **Run workflow**
- 빌드에 쓰는 Firebase 설정값은 GitHub Secret **`ENV_LOCAL`**(= `.env.local` 내용 전체)에서 가져옵니다.
  `.env.local`을 바꾸면 이 Secret도 같은 내용으로 **Update** 해야 배포본에 반영됩니다.

## 9. 다른 PC에서 작업 시작하기

`firebase init`은 **다시 할 필요 없습니다** (설정 파일이 저장소에 들어 있음).

```bash
git clone https://github.com/BeautyRiver/postit-board.git
cd postit-board
npm install
```

1. `.env.local` 파일을 만들어 설정값 넣기 (5번 참고 — 기존 PC의 파일 내용을 그대로 복사)
2. `npm run dev` 로 실행

Firebase CLI(`firebase-tools`)는 그 PC에서 `firebase` 명령(보안 규칙 배포, 에뮬레이터 등)을 직접 쓸 때만 설치·로그인하면 됩니다.
사이트 배포는 GitHub Actions가 하므로 CLI 없이 푸시만 하면 됩니다.

## 10. (개발용) 로컬 에뮬레이터로 테스트

실제 데이터를 건드리지 않고 PC에서 가짜 Firebase로 테스트할 수 있습니다. Firebase CLI와 Java 11 이상이 필요합니다.

1. 터미널 1: `npm run emulators` (로그인·Firestore 에뮬레이터 실행, `firestore.rules` 자동 적용)
2. `.env.local`에 `VITE_USE_EMULATORS=true` 한 줄 추가 → 터미널 2: `npm run dev`
3. 강사 로그인 팝업에서 **Add new account**로 가짜 Google 계정을 만들고, 화면에 나온 UID를
   아래 명령으로 admins에 등록:
   ```bash
   curl -X PATCH -H "Authorization: Bearer owner" -H "Content-Type: application/json" \
     -d '{"fields":{"name":{"stringValue":"테스트"}}}' \
     "http://127.0.0.1:8080/v1/projects/demo-postit/databases/(default)/documents/admins/<UID>"
   ```
4. 끝나면 `.env.local`에서 `VITE_USE_EMULATORS=true` 줄을 지우거나 주석 처리

보안 규칙 자동 테스트: `npm run test:rules`
