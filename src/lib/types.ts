export type CategoryId = 'question' | 'praise' | 'improve' | 'etc';
export type PostitColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange' | 'purple' | 'mint' | 'white';

// 강사가 벽을 열어 둔 동안만 유효한 입장 세션. 벽을 새로 열 때마다 새 4자리 코드 발급
export interface BoardSession {
  code: string;          // 4자리 숫자
  openedAt: number;      // ms
  lastSeen: number;      // ms — 벽 화면이 주기적으로 갱신(하트비트). 오래되면 닫힌 것으로 본다
}

// Firestore boards/{id}
export interface Board {
  id: string;
  ownerUid: string;
  session: BoardSession | null;  // null = 닫힘
  saved: boolean;        // 강사가 '저장'한 보드만 남는다. 저장 안 한 보드는 나갈 때 삭제(또는 24시간 뒤 자동 삭제)
  title: string;         // ≤40
  subtitle: string;      // ≤40, 선택
  instructor: string;    // ≤20
  createdAt: number;     // ms
}

// Firestore rooms/{code} — 참여자가 코드로 찾고 구독하는 문서. 열 때 만들고 닫을 때 지움.
// 하트비트는 boards 문서에만 쓰므로 참여자 구독에는 영향이 없다 (읽기 횟수 절약)
export interface RoomInfo {
  code: string;
  boardId: string;
  title: string;
  subtitle: string;
}

// Firestore boards/{id}/postits/{postitId}
export interface Postit {
  id: string;
  body: string;          // ≤200
  author: string;        // 익명이면 '익명'
  anonymous: boolean;
  color: PostitColor;
  category: CategoryId;
  photoUrl: string | null;     // 사진 data URL (Storage 미사용)
  photoCaption: string | null;
  createdAt: number;     // ms
}

export type BoardInput = Pick<Board, 'title' | 'subtitle' | 'instructor'>;
export type PostitInput = Omit<Postit, 'id' | 'createdAt'>;
