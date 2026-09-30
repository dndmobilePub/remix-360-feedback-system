import type { FeedbackSession } from "../types";

const toDate = (s: string) => new Date(s.replace(/\./g, "-"));

// 완료 상태이거나 오픈 기간 마지막날 23:50 이후면 마감으로 간주
export const isSessionActive = (session: FeedbackSession | null | undefined): boolean => {
  if (!session) return false;
  if (session.status === "완료") return false;
  if (!session.period || !session.period.includes(" - ")) return true;
  const [s, e] = session.period.split(" - ");
  const now = new Date();
  const end = toDate(e);
  end.setHours(23, 50, 0, 0);
  return now >= toDate(s) && now < end;
};

export const sessionStatusText = (session: FeedbackSession): string => {
  if (session.status === "완료") return "완료";
  if (!session.period || !session.period.includes(" - ")) return session.status || "진행중";
  const [s, e] = session.period.split(" - ");
  const now = new Date();
  const end = toDate(e);
  end.setHours(23, 50, 0, 0);
  if (now < toDate(s)) return "예정";
  if (now >= end) return "완료";
  return session.status || "진행중";
};
