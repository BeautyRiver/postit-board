# postit-board

교육·연수용 실시간 포스트잇 피드백 보드 웹앱.
처음 디자인의 출발점은 `design_handoff_postit_board/` (README.md + prototype/)에 있다. 지금은 따라야 할 기준이 아니라 참고 자료.
목표 스택: Vite + React 19 + TypeScript + React Router + Firebase(Hosting, Firestore, Auth). **Storage는 사용하지 않음**(아래 결정 사항).
Firebase 콘솔 설정 절차는 `docs/firebase-setup.md` 참고.

## 작업 규칙
- 대화와 커밋 메시지는 한국어
- 디자인(색상·간격·폰트·애니메이션)은 프로토타입 수치에 얽매이지 않고 더 좋게 다듬어도 된다 (사용자 결정으로 '프로토타입 그대로' 규칙 폐지)
- 스타일은 `src/styles/global.css`(일반 CSS)로 관리. Tailwind 등 다른 스타일 체계를 섞지 말 것
- iOS 프레임, Tweaks 패널, URL 바, PIN 1212, 가짜 QR은 이식하지 않음
- 저장소 API(list/create/update/remove/addPostit, useBoards) 형태는 유지하고 구현만 교체 (`like`는 결정에 따라 제거)
- 단계 하나 끝날 때마다 `npm run build` 통과 확인 후 커밋
- 비밀값은 `.env.local`, `.gitignore`에 반드시 포함
- `design_handoff_postit_board/` 폴더는 수정하지 말 것 (레퍼런스)

## Git
- 1인 개발이므로 `main`에 바로 커밋·푸시한다 (작업 시작 전 `git pull`)

## 결정 사항 (핸드오프 README와 다른 점)
- 브랜딩: 특정 회사 문구 제거. 강사 화면 하단 문구는 `의견을 나누는 포스트잇 · Live Feedback Board`
- 배경 테마는 sky 고정, 포스트잇 흔들림(sway) 항상 켬 (보드별 설정 없음)
- **좋아요 기능 제거**: 하트 버튼·버스트, 포커스 뷰 "N명이 공감했어요", `like()` API, `likes` 필드 모두 없음
- **강사 답변 기능 제거**: `answered`, `answer` 필드 없음
- 의견 수: 보드 문서에 `postitCount`를 두지 않고, 보드 목록·삭제 확인 시 Firestore count 집계 쿼리(`getCountFromServer`)로 조회. 벽 화면은 onSnapshot으로 실시간
- Cloud Functions 사용 안 함 (무료 Spark 요금제 기준)
- **카드 등록 없는 Spark 요금제 유지 → Cloud Storage 미사용** (2024.10 이후 Storage는 Blaze 필수)
  - **사진 첨부 기능은 제거함**(사용자 결정). 규칙이 `photoUrl == null`만 허용. 벽·포커스 뷰의 사진 표시 코드는 예전 데이터용으로 남김. 다시 넣으려면 git 기록의 `src/lib/image.ts`(1000px JPEG data URL, 700,000자 상한) 참고
  - Firestore 위치 `asia-northeast3`(서울)
