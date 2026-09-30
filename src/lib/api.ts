import { supabase, isSupabaseConfigured } from "./supabase";
import type { Choice, FeedbackSession, Member, SessionStatus, SessionType } from "../types";
import { MEMBERS, initialSessions } from "../data/mock";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("NO_SUPABASE");
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

/* ---------- Mock Storage Fallback ---------- */
const STORAGE_KEY_MEMBERS = "app_mock_members";
const STORAGE_KEY_SESSIONS = "app_mock_sessions";
const STORAGE_KEY_ADMIN = "app_mock_admin";

function getStoredMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return JSON.parse(JSON.stringify(MEMBERS));
}

function saveStoredMembers(members: Member[]) {
  try {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
  } catch {
    // fallback
  }
}

function getStoredSessions(): FeedbackSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return JSON.parse(JSON.stringify(initialSessions));
}

function saveStoredSessions(sessions: FeedbackSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch {
    // fallback
  }
}

function getStoredAdmin(): { id: string; pw: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMIN);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return { id: "admin2286", pw: "0000" };
}

function saveStoredAdmin(admin: { id: string; pw: string }) {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(admin));
  } catch {
    // fallback
  }
}

export const api = {
  /* ---------- 직원 ---------- */
  memberLogin: async (name: string, code: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<{ id: string; name: string; team: string; isFirstLogin: boolean }>("member_login", {
          p_name: name,
          p_code: code,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("INVALID_LOGIN")) throw e;
        console.warn("Supabase memberLogin failed, using mock data", e);
      }
    }

    const members = getStoredMembers();
    const cleanName = name.trim();
    const cleanCode = code.trim();
    const m = members.find((item) => item.name === cleanName);

    if (!m) {
      throw new Error("INVALID_LOGIN");
    }

    if (m.loginCode !== cleanCode) {
      throw new Error("INVALID_LOGIN");
    }

    return {
      id: m.id,
      name: m.name,
      team: m.team,
      isFirstLogin: Boolean(m.isFirstLogin),
    };
  },

  changeCode: async (name: string, code: string, newCode: string) => {
    if (newCode.trim().length < 4) {
      throw new Error("CODE_TOO_SHORT");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<void>("member_change_code", { p_name: name, p_code: code, p_new: newCode });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("CODE_") || msg.includes("INVALID_")) throw e;
        console.warn("Supabase changeCode failed, using mock data", e);
      }
    }

    const members = getStoredMembers();
    const m = members.find((item) => item.name === name.trim());
    if (m) {
      m.loginCode = newCode.trim();
      m.isFirstLogin = false;
      saveStoredMembers(members);
    }
  },

  // 내가 속한 세션만 조회. 내가 쓴 피드백/인사이트만 포함되며 기존 UI 구조(authorHash = 내 id)에 맞춰 변환
  mySessions: async (userId: string, name: string, code: string): Promise<FeedbackSession[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
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
      } catch (e) {
        console.warn("Supabase member_get_sessions failed, using mock data", e);
      }
    }

    const sessions = getStoredSessions();
    const matched = sessions.filter((s) => s.members.some((m) => m.id === userId || m.name === name.trim()));

    return matched.map((s) => ({
      ...s,
      code: "",
      ...(s.type === "360도 다면 피드백"
        ? {
            feedbacks: Object.fromEntries(
              Object.entries(s.feedbacks || {}).map(([targetId, fList]) => [
                targetId,
                (fList || []).filter((f) => f.authorHash === userId),
              ]),
            ),
          }
        : {
            insights: (s.insights || []).filter((i) => i.authorHash === userId),
          }),
    }));
  },

  saveFeedback: async (
    name: string,
    code: string,
    sessionId: string,
    targetId: string,
    good: string,
    suggestions: string,
    rehire: boolean,
    workRehire: Choice,
    personalRehire: Choice,
  ) => {
    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<void>("member_save_feedback", {
          p_name: name,
          p_code: code,
          p_session: sessionId,
          p_target: targetId,
          p_good: good,
          p_sug: suggestions,
          p_rehire: rehire,
          p_work: workRehire,
          p_personal: personalRehire,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("SELF_FEEDBACK") || msg.includes("NOT_IN_SESSION")) throw e;
        console.warn("Supabase member_save_feedback failed, using mock data", e);
      }
    }

    const members = getStoredMembers();
    const author = members.find((m) => m.name === name.trim());
    if (!author) throw new Error("NOT_IN_SESSION");
    if (author.id === targetId) throw new Error("SELF_FEEDBACK");

    const sessions = getStoredSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("NOT_IN_SESSION");

    const currentFeedbacks = session.feedbacks || {};
    const targetList = currentFeedbacks[targetId] || [];
    const filtered = targetList.filter((f) => f.authorHash !== author.id);

    filtered.push({
      good,
      suggestions,
      rehire,
      workRehire,
      personalRehire,
      authorHash: author.id,
    });

    session.feedbacks = {
      ...currentFeedbacks,
      [targetId]: filtered,
    };

    saveStoredSessions(sessions);
  },

  saveInsight: async (name: string, code: string, sessionId: string, content: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<void>("member_save_insight", {
          p_name: name,
          p_code: code,
          p_session: sessionId,
          p_content: content,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("NOT_IN_SESSION")) throw e;
        console.warn("Supabase member_save_insight failed, using mock data", e);
      }
    }

    const members = getStoredMembers();
    const author = members.find((m) => m.name === name.trim());
    if (!author) throw new Error("NOT_IN_SESSION");

    const sessions = getStoredSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("NOT_IN_SESSION");

    const currentInsights = session.insights || [];
    const filtered = currentInsights.filter((i) => i.authorHash !== author.id);
    filtered.push({ content, authorHash: author.id });

    session.insights = filtered;
    saveStoredSessions(sessions);
  },

  /* ---------- 관리자 (아이디는 무조건 admin2286) ---------- */
  adminLogin: async (id: string, pw: string) => {
    const cleanId = id.trim();
    if (cleanId !== "admin2286") {
      throw new Error("INVALID_ADMIN");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<boolean>("admin_login", { p_id: cleanId, p_pw: pw });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("INVALID_ADMIN")) throw e;
        console.warn("Supabase admin_login failed, using mock data", e);
      }
    }

    const admin = getStoredAdmin();
    if (cleanId !== admin.id || pw !== admin.pw) {
      throw new Error("INVALID_ADMIN");
    }
    return true;
  },

  adminChangePassword: async (id: string, oldPw: string, newPw: string) => {
    const cleanId = id.trim();
    if (cleanId !== "admin2286") {
      throw new Error("INVALID_ADMIN");
    }

    if (newPw.trim().length < 4) {
      throw new Error("PASSWORD_TOO_SHORT");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<void>("admin_change_password", { p_id: cleanId, p_old: oldPw, p_new: newPw });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("PASSWORD_TOO_SHORT") || msg.includes("INVALID_ADMIN")) throw e;
        console.warn("Supabase admin_change_password failed, using mock data", e);
      }
    }

    const admin = getStoredAdmin();
    if (cleanId !== admin.id || oldPw !== admin.pw) {
      throw new Error("INVALID_ADMIN");
    }

    admin.pw = newPw.trim();
    saveStoredAdmin(admin);
  },

  adminGetAll: async (id: string, pw: string): Promise<FeedbackSession[]> => {
    const cleanId = id.trim();
    if (cleanId !== "admin2286") {
      throw new Error("INVALID_ADMIN");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const rows = await rpc<RawAdminSession[]>("admin_get_all", { p_id: cleanId, p_pw: pw });
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("INVALID_ADMIN")) throw e;
        console.warn("Supabase admin_get_all failed, using mock data", e);
      }
    }

    const admin = getStoredAdmin();
    if (cleanId !== admin.id || pw !== admin.pw) {
      throw new Error("INVALID_ADMIN");
    }

    return getStoredSessions();
  },

  adminCreateSession: async (
    id: string,
    pw: string,
    year: string,
    type: string,
    period: string,
    code: string,
    members: Member[],
  ) => {
    const cleanId = id.trim();
    if (cleanId !== "admin2286") {
      throw new Error("INVALID_ADMIN");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<string>("admin_create_session", {
          p_id: cleanId,
          p_pw: pw,
          p_year: year,
          p_type: type,
          p_period: period,
          p_code: code,
          p_members: payloadMembers(members),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("duplicate key") || msg.includes("INVALID_ADMIN")) throw e;
        console.warn("Supabase admin_create_session failed, using mock data", e);
      }
    }

    const admin = getStoredAdmin();
    if (cleanId !== admin.id || pw !== admin.pw) {
      throw new Error("INVALID_ADMIN");
    }

    const sessions = getStoredSessions();
    if (sessions.some((s) => s.year === year && s.type === type)) {
      throw new Error("duplicate key value violates unique constraint");
    }

    const allMembers = getStoredMembers();
    const syncedMembers = members.map((m) => {
      const existing = allMembers.find((am) => am.name === m.name);
      if (existing) {
        existing.team = m.team;
        return existing;
      }
      const newMember: Member = {
        id: "m_" + Math.random().toString(36).slice(2, 9),
        name: m.name,
        team: m.team,
        isAvailable: true,
        loginCode: code,
        isFirstLogin: true,
      };
      allMembers.push(newMember);
      return newMember;
    });
    saveStoredMembers(allMembers);

    const newSid = "s_" + Date.now().toString(36);
    const newSession: FeedbackSession = {
      id: newSid,
      year,
      type: type as SessionType,
      period,
      code,
      status: "진행중",
      members: syncedMembers,
      ...(type === "360도 다면 피드백" ? { feedbacks: {} } : { insights: [] }),
    };

    sessions.unshift(newSession);

    // 360 session automatically syncs members to insight session if it exists
    if (type === "360도 다면 피드백") {
      const insightSession = sessions.find((s) => s.year === year && s.type === "인사이트 피드백");
      if (insightSession) {
        const memberIds = new Set(insightSession.members.map((m) => m.id));
        for (const m of syncedMembers) {
          if (!memberIds.has(m.id)) {
            insightSession.members.push(m);
          }
        }
      }
    }

    saveStoredSessions(sessions);
    return newSid;
  },

  adminUpdateSession: async (
    id: string,
    pw: string,
    sessionId: string,
    period: string,
    status: SessionStatus,
    members: Member[],
  ) => {
    const cleanId = id.trim();
    if (cleanId !== "admin2286") {
      throw new Error("INVALID_ADMIN");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<void>("admin_update_session", {
          p_id: cleanId,
          p_pw: pw,
          p_session: sessionId,
          p_period: period,
          p_status: status,
          p_members: payloadMembers(members),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("INVALID_ADMIN")) throw e;
        console.warn("Supabase admin_update_session failed, using mock data", e);
      }
    }

    const admin = getStoredAdmin();
    if (cleanId !== admin.id || pw !== admin.pw) {
      throw new Error("INVALID_ADMIN");
    }

    const sessions = getStoredSessions();
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    const oldPeriod = targetSession.period;
    targetSession.period = period;
    targetSession.status = period !== oldPeriod ? "진행중" : status;
    targetSession.members = members.map((m) => ({ ...m, isAvailable: true }));

    // sync to insight if 360
    if (targetSession.type === "360도 다면 피드백") {
      const insightSession = sessions.find((s) => s.year === targetSession.year && s.type === "인사이트 피드백");
      if (insightSession) {
        const memberIds = new Set(insightSession.members.map((m) => m.id));
        for (const m of targetSession.members) {
          if (!memberIds.has(m.id)) {
            insightSession.members.push(m);
          }
        }
      }
    }

    saveStoredSessions(sessions);
  },

  adminDeleteSession: async (id: string, pw: string, sessionId: string) => {
    const cleanId = id.trim();
    if (cleanId !== "admin2286") {
      throw new Error("INVALID_ADMIN");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<void>("admin_delete_session", { p_id: cleanId, p_pw: pw, p_session: sessionId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("INVALID_ADMIN")) throw e;
        console.warn("Supabase admin_delete_session failed, using mock data", e);
      }
    }

    const admin = getStoredAdmin();
    if (cleanId !== admin.id || pw !== admin.pw) {
      throw new Error("INVALID_ADMIN");
    }

    const sessions = getStoredSessions().filter((s) => s.id !== sessionId);
    saveStoredSessions(sessions);
  },

  adminResetCode: async (id: string, pw: string, sessionId: string, memberId: string) => {
    const cleanId = id.trim();
    if (cleanId !== "admin2286") {
      throw new Error("INVALID_ADMIN");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        return await rpc<void>("admin_reset_code", { p_id: cleanId, p_pw: pw, p_session: sessionId, p_member: memberId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("INVALID_ADMIN")) throw e;
        console.warn("Supabase admin_reset_code failed, using mock data", e);
      }
    }

    const admin = getStoredAdmin();
    if (cleanId !== admin.id || pw !== admin.pw) {
      throw new Error("INVALID_ADMIN");
    }

    const sessions = getStoredSessions();
    const session = sessions.find((s) => s.id === sessionId);
    const initialCode = session?.code || `DND${new Date().getFullYear()}`;

    const members = getStoredMembers();
    const member = members.find((m) => m.id === memberId);
    if (member) {
      member.loginCode = initialCode;
      member.isFirstLogin = true;
      saveStoredMembers(members);
    }
  },
};

export const errorMessage = (e: unknown) => {
  const m = e instanceof Error ? e.message : "";
  if (m.includes("INVALID_LOGIN")) return "이름 또는 코드가 일치하지 않습니다.";
  if (m.includes("INVALID_ADMIN")) return "아이디 또는 비밀번호가 틀렸습니다.";
  if (m.includes("duplicate key")) return "이미 등록된 피드백 세션이 존재합니다.";
  if (m.includes("CODE_TOO_SHORT")) return "코드는 최소 4자 이상이어야 합니다.";
  if (m.includes("PASSWORD_TOO_SHORT")) return "비밀번호는 최소 4자 이상이어야 합니다.";
  return "요청 처리 중 오류가 발생했습니다.";
};
