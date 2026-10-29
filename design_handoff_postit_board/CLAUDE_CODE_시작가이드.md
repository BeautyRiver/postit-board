# Claude Code 시작 가이드

## 0. 준비 (한 번만)

**GitHub 저장소 만들기**
1. github.com → New repository → 이름 `postit-board`, Private, README 체크 해제
2. PC에서:
```
mkdir postit-board && cd postit-board
git init
# 다운로드한 design_handoff_postit_board 폴더를 이 안에 복사
git add . && git commit -m "design handoff"
git branch -M main
git remote add origin https://github.com/<계정>/postit-board.git
git push -u origin main
```
3. 노트북에서: `git clone https://github.com/<계정>/postit-board.git`

**Firebase 콘솔 (작업 2단계 전까지)**
- 프로젝트 생성 → 웹 앱 추가 → 설정값(apiKey 등) 복사
- Authentication: Google, 익명 사용 설정
- Firestore, Storage 생성 (프로덕션 모드)

**두 기기 공통**
- Node 20+, `npm i -g firebase-tools`, `firebase login`
- `.env.local`(Firebase 설정값)은 git에 올라가지 않으므로 **기기마다 직접 복사**

**기기 바꿀 때 습관**
- 작업 시작: `git pull`
- 작업 끝: Claude Code에게 "커밋하고 푸시해줘"

---

## 1. 첫 프롬프트 (저장소 루트에서 `claude` 실행 후 붙여넣기)

```
이 저장소는 교육·연수용 실시간 피드백 보드 웹앱 프로젝트야.
design_handoff_postit_board/README.md 를 먼저 끝까지 읽고,
prototype/ 폴더의 HTML·JSX 파일들도 전부 읽어서 디자인과 동작을 파악해줘.

prototype은 디자인 레퍼런스일 뿐 그대로 쓰는 코드가 아니야.
README의 "목표 스택"대로 Vite + React + TypeScript + React Router로 새로 구현할 거야.

읽고 나서 바로 코드 쓰지 말고:
1. 프로젝트 이해한 내용 요약
2. 폴더 구조 제안
3. README "권장 작업 순서" 기준 단계별 계획
4. 모호하거나 결정이 필요한 점 질문
을 먼저 보여줘. 그리고 저장소 루트에 CLAUDE.md를 만들어서
아래 "작업 규칙"을 넣어줘.

작업 규칙:
- 대화와 커밋 메시지는 한국어
- 디자인 수치(색상·간격·폰트·애니메이션 키프레임)는 prototype HTML의 <style> 값을 그대로 사용. 임의로 "개선"하지 말 것
- Tailwind 등 새 스타일 체계 도입 금지. 프로토타입 CSS를 추출해서 사용
- iOS 프레임, Tweaks 패널, URL 바, PIN 1212, 가짜 QR은 이식하지 않음
- 저장소 API(list/create/update/remove/addPostit/like, useBoards) 형태는 유지하고 구현만 교체
- 단계 하나 끝날 때마다 `npm run build` 통과 확인 후 커밋
- 비밀값은 .env.local, .gitignore에 반드시 포함
- design_handoff_postit_board/ 폴더는 수정하지 말 것 (레퍼런스)
```

---

## 2. 단계별 프롬프트

계획을 확인하고 OK 한 뒤, 단계마다 하나씩 보내세요.

**1단계 — 화면 이식 (Firebase 없이)**
```
1단계 진행해줘. Vite + React + TS + React Router 스캐폴드하고,
prototype의 CSS를 추출하고, 모든 화면을 이식해줘.
저장소는 일단 메모리(또는 localStorage) 구현으로.
라우트: / , /b/:code , /host , /host/:boardId
강사 로그인 화면은 비주얼만 만들고 "Google로 로그인" 버튼은 임시로 통과 처리.
끝나면 npm run dev 로 확인할 화면 목록과 확인 방법 알려줘.
```

**2단계 — Firebase 연결**
```
2단계 진행해줘. Firebase SDK 설치, src/lib/firebase.ts 작성,
설정값은 .env.local 의 VITE_FIREBASE_* 로 읽게 하고 .env.example 도 만들어줘.
- 강사: Google 로그인 + admins/{uid} 문서로 권한 확인
- 참여자: 익명 로그인 (자동)
- board-store를 Firestore 구현으로 교체 (README 데이터 모델 그대로, onSnapshot 실시간)
- 보드 코드 유니크는 boardCodes/{code} 트랜잭션으로
내가 콘솔에서 해야 할 일(admins 문서 추가 등)은 따로 목록으로 알려줘.
```

**3단계 — 사진·QR**
```
3단계 진행해줘.
- 참여자 사진 첨부: 실제 파일 선택/카메라, 클라이언트에서 최대 1600px JPEG 0.8로 리사이즈 후 Storage 업로드, 업로드 중 상태 표시
- 벽의 QR을 실제 QR(qrcode.react)로 교체, URL은 window.location.origin + /b/{code}
```

**4단계 — 보안 규칙·삭제 정리**
```
4단계 진행해줘.
- README 보안 규칙 초안 기반으로 firestore.rules, storage.rules 작성
- 보드 삭제 시 postits 서브컬렉션과 Storage 사진까지 모두 삭제되게
- 좋아요 중복 방지 (기기당 포스트잇 1회)
- Firebase 에뮬레이터로 규칙 테스트하는 방법도 알려줘
```

**5단계 — 배포**
```
5단계 진행해줘. firebase.json(Hosting, SPA rewrite), .firebaserc 설정하고
배포 전 체크리스트 정리해줘. 배포 명령은 내가 직접 실행할게.
```

---

## 3. 이어서 작업할 때 (새 세션·다른 기기)

```
git log 최근 커밋이랑 CLAUDE.md 확인하고, 지금 어느 단계까지 됐는지 요약한 뒤
다음 할 일 제안해줘.
```
