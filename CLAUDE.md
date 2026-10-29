# postit-board

교육·연수용 실시간 포스트잇 피드백 보드 웹앱.
디자인 레퍼런스는 `design_handoff_postit_board/` (README.md + prototype/)에 있다.
목표 스택: Vite + React 18 + TypeScript + React Router + Firebase(Hosting, Firestore, Storage, Auth).

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

## 진행 단계 (design_handoff_postit_board/README.md "권장 작업 순서")
1. ✅ 화면 이식 (Firebase 없이, localStorage store) — 완료
2. Firebase 연결 (Auth, Firestore onSnapshot)
3. 사진 업로드(Storage) · 실제 QR
4. 보안 규칙 · 보드 삭제 시 하위 데이터 정리
5. 배포 설정 (Firebase Hosting)

## 코드 구조
- `src/lib/boardStore.ts` — 저장소 API(`BoardStore` + `useBoards/useBoard/useBoardByCode/usePostits/usePostitCount`). 모두 비동기·구독형이라 Firestore로 구현만 교체하면 됨
- `src/lib/auth.tsx` — 강사 인증(`useAuth`). 1단계는 임시 통과, 2단계에서 Firebase Auth로 교체
- `src/lib/image.ts` — 사진 리사이즈(1600px, JPEG 0.8). 1단계는 data URL로 저장, 3단계에서 Storage 업로드로 교체
- `src/styles/global.css` — 프로토타입 `<style>` 추출본. 맨 아래 "실제 앱 추가분" 섹션만 새로 작성한 부분
- `src/pages/` — GuestPage(`/`, `/b/:code`), HostGate·BoardLobby(`/host`), WallPage(`/host/:boardId`)
- `src/components/TakeoffProvider.tsx` — 이륙 애니메이션은 라우트 전환을 가로지르므로 앱 최상단에 둠
- `src/dev/seed.ts` — 개발용 샘플 보드(프로토타입 SEED_POSTITS). `npm run dev`의 보드 목록 하단 버튼으로만 노출

## 명령
- `npm run dev` — 개발 서버 (http://localhost:5173)
- `npm run build` — 타입체크 + 빌드 (커밋 전 필수)
- `npm run lint` — oxlint
