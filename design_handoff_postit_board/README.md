# Handoff: 의견을 나누는 포스트잇 (연수 피드백 보드)

## Overview
교육·연수 현장에서 참여자가 휴대폰으로 의견(질문/칭찬/개선점/기타)을 포스트잇처럼 남기고, 강사는 프로젝터 화면의 "벽"에서 실시간으로 보고·확대·좋아요하는 웹앱.
강사는 여러 보드(교육 회차)를 만들고 관리하며, 참여자는 QR 또는 6자리 코드로 보드에 입장한다.

## About the Design Files
이 폴더의 `prototype/` 파일들은 **HTML로 만든 디자인 레퍼런스(프로토타입)** 이며, 그대로 배포할 프로덕션 코드가 아니다.
브라우저 내 Babel 변환, 전역 `window` 공유, 해시 라우팅, 미리보기용 장치(iOS 프레임·Tweaks 패널·가짜 URL 바)를 포함한다.
작업 목표는 이 디자인과 동작을 **Vite + React + Firebase** 기반 실제 앱으로 재구현하는 것이다.

## Fidelity
**High-fidelity.** 색상, 타이포, 간격, 애니메이션은 최종안이다. 시각적으로 동일하게 재현할 것.

---

## 목표 스택
- **Vite + React 18** (TypeScript 권장)
- **React Router**: `/` (참여자 코드 입력), `/b/:code` (참여자 입력), `/host` (보드 선택), `/host/:boardId` (벽)
- **Firebase**: Hosting, Firestore(실시간), Storage(사진), Auth(강사: Google 로그인 / 참여자: 익명 로그인)
- **QR**: `qrcode.react` 등 실제 QR 라이브러리 (현재 QR은 가짜 패턴)
- CSS: 프로토타입 HTML `<style>` 블록을 CSS Modules 또는 전역 CSS로 추출. Tailwind로 바꾸지 말 것(수치 그대로 유지가 우선).

## 반드시 버리거나 바꿀 것
| 프로토타입 | 실제 앱 |
|---|---|
| `ios-frame.jsx` (휴대폰 베젤) | 제거. 참여자 화면은 실제 모바일 풀스크린 |
| `tweaks-panel.jsx`, Tweaks 관련 코드 | 제거. 배경 스타일·흔들림은 보드 설정 또는 상수로 |
| `URLBar` 컴포넌트 (app.jsx) | 제거 (미리보기 전용 네비게이션) |
| `styles.css` | **사용 안 됨.** 무시. 실제 스타일은 HTML 내 `<style>` |
| PIN `1212` (`host-gate.jsx`) | 제거 → Google 로그인. 허용 강사 이메일은 Firestore `admins` 컬렉션 또는 커스텀 클레임 |
| `QRCode` 컴포넌트 (가짜 패턴) | 실제 QR 생성. URL = `https://<도메인>/b/<code>` |
| `localStorage` 기반 `board-store.jsx` | Firestore. **API 형태(list/create/update/remove/addPostit/like, useBoards)는 유지** |
| 해시 라우팅 (`#host/...`) | React Router 경로 |
| 사진 첨부 (`SAMPLE_PHOTOS` 랜덤) | 실제 `<input type="file" accept="image/*" capture>` → 클라이언트 리사이즈(최대 1600px, JPEG 0.8) → Storage 업로드 |
| 참여자 이름 기본값 `'김민수'` | 빈 문자열. 기기에 마지막 입력 이름 기억(localStorage) |
| `learn.kal.co.kr` 하드코딩 | 실제 배포 도메인 (`window.location.origin`) |
| `sessionStorage hostAuthed` | Firebase Auth 상태 |

---

## 데이터 모델 (Firestore)

```
boards/{boardId}
  code: string          // 6자리, 문자셋 ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (혼동 문자 제외), 유니크
  title: string         // 교육명, 필수, ≤40자
  subtitle: string      // 기수·부제, 선택, ≤40자
  instructor: string    // 강사 이름, 필수, ≤20자
  ownerUid: string
  createdAt: Timestamp
  postitCount: number   // 목록 표시용 (Cloud Function 또는 increment로 유지)

boards/{boardId}/postits/{postitId}
  body: string          // ≤200자
  author: string        // 익명이면 '익명'
  anonymous: boolean
  color: 'yellow'|'pink'|'green'|'blue'|'orange'|'purple'|'mint'|'white'
  category: 'question'|'praise'|'improve'|'etc'
  likes: number
  photoUrl: string|null
  photoCaption: string|null
  answered: boolean
  answer: string|null
  authorUid: string
  createdAt: Timestamp

boardCodes/{code}  →  { boardId }   // 코드 → 보드 조회 + 유니크 보장(트랜잭션)
```