- **입장 코드 = 4자리 숫자 세션 코드** (보드 고정 코드 없음)
  - QR은 사이트 첫 화면(`/`)으로만 연결 → 참여자가 벽에 표시된 4자리 코드를 입력해야 입장 (`/b/:code`)
  - 강사가 보드 목록에서 벽을 열 때마다 새 코드 발급(직전 코드·열려 있는 다른 방 코드와 겹치지 않게). 벽 새로고침은 코드 유지
  - 벽은 30초마다 하트비트(`lastSeen` 갱신). "보드 목록"/"로그아웃"으로 나가면 즉시 닫힘, 탭을 그냥 닫으면 5분 후 자동 닫힘(사용자 결정)(`SESSION_TTL_MS` = 규칙 `roomIsOpen`). 하트비트가 끊겼다 돌아와도(PPT 전환·절전·PC 시계 오차) 그 코드를 다른 방이 안 가져갔으면 **같은 코드로 다시 열림**, 화면이 다시 보이면 즉시 하트비트
  - 닫힌 방 코드 입력 → "활성화된 방이 아니에요" 경고. 작성 중 방이 닫히면 코드 입력 화면으로 돌아가고 쓰던 글은 sessionStorage에 보관
  - 포스트잇은 열린 방의 현재 코드로만 붙일 수 있음(`addPostit(boardId, code, item)`). Firestore에서는 보안 규칙으로 강제할 것
  - Firestore 구조: `boards/{id}.session = {code, openedAt, lastSeen}` + `rooms/{code} → {boardId, ownerUid, title, subtitle, openedAt}`(코드 조회·중복 방지, 트랜잭션)
  - **읽기 절약 원칙**: 하트비트는 `boards` 문서에만 쓰고, 참여자는 `boards`를 구독하지 않는다(입장 시 1회 get). 참여자는 하트비트로 바뀌지 않는 `rooms/{code}`만 구독 → 강사가 나가면(rooms 삭제) 즉시 알림. 탭을 그냥 닫은 경우는 참여자가 제출할 때 보안 규칙이 거부(`RoomClosedError`)해서 알게 됨
  - 강사 권한: Google 로그인 + `admins/{uid}` 문서 존재. 미등록 계정이면 로그인 화면에 UID 표시
  - **참여자는 로그인하지 않음** (익명 로그인 제거). 100명 부하 테스트에서 같은 IP의 익명 계정 생성이 시간당 약 100개로 막힘 → 강의실 공용 와이파이에서 입장 불가 위험. 규칙이 로그인 없이 `rooms`·`boards` 단건 get과 포스트잇 create(열린 방·코드·형식 검증)만 허용
  - 참여자 읽기: 입장하기(방+보드 2회) → 방 구독(1회, 방금 확인한 결과 재사용) → 제출 시 규칙 확인(1회). 실측(익명 로그인 시절, 93명·122개): 참여자 587회 + 벽 약 130회
  - 보드 삭제 확인은 보드 코드 대신 `삭제` 입력
- **보드 저장**: 새 보드는 `saved: false`(임시). 벽의 "보드 저장" 버튼으로 저장한 보드만 남는다
  - 저장 안 한 보드에서 "보드 목록"/"로그아웃" → 확인 창(저장하고 나가기 / 저장 안 하고 나가기=보드·포스트잇 삭제 / 취소). 탭 닫기·새로고침은 브라우저 기본 경고
  - 탭을 그냥 닫아 남은 임시 보드는 목록에 '임시'로 표시, 방이 닫혀 있고 만든 지 24시간 지나면 보드 목록을 열 때 자동 삭제(`UNSAVED_BOARD_TTL_MS`)
  - `saved` 필드가 없는 기존 보드는 저장된 것으로 취급
- 벽 우하단 QR 카드를 누르면 화면 가득 큰 QR + 입장 코드 (배경 클릭·ESC로 닫기)
- **참여자 화면 문구**: 보드마다 `prompt`(질문, ≤40)·`placeholder`(입력칸 안내, ≤80). 비어 있으면 기본 문구(`DEFAULT_PROMPT`, `DEFAULT_PLACEHOLDER`). 보드 만들기/수정 창에서 편집 + 예시 질문 칩 + 휴대폰 화면 실시간 미리보기(`GuestForm`을 `preview` 모드로 재사용). 열린 방이면 `rooms` 문서에도 복사돼 참여자 화면에 즉시 반영
- **전체화면(발표) 모드**: 벽 상단 "전체화면" → 브라우저 전체화면. QR·필터 바 숨김, 참여 코드는 상단에 유지. ESC 또는 "전체화면 종료"로 복귀
  - 보기 방식(옵션): **한 화면에 모두**(`fitPresentation`, 스크롤 없이 맞춤, 적으면 최대 1.8배) / **페이지 넘기기**(`pagedPresentation`, 줄이지 않은 크기로 나눠 보여주고 ←→·PageUp/Down·스페이스·하단 버튼으로 넘김)
- **벽 화면 옵션** (상단 "옵션" 버튼, `src/components/WallOptions.tsx`, `src/lib/wallSettings.ts`): 포스트잇 크기(0.85/1/1.25/1.5배) · 글씨 크기(12/14/17/20px, 줄 수 6/5/4/3) · 간격(24/40/80px) · 전체화면 보기 방식 · 보드 정보·참여자 문구 수정 · 기본값으로. 기본값 = 프로토타입 수치. **강사 PC 브라우저(localStorage)에 저장**(보드별 아님)
  - 포스트잇 크기는 CSS `scale` 속성으로 키우고 위치를 보정(`Postit`의 `scale` prop). 칸 크기 = 200×배율 + 간격
  - 좁은 화면(≤1200px)에서는 상단 아이콘 버튼의 글자를 숨기고 긴 교육명은 말줄임 처리

