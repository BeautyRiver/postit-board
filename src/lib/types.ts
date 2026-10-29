export type CategoryId = 'question' | 'praise' | 'improve' | 'etc';
export type PostitColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange' | 'purple' | 'mint' | 'white';

export interface Board {
  id: string;
  code: string;          // 6자리, CODE_CHARS 문자셋
  title: string;         // ≤40
  subtitle: string;      // ≤40, 선택
  instructor: string;    // ≤20
  createdAt: number;     // ms
}

export interface Postit {
  id: string;
  body: string;          // ≤200
  author: string;        // 익명이면 '익명'
  anonymous: boolean;
  color: PostitColor;
  category: CategoryId;
  photoUrl: string | null;
  photoCaption: string | null;
  createdAt: number;     // ms
}

export type BoardInput = Pick<Board, 'title' | 'subtitle' | 'instructor'>;
export type PostitInput = Omit<Postit, 'id' | 'createdAt'>;
