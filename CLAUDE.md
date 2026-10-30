# postit-board

교육·연수용 실시간 포스트잇 피드백 보드 웹앱.
디자인 레퍼런스는 `design_handoff_postit_board/` (README.md + prototype/)에 있다.
목표 스택: Vite + React 19 + TypeScript + React Router + Firebase(Hosting, Firestore, Auth). **Storage는 사용하지 않음**(아래 결정 사항).
Firebase 콘솔 설정 절차는 `docs/firebase-setup.md` 참고.

## 작업 규칙
- 대화와 커밋 메시지는 한국어
- 디자인 수치(색상·간격·폰트·애니메이션 키프레임)는 prototype HTML의 `<style>` 값을 그대로 사용. 임의로 "개선"하지 말 것
- Tailwind 등 새 스타일 체계 도입 금지. 프로토타입 CSS를 추출해서 사용
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
  - 사진은 클라이언트에서 긴 변 1000px JPEG로 줄여 data URL로 포스트잇 문서 `photoUrl`에 저장 (Firestore 문서 1MiB 제한 → 인코딩 후 약 700KB 이하가 되도록 품질 조절)
  - Firestore 위치 `asia-northeast3`(서울)
- **입장 코드 = 4자리 숫자 세션 코드** (보드 고정 코드 없음)
  - QR은 사이트 첫 화면(`/`)으로만 연결 → 참여자가 벽에 표시된 4자리 코드를 입력해야 입장 (`/b/:code`)
  - 강사가 보드 목록에서 벽을 열 때마다 새 코드 발급(직전 코드·열려 있는 다른 방 코드와 겹치지 않게). 벽 새로고침은 코드 유지
  - 벽은 30초마다 하트비트(`lastSeen` 갱신). "보드 목록"/"로그아웃"으로 나가면 즉시 닫힘, 탭을 그냥 닫으면 90초 후 자동 닫힘
  - 닫힌 방 코드 입력 → "활성화된 방이 아니에요" 경고. 작성 중 방이 닫히면 코드 입력 화면으로 돌아가고 쓰던 글은 sessionStorage에 보관
  - 포스트잇은 열린 방의 현재 코드로만 붙일 수 있음(`addPostit(boardId, code, item)`). Firestore에서는 보안 규칙으로 강제할 것
  - Firestore 구조: `boards/{id}.session = {code, openedAt, lastSeen}` + `rooms/{code} → {boardId, ownerUid, title, subtitle, openedAt}`(코드 조회·중복 방지, 트랜잭션)
  - **읽기 절약 원칙**: 하트비트는 `boards` 문서에만 쓰고, 참여자는 `boards`를 구독하지 않는다(입장 시 1회 get). 참여자는 하트비트로 바뀌지 않는 `rooms/{code}`만 구독 → 강사가 나가면(rooms 삭제) 즉시 알림. 탭을 그냥 닫은 경우는 참여자가 제출할 때 보안 규칙이 거부(`RoomClosedError`)해서 알게 됨
  - 강사 권한: Google 로그인 + `admins/{uid}` 문서 존재. 미등록 계정이면 로그인 화면에 UID 표시
  - 보드 삭제 확인은 보드 코드 대신 `삭제` 입력
- **보드 저장**: 새 보드는 `saved: false`(임시). 벽의 "보드 저장" 버튼으로 저장한 보드만 남는다
  - 저장 안 한 보드에서 "보드 목록"/"로그아웃" → 확인 창(저장하고 나가기 / 저장 안 하고 나가기=보드·포스트잇 삭제 / 취소). 탭 닫기·새로고침은 브라우저 기본 경고
  - 탭을 그냥 닫아 남은 임시 보드는 목록에 '임시'로 표시, 방이 닫혀 있고 만든 지 24시간 지나면 보드 목록을 열 때 자동 삭제(`UNSAVED_BOARD_TTL_MS`)
  - `saved` 필드가 없는 기존 보드는 저장된 것으로 취급
- 벽 우하단 QR 카드를 누르면 화면 가득 큰 QR + 입장 코드 (배경 클릭·ESC로 닫기)

## 진행 단계 (design_handoff_postit_board/README.md "권장 작업 순서")
1. ✅ 화면 이식 (Firebase 없이, localStorage store) — 완료
2. ✅ Firebase 연결 (Auth, Firestore onSnapshot) — 완료
3. ✅ 사진 첨부 (1000px JPEG data URL, 700,000자 상한) — 완료
4. ✅ 보안 규칙(`firestore.rules`, 테스트 `tests/`) · 보드 삭제 시 포스트잇·방 삭제 — 완료 (규칙 변경 시 콘솔에 다시 게시 필요)
5. ✅ 배포 설정 (Firebase Hosting + GitHub Actions 자동 배포) — 완료

## 코드 구조
- `src/lib/firebase.ts` — Firebase 초기화(.env.local). `VITE_USE_EMULATORS=true`면 로컬 에뮬레이터 연결
- `src/lib/boardStore.ts` — Firestore 저장소 API(`BoardStore` + `openSession/heartbeat/closeSession/findByCode`, 훅 `useBoards/useBoard/useRoom/usePostits/usePostitCount/useNow`)
- `src/lib/auth.tsx` — 강사 Google 로그인+admins 확인(`useAuth`), 참여자 익명 로그인(`useGuestAuth`, `ensureGuestUser`). 에뮬레이터 모드에서만 `window.__emulatorGoogleUser`로 팝업 없이 테스트 로그인 가능
- `src/lib/image.ts` — 사진 → 1000px JPEG data URL (700,000자 넘으면 품질·크기 단계적 축소). 상한은 `firestore.rules`와 같은 값
- `firestore.rules` — 보안 규칙 (세션 코드·하트비트 90초 검증, 입력 길이·형식 검증). `tests/firestore.rules.test.mjs`로 검증
- `src/styles/global.css` — 프로토타입 `<style>` 추출본. 맨 아래 "실제 앱 추가분" 섹션만 새로 작성한 부분
- `src/pages/` — GuestPage(`/`, `/b/:code`), HostGate·BoardLobby(`/host`), WallPage(`/host/:boardId`)
- `src/components/TakeoffProvider.tsx` — 이륙 애니메이션은 라우트 전환을 가로지르므로 앱 최상단에 둠
- `src/dev/seed.ts` — 개발용 샘플 보드(프로토타입 SEED_POSTITS). `npm run dev`의 보드 목록 하단 버튼으로만 노출

## 배포
- Firebase 프로젝트 ID: `postit-board-74a67` → https://postit-board-74a67.web.app
- `main` 푸시 시 GitHub Actions(`.github/workflows/firebase-hosting-merge.yml`)가 빌드·배포. 빌드용 설정값은 Secret `ENV_LOCAL`(= `.env.local` 전체 내용)
- 배포 실패 여부는 푸시 후 Actions 실행 결과로 확인할 것

## 명령
- `npm run dev` — 개발 서버 (http://localhost:5173)
- `npm run build` — 타입체크 + 빌드 (커밋 전 필수)
- `npm run lint` — oxlint
- `npm run test:rules` — 보안 규칙 테스트 (Firebase CLI + Java 필요, 에뮬레이터 자동 실행)
- `npm run emulators` — 로컬 에뮬레이터 (docs/firebase-setup.md 10번)
