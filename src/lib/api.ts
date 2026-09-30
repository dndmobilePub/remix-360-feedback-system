import { supabase } from "./supabase";
import type { Choice, FeedbackSession, Member, SessionStatus, SessionType } from "../types";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

interface RawMember {
  id: string;
  name: string;
  team: string;
}
interface RawFeedback {
  good: string;
  suggestions: string;
  rehire: boolean | null;
  workRehire: Choice | null;
  personalRehire: Choice | null;
}

interface RawMySession {
  id: string;
  year: string;
  type: SessionType;
  period: string;
  status: SessionStatus;
  members: RawMember[];
  myFeedbacks: (RawFeedback & { targetId: string })[];
  myInsight: string | null;
}

interface RawAdminSession {
  id: string;
  year: string;
  type: SessionType;
  period: string;
  code: string;
  status: SessionStatus;
  members: RawMember[];
  feedbacks: Record<string, RawFeedback[]>;
  insights: { content: string }[];
}

const toMember = (m: RawMember): Member => ({ ...m, isAvailable: true });
const payloadMembers = (members: Member[]) => members.map(({ name, team }) => ({ name, team }));

export const api = {
  /* ---------- 직원 ---------- */
  memberLogin: (name: string, code: string) =>
    rpc<{ id: string; name: string; team: string; isFirstLogin: boolean }>("member_login", {
      p_name: name,
      p_code: code,
    }),

  changeCode: (name: string, code: string, newCode: string) =>
    rpc<void>("member_change_code", { p_name: name, p_code: code, p_new: newCode }),

  // 내가 속한 세션만 조회. 내가 쓴 피드백/인사이트만 포함되며 기존 UI 구조(authorHash = 내 id)에 맞춰 변환
  mySessions: async (userId: string, name: string, code: string): Promise<FeedbackSession[]> => {
    const rows = await rpc<RawMySession[]>("member_get_sessions", { p_name: name, p_code: code });
    return rows.map((r) => ({
      id: r.id,
      year: r.year,
      type: r.type,
      period: r.period,
      status: r.status,
      code: "",
      members: r.members.map(toMember),
      ...(r.type === "360도 다면 피드백"
        ? {
            feedbacks: Object.fromEntries(
              r.myFeedbacks.map((f) => [
                f.targetId,
                [
                  {
                    good: f.good,
                    suggestions: f.suggestions,
                    rehire: f.rehire ?? undefined,
                    workRehire: f.workRehire ?? undefined,
                    personalRehire: f.personalRehire ?? undefined,
                    authorHash: userId,
                  },
                ],
              ]),
            ),
          }
        : { insights: r.myInsight != null ? [{ content: r.myInsight, authorHash: userId }] : [] }),
    }));
  },

  saveFeedback: (
    name: string,
    code: string,
    sessionId: string,
    targetId: string,
    good: string,
    suggestions: string,
    rehire: boolean,
    workRehire: Choice,
    personalRehire: Choice,
  ) =>
    rpc<void>("member_save_feedback", {
      p_name: name,
      p_code: code,
      p_session: sessionId,
      p_target: targetId,
      p_good: good,
      p_sug: suggestions,
      p_rehire: rehire,
      p_work: workRehire,
      p_personal: personalRehire,
    }),

  saveInsight: (name: string, code: string, sessionId: string, content: string) =>
    rpc<void>("member_save_insight", { p_name: name, p_code: code, p_session: sessionId, p_content: content }),

  /* ---------- 관리자 (모든 호출에 아이디 + 비밀번호 전달) ---------- */
  adminLogin: (id: string, pw: string) => rpc<boolean>("admin_login", { p_id: id, p_pw: pw }),

  adminChangePassword: (id: string, oldPw: string, newPw: string) =>
    rpc<void>("admin_change_password", { p_id: id, p_old: oldPw, p_new: newPw }),

  adminGetAll: async (id: string, pw: string): Promise<FeedbackSession[]> => {
    const rows = await rpc<RawAdminSession[]>("admin_get_all", { p_id: id, p_pw: pw });
    return rows.map((r) => ({
      id: r.id,
      year: r.year,
      type: r.type,
      period: r.period,
      code: r.code,
      status: r.status,
      members: r.members.map(toMember),
      ...(r.type === "360도 다면 피드백"
        ? {
            feedbacks: Object.fromEntries(
              Object.entries(r.feedbacks).map(([tid, list]) => [
                tid,
                list.map((f) => ({
                  good: f.good,
                  suggestions: f.suggestions,
                  rehire: f.rehire ?? undefined,
                  workRehire: f.workRehire ?? undefined,
                  personalRehire: f.personalRehire ?? undefined,
                })),
              ]),
            ),
          }
        : { insights: r.insights.map((i) => ({ content: i.content, authorHash: "" })) }),
    }));
  },

  adminCreateSession: (
    id: string,
    pw: string,
    year: string,
    type: string,
    period: string,
    code: string,
    members: Member[],
  ) =>
    rpc<string>("admin_create_session", {
      p_id: id,
      p_pw: pw,
      p_year: year,
      p_type: type,
      p_period: period,
      p_code: code,
      p_members: payloadMembers(members),
    }),

  adminUpdateSession: (
    id: string,
    pw: string,
    sessionId: string,
    period: string,
    status: SessionStatus,
    members: Member[],
  ) =>
    rpc<void>("admin_update_session", {
      p_id: id,
      p_pw: pw,
      p_session: sessionId,
      p_period: period,
      p_status: status,
      p_members: payloadMembers(members),
    }),

  adminDeleteSession: (id: string, pw: string, sessionId: string) =>
    rpc<void>("admin_delete_session", { p_id: id, p_pw: pw, p_session: sessionId }),

  adminResetCode: (id: string, pw: string, sessionId: string, memberId: string) =>
    rpc<void>("admin_reset_code", { p_id: id, p_pw: pw, p_session: sessionId, p_member: memberId }),
};

export const errorMessage = (e: unknown) => {
  const m = e instanceof Error ? e.message : "";
  if (m.includes("INVALID_LOGIN")) return "이름 또는 코드가 일치하지 않습니다.";
  if (m.includes("INVALID_ADMIN")) return "아이디 또는 비밀번호가 틀렸습니다.";
  if (m.includes("duplicate key")) return "이미 등록된 피드백 세션이 존재합니다.";
  if (m.includes("CODE_TOO_SHORT")) return "코드는 최소 4자 이상이어야 합니다.";
  return "요청 처리 중 오류가 발생했습니다.";
};