- 코드 생성 시 `boardCodes/{code}` 존재 여부를 트랜잭션으로 확인 후 생성.
- 좋아요: `increment(1)`. 프로토타입은 카드 단위로 1회 제한(로컬 state). 실제는 `likes/{uid}` 서브컬렉션 또는 기기 localStorage로 중복 방지.
- **보드 삭제는 서브컬렉션 postits와 Storage 사진까지 모두 삭제**해야 함 (UI가 "영구 삭제"를 약속함). Cloud Function `onDelete` 또는 클라이언트 배치 삭제.

### 보안 규칙 초안
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isHost() { return request.auth != null && request.auth.token.firebase.sign_in_provider == 'google.com'
                         && exists(/databases/$(db)/documents/admins/$(request.auth.uid)); }
    match /boards/{boardId} {
      allow read: if request.auth != null;
      allow create: if isHost() && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if isHost() && resource.data.ownerUid == request.auth.uid;
      match /postits/{pid} {
        allow read: if request.auth != null;
        allow create: if request.auth != null
          && request.resource.data.body.size() <= 200
          && request.resource.data.likes == 0
          && request.resource.data.authorUid == request.auth.uid;
        // 참여자는 likes만 +1 가능, 그 외 수정·삭제는 강사만
        allow update: if isHost() || (request.auth != null
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes'])
          && request.resource.data.likes == resource.data.likes + 1);
        allow delete: if isHost();
      }
    }
    match /boardCodes/{code} { allow read: if request.auth != null; allow write: if isHost(); }
    match /admins/{uid} { allow read: if request.auth.uid == uid; }
  }
}
```
Storage: `boards/{boardId}/{file}` — 인증 사용자 쓰기 허용, `image/*`, ≤5MB.

---

## Screens / Views

### 1. 참여자 — 코드 입력 (`/`, `/b/:code`에서 코드가 없을 때)
- 파일: `guest-mobile.jsx` → `GuestJoin`
- 제목 "보드 코드를 입력하세요", 부제 "강사님 화면에 보이는 6자리 코드예요"
- 입력: JetBrains Mono 24px, letter-spacing .3em, 가운데 정렬, 대문자·영숫자만, maxLength 6
- 6자리 미만이면 "입장하기" 버튼 opacity .5 + disabled
- 없는 코드 → 빨간(#dc2626) 12px "코드에 해당하는 보드를 찾을 수 없어요"
- QR로 들어오면 `/b/:code` → 보드가 있으면 바로 입력 화면

### 2. 참여자 — 의견 작성 (`/b/:code`)
- 파일: `guest-mobile.jsx` → `GuestForm`
- 헤더: 보드 `subtitle · title`
- 카테고리 칩(질문/칭찬/개선점/기타), 포스트잇 색 8종 선택, 본문 textarea(≤200자, 카운터), 이름 입력 + 익명 토글, 사진 첨부(선택)
- 제출 후 1.8초 완료 상태 → 폼 리셋
- 실시간: 보드가 삭제되면 코드 입력 화면으로 돌려보낼 것

### 3. 강사 — 로그인 (`/host`, 미인증)
- 현재 `host-gate.jsx`(PIN 키패드)의 **카드·배경·구름 비주얼은 유지**, 내용을 "Google로 로그인" 버튼 하나로 교체
- 허용되지 않은 계정이면 "등록된 강사 계정이 아닙니다" 에러

### 4. 강사 — 보드 선택 (`/host`, 인증됨)
- 파일: `board-lobby.jsx` → `BoardLobby`
- 흰 카드 max-width 720px, radius 22px, padding 36/36/20, 그림자 `0 30px 60px rgba(0,0,0,.35), 0 8px 16px rgba(0,0,0,.18)`, 배경은 gate-stage(밤하늘+구름)
- 헤더: "보드 선택" + "이어서 진행할 보드를 열거나 새 보드를 만드세요." / 오른쪽 "+ 새 보드" (primary)
- 보드 행: grid `1fr auto auto`, gap 20, padding 14/12/14/18, border 1px rgba(0,0,0,.07), radius 14. hover시 border `--accent`, bg #f6f9fc
  - 제목 15px/700, 메타 12px `subtitle · 강사 이름`
  - 코드 배지(JetBrains Mono 12px/600, accent 색, bg rgba(43,91,138,.08), radius 6), "의견 N", 날짜 `YYYY.MM.DD`
  - 수정(연필), 삭제(휴지통) 아이콘 버튼 34×34. 삭제 hover: bg #fef2f2, color #dc2626
- 행 클릭 → 이륙 애니메이션 → 벽
- 빈 상태: 점선 박스 "저장된 보드가 없어요 / 교육명과 강사 이름을 입력해 첫 보드를 만들어보세요."
- 하단 "로그아웃"
- 정렬: createdAt 내림차순

### 5. 모달 — 새 보드 / 보드 정보 수정
- `BoardForm`. 카드 max-width 420, radius 18, padding 28. 백드롭 rgba(10,20,40,.55). ESC/바깥 클릭 닫기
- 필드: 교육명(필수, ≤40), 기수·부제(선택, ≤40), 강사 이름(필수, ≤20)
- 필수 미입력 시 저장 버튼 disabled (opacity .4)
- 생성 → 바로 이륙 애니메이션 → 새 보드 벽

### 6. 모달 — 보드 삭제 확인
- `DeleteBoardConfirm`. 빨간 원형 "!" 아이콘(44px, bg #fef2f2)
- 문구: "**{title}** 보드와 포스트잇 **N개**가 DB에서 **영구적으로 삭제**됩니다. 이 작업은 되돌릴 수 없습니다." ("영구적으로 삭제"는 빨강)
- 보드 코드를 정확히 입력해야 "영구 삭제"(#dc2626) 버튼 활성. Enter로도 실행

### 7. 이륙 애니메이션 (보드 진입 전환)
- `Takeoff` (board-lobby.jsx) + HTML `<style>`의 `.takeoff*` 키프레임. 총 2.0s, 1.3s 시점에 라우트 전환, 2.0s에 오버레이 제거
- 밤하늘(#1e3a5f→#2c5282→#3d6694) → 활주로 점선이 빠르게 흐름 → 비행기 가속(0–36%) → 기수 들기(48%, -14°) → 우상단으로 상승하며 축소(100%, scale .45) + 비행운
- 42–100% 구름 3개가 위→아래로 통과, 45–72% 하늘이 벽 배경색(--sky-1/2/3)으로 밝아짐
- 중앙 라벨 "TAKE OFF · {code}" + 교육명: 10–24% 등장, 50–64% 위로 사라짐
- 전체 오버레이 0–8% 페이드인, 70–100% 페이드아웃 → 벽이 드러남
- `prefers-reduced-motion: reduce` 이면 연출 생략
- 키프레임 수치는 HTML 그대로 옮길 것

### 8. 강사 — 포스트잇 벽 (`/host/:boardId`)
- 파일: `postit-wall.jsx` → `PostitWall`, `Postit`, `FocusView`
- 상단 바: 왼쪽 브랜드(✈ 마크 + 교육명 + `subtitle · 강사 이름`) — **클릭하면 보드 정보 수정 모달**(hover 시 연필 아이콘 노출)
- 오른쪽 칩: "참여 코드 {code}", "✎ N개의 의견", "보드 목록", "로그아웃"
- 오른쪽 QR 카드: 실제 QR + `도메인/b/{code}`
- 하단 필터 바: 전체/질문/칭찬/개선점/기타 (개수 포함)
- 포스트잇: 살짝 회전·흔들림(sway), 좋아요 버튼(하트 버스트), 사진 있으면 폴라로이드
- 빈 보드: 화면 중앙 노란 포스트잇(340px, -2° 회전) "아직 붙은 의견이 없어요 / 오른쪽 QR을 스캔해 첫 포스트잇을 남겨주세요"
- 필터 결과 없음: 흰 알약 "이 카테고리에는 아직 의견이 없어요"
- 새 포스트잇은 Firestore `onSnapshot`으로 실시간 등장(등장 애니메이션 유지)
- 보드가 삭제되면 `/host`로 이동

### 9. 포커스 뷰 (포스트잇 클릭 시 확대)
- `FocusView`. 프로젝터 투사용 확대
- 메타(작성자·시간)는 하단 푸터. 사진이 있으면 우상단 썸네일(전체 미리보기, crop 없음)
- 썸네일 클릭 시 사진↔글 메인 전환: **shared-element transform 방식** — 카드는 실제 크기 유지, `transform: translate + scale`만 애니메이트(레이아웃 속성 애니메이트 금지 — 리플로우·글자 크기 튐 방지)
- ESC/배경 클릭 닫기

---

## Design Tokens
```
--ink: #1a2438        --ink-soft: #4a5570     --paper: #fafbfd
--sky-1: #d6e7f5      --sky-2: #eaf3fb        --sky-3: #fdfcf6
--accent: #2b5b8a (hover #234c74)             --accent-warm: #c98a4b
danger: #dc2626 (hover #b91c1c, tint #fef2f2)
--shadow-soft: 0 6px 18px rgba(30,50,90,.08), 0 2px 4px rgba(30,50,90,.06)
--shadow-postit: 0 12px 22px -10px rgba(30,40,70,.35), 0 3px 6px rgba(30,40,70,.18)
포스트잇: yellow #fef08a, pink #fbcfe8, green #bbf7d0, blue #bae6fd,
          orange #fed7aa, purple #e9d5ff, mint #a7f3d0, white #fefefe
```
- 폰트: Pretendard(본문, CDN v1.3.9), Gowun Dodum / Nanum Pen Script(포스트잇 손글씨), Caveat(영문 손글씨), JetBrains Mono(코드)
- 버튼: radius 10, padding 10/18, 14px/600. 입력: radius 10, padding 11/13, 1.5px border rgba(0,0,0,.1), focus 시 accent border + `0 0 0 4px rgba(43,91,138,.12)`
- 모달 등장: `gate-in` .35s `cubic-bezier(.34,1.56,.64,1)`
- 배경 테마 4종: sky(기본) / dusk / cork / minimal — HTML의 `.sky-bg.theme-*` 참고

## Assets
- 아이콘은 모두 인라인 SVG(lucide 스타일, stroke 2). 이미지 에셋 없음.
- `SAMPLE_PHOTOS`(data.jsx)는 데모용 SVG — 실제 앱에서 제거, 데모 시드 기능만 필요하면 유지.
- `SEED_POSTITS`(data.jsx): 데모용 샘플 포스트잇 12개. 개발용 시드 스크립트로만 사용.

## Files (`prototype/`)
- `의견을 나누는 포스트잇.html` — 엔트리. **모든 CSS가 여기 `<style>`에 있음**
- `app.jsx` — 라우팅, 화면 전환, 이륙 트리거
- `board-store.jsx` — 저장소 API (Firestore로 교체 대상)
- `board-lobby.jsx` — 보드 선택, 생성/수정/삭제 모달, 이륙 애니메이션
- `postit-wall.jsx` — 벽, 포스트잇, QR, 포커스 뷰
- `guest-mobile.jsx` — 참여자 코드 입력·작성 폼
- `host-gate.jsx` — 강사 인증 카드 (비주얼만 재사용)
- `data.jsx` — 카테고리, 색상, 샘플 데이터
- `ios-frame.jsx`, `tweaks-panel.jsx` — 미리보기 전용, 이식 불필요

프로토타입 실행: 폴더를 정적 서버로 열고(`npx serve prototype`) HTML 파일 접속. `#host` → PIN 1212.

## 권장 작업 순서
1. Vite + React + Router 스캐폴드, CSS 추출, 컴포넌트 이식(Firebase 없이 메모리 store로 화면 재현)
2. Firebase 프로젝트 연결, Auth(Google/익명), `board-store`를 Firestore 구현으로 교체(onSnapshot)
3. Storage 사진 업로드, 실제 QR
4. 보안 규칙 + 보드 삭제 시 하위 데이터 정리
5. `firebase deploy` (Hosting: SPA rewrite `** → /index.html`)
