# postit-board

교육·연수용 실시간 포스트잇 피드백 보드 웹앱.
디자인 레퍼런스는 `design_handoff_postit_board/` (README.md + prototype/)에 있다.
목표 스택: Vite + React 18 + TypeScript + React Router + Firebase(Hosting, Firestore, Storage, Auth).

## 작업 규칙
- 대화와 커밋 메시지는 한국어
- 디자인 수치(색상·간격·폰트·애니메이션 키프레임)는 prototype HTML의 `<style>` 값을 그대로 사용. 임의로 "개선"하지 말 것
- Tailwind 등 새 스타일 체계 도입 금지. 프로토타입 CSS를 추출해서 사용
- iOS 프레임, Tweaks 패널, URL 바, PIN 1212, 가짜 QR은 이식하지 않음
- 저장소 API(list/create/update/remove/addPostit/like, useBoards) 형태는 유지하고 구현만 교체
- 단계 하나 끝날 때마다 `npm run build` 통과 확인 후 커밋
- 비밀값은 `.env.local`, `.gitignore`에 반드시 포함
- `design_handoff_postit_board/` 폴더는 수정하지 말 것 (레퍼런스)

## 진행 단계 (design_handoff_postit_board/README.md "권장 작업 순서")
1. 화면 이식 (Firebase 없이, 메모리/localStorage store)
2. Firebase 연결 (Auth, Firestore onSnapshot)
3. 사진 업로드(Storage) · 실제 QR
4. 보안 규칙 · 보드 삭제 시 하위 데이터 정리
5. 배포 설정 (Firebase Hosting)
