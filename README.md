# 의견을 나누는 포스트잇

교육·연수 현장용 실시간 피드백 보드.
참여자는 휴대폰으로 QR을 찍어 의견을 포스트잇처럼 붙이고, 강사는 프로젝터 화면에서 실시간으로 확인합니다.

## 기능
- 강사: 보드 생성·수정·삭제, 포스트잇 벽, 카테고리 필터, 확대 보기
- 참여자: QR로 접속 후 4자리 입장 코드로 입장(로그인 없음), 의견 작성, 익명 옵션

## 기술 스택
Vite · React · TypeScript · Firebase (Hosting, Firestore, Storage, Auth)

## 개발
​```
npm install
cp .env.example .env.local   # Firebase 설정값 입력
npm run dev
​```

## 배포
​```
npm run build
firebase deploy
​```

## 디자인 레퍼런스
`design_handoff_postit_board/` — HTML 프로토타입과 인계 문서
