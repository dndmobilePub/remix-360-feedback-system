export interface Member {
  id: string;
  name: string;
  team: string;
  isAvailable: boolean;
  loginCode?: string;
  isFirstLogin?: boolean;
}

export type SessionType = "360도 다면 피드백" | "인사이트 피드백";
export type SessionStatus = "진행중" | "완료";
export type Choice = "좋아요" | "그저그래요" | "싫어요";

export interface Feedback {
  good: string;
  suggestions: string;
  rehire?: boolean;
  workRehire?: Choice;
  personalRehire?: Choice;
  authorHash?: string;
}

export interface FeedbackSession {
  id: string;
  year: string;
  type: SessionType;
  period: string;
  code: string;
  status?: SessionStatus;
  members: Member[];
  feedbacks?: Record<string, Feedback[]>;
  insights?: { content: string; authorHash: string }[];
}

export type ToastType = "success" | "warning";
export type ShowToast = (message: string, type?: ToastType) => void;