- **모션 시스템** (audit-suite `web-animation-design`·`make-interfaces-feel-better` 기준, `global.css` 맨 아래 "모션 시스템" 섹션 + `src/lib/motion.ts`)
  - 모든 오버레이는 열릴 때·닫힐 때 애니메이션: 닫기는 `useExitTransition(onClose)` → `.is-closing` 클래스로 퇴장(170ms) 후 언마운트. `Modal`은 children 함수로 `close`를 넘겨 취소·저장 성공도 애니메이션으로 닫힘 (부모의 onSave/onConfirm에서 바로 닫지 말 것)
  - 입장 ease-out 200~300ms·튕김 없음, 퇴장은 더 짧게, 배경과 카드는 같은 곡선. transform·opacity만 애니메이션, `transition: all` 금지
  - 버튼 누름 `scale: .97`(개별 scale 속성), hover 움직임은 `@media (hover: hover)`에서만, 작은 버튼 누름 영역 40px 확보
  - `prefers-reduced-motion: reduce`면 모든 애니메이션 끔 (닫기도 즉시)

## 진행 단계 (design_handoff_postit_board/README.md "권장 작업 순서")
1. ✅ 화면 이식 (Firebase 없이, localStorage store) — 완료
2. ✅ Firebase 연결 (Auth, Firestore onSnapshot) — 완료
3. ✅ 사진 첨부 — 구현 후 사용자 결정으로 제거
4. ✅ 보안 규칙(`firestore.rules`, 테스트 `tests/`) · 보드 삭제 시 포스트잇·방 삭제 — 완료. 규칙은 GitHub Actions가 테스트 후 자동 게시
5. ✅ 배포 설정 (Firebase Hosting + GitHub Actions 자동 배포) — 완료

## 코드 구조
- `src/lib/firebase.ts` — Firebase 초기화(.env.local). `VITE_USE_EMULATORS=true`면 로컬 에뮬레이터 연결
- `src/lib/boardStore.ts` — Firestore 저장소 API(`BoardStore` + `openSession/heartbeat/closeSession/findByCode`, 훅 `useBoards/useBoard/useRoom/usePostits/usePostitCount/useNow`)
- `src/lib/auth.tsx` — 강사 Google 로그인+admins 확인(`useAuth`). 참여자는 로그인 없음. 에뮬레이터 모드에서만 `window.__emulatorGoogleUser`로 팝업 없이 테스트 로그인 가능
- `firestore.rules` — 보안 규칙 (세션 코드·하트비트 5분 검증, 입력 길이·형식 검증). `tests/firestore.rules.test.mjs`로 검증
- `src/styles/global.css` — 전체 스타일. 앞부분은 프로토타입 `<style>`에서 가져온 것, 맨 아래 "실제 앱 추가분"은 새로 작성한 부분
- `src/pages/` — GuestPage(`/`, `/b/:code`, `GuestForm`은 보드 설정 미리보기에도 사용), HostGate·BoardLobby(`/host`), WallPage(`/host/:boardId`, 전체화면 모드 포함)
- `src/components/TakeoffProvider.tsx` — 이륙 애니메이션은 라우트 전환을 가로지르므로 앱 최상단에 둠
- `src/dev/seed.ts` — 개발용 샘플 보드(프로토타입 SEED_POSTITS). `npm run dev`의 보드 목록 하단 버튼으로만 노출

## 배포
- Firebase 프로젝트 ID: `postit-board-74a67` → https://postit-board-74a67.web.app
- `main` 푸시 시 GitHub Actions(`.github/workflows/firebase-hosting-merge.yml`)가 빌드·배포. 빌드용 설정값은 Secret `ENV_LOCAL`(= `.env.local` 전체 내용)
- 같은 워크플로가 `firestore.rules` 테스트(에뮬레이터, 14개) → 사이트 배포 → **규칙 자동 게시**(`firebase deploy --only firestore:rules`)까지 수행. 규칙 테스트가 실패하면 아무것도 배포하지 않음. 배포용 서비스 계정에 `Firebase Rules Admin`·`Service Usage Consumer` 역할 필요(docs/firebase-setup.md 4-1)
- 배포 실패 여부는 푸시 후 Actions 실행 결과로 확인할 것

## 명령
- `npm run dev` — 개발 서버 (http://localhost:5173)
- `npm run build` — 타입체크 + 빌드 (커밋 전 필수)
- `npm run lint` — oxlint
- `npm run test:rules` — 보안 규칙 테스트 (Firebase CLI + Java 필요, 에뮬레이터 자동 실행)
- `npm run emulators` — 로컬 에뮬레이터 (docs/firebase-setup.md 10번)
