import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "./hooks/useToast";
import { api, errorMessage } from "./lib/api";
import { isSessionActive } from "./lib/session";
import type { Choice, FeedbackSession, Member, SessionStatus } from "./types";

import Toast from "./components/Toast";
import P0_Login from "./pages/P0_Login";
import P0_1_CodeChange from "./pages/P0_1_CodeChange";
import P1_Category from "./pages/P1_Category";
import P2_1_Intro from "./pages/P2_1_Intro";
import P2_2_MemberList from "./pages/P2_2_MemberList";
import P2_3_MemberWrite from "./pages/P2_3_MemberWrite";
import P3_1_InsightIntro from "./pages/P3_1_InsightIntro";
import P3_2_InsightWrite from "./pages/P3_2_InsightWrite";
import P4_AdminDashboard from "./pages/P4_AdminDashboard";
import P4_1_AdminPasswordChange from "./pages/P4_1_AdminPasswordChange";
import P5_AdminDashboard from "./pages/P5_AdminDashboard";
import P5_1_AdminMemberList from "./pages/P5_1_AdminMemberList";
import P5_2_AdminMemberDetail from "./pages/P5_2_AdminMemberDetail";
import P6_AdminInsightList from "./pages/P6_AdminInsightList";
import P7_AdminFeedbackList from "./pages/P7_AdminFeedbackList";
import P7_AdminFeedbackSessionCreate from "./pages/P7_AdminFeedbackSessionCreate";
import P7_2_AdminMemberManagement from "./pages/P7_2_AdminMemberManagement";
import P7_3_AdminMemberRegister from "./pages/P7_3_AdminMemberRegister";
import P7_4_AdminFeedbackDetail from "./pages/P7_4_AdminFeedbackDetail";
import P7_5_AdminFeedbackEdit from "./pages/P7_5_AdminFeedbackEdit";

const T360 = "360도 다면 피드백";
const TINSIGHT = "인사이트 피드백";
const HOME = "/feedback"; // 첫 화면(로그인) 경로

function Page({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full animate-page">{children}</div>;
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toastMessage, toastType, showToast } = useToast();

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [me, setMe] = useState<Member | null>(null);
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [activeSession, setActiveSession] = useState<FeedbackSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<FeedbackSession | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  // 관리자 로그인 성공 시 비밀번호를 메모리에만 보관 (새로고침하면 로그아웃). 모든 관리자 RPC 호출에 사용
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [tempSession, setTempSession] = useState<Partial<FeedbackSession>>({});
  const [tempMembers, setTempMembers] = useState<Member[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const patch = (id: string, fn: (s: FeedbackSession) => FeedbackSession) =>
    setSessions((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));

  const liveActive = sessions.find((s) => s.id === activeSession?.id) ?? null;

  const guard = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      showToast(errorMessage(e), "warning");
    }
  };

  const loadAdmin = async (id: string, pw: string) => setSessions(await api.adminGetAll(id, pw));

  /* ---------- user flow ---------- */
  const handleLogin = (name: string, code: string) =>
    guard(async () => {
      const u = await api.memberLogin(name, code);
      const mine = await api.mySessions(u.id, name, code);

      // 소속된 세션이 있는데 진행 중인 세션이 하나도 없으면 로그인 차단
      if (mine.length > 0 && !mine.some(isSessionActive)) {
        showToast("피드백 기간이 아닙니다.", "warning");
        return;
      }

      setSessions(mine);
      setMe({ id: u.id, name: u.name, team: u.team, isAvailable: true, loginCode: code, isFirstLogin: u.isFirstLogin });
      navigate(u.isFirstLogin ? "/code-change" : "/category");
    });

  const handleCodeChange = (newCode: string) =>
    guard(async () => {
      if (!me) return;
      await api.changeCode(me.name, me.loginCode ?? "", newCode);
      setMe({ ...me, loginCode: newCode, isFirstLogin: false });
      showToast("코드가 성공적으로 변경되었습니다.", "success");
      navigate("/category");
    });

  const handleFeedbackComplete = (
    memberId: string,
    good: string,
    suggestions: string,
    rehire: boolean,
    workRehire: Choice,
    personalRehire: Choice,
  ) =>
    guard(async () => {
      if (!liveActive || !me) return;
      await api.saveFeedback(
        me.name,
        me.loginCode ?? "",
        liveActive.id,
        memberId,
        good,
        suggestions,
        rehire,
        workRehire,
        personalRehire,
      );
      patch(liveActive.id, (s) => {
        const others = (s.feedbacks?.[memberId] ?? []).filter((f) => f.authorHash !== me.id);
        return {
          ...s,
          feedbacks: {
            ...s.feedbacks,
            [memberId]: [...others, { good, suggestions, rehire, workRehire, personalRehire, authorHash: me.id }],
          },
        };
      });
      showToast("피드백이 저장되었습니다.", "success");
      navigate("/members");
    });

  const handleInsightComplete = (content: string) =>
    guard(async () => {
      if (!liveActive || !me) return;
      await api.saveInsight(me.name, me.loginCode ?? "", liveActive.id, content);
      patch(liveActive.id, (s) => ({
        ...s,
        insights: [...(s.insights ?? []).filter((i) => i.authorHash !== me.id), { content, authorHash: me.id }],
      }));
      showToast("완료되었습니다.", "success");
      navigate("/category");
    });

  const pickSession = (type: string) =>
    sessions.find((s) => s.type === type && isSessionActive(s) && s.members.some((m) => m.id === me?.id));

  /* ---------- admin flow ---------- */
  const handleAdminLogin = (id: string, password: string) =>
    guard(async () => {
      await api.adminLogin(id, password);
      await loadAdmin(id, password);
      setAdminId(id);
      setAdminPw(password);
      navigate("/admin");
    });

  const handleRegisterSession = () =>
    guard(async () => {
      const { year, type, code, period } = tempSession;
      if (!year || !type) return;
      await api.adminCreateSession(adminId, adminPw, year, type, period ?? "", code ?? `DND${year}`, tempMembers);
      await loadAdmin(adminId, adminPw);
      setSelectedSession(null);
      setTempMembers([]);
      navigate("/admin/sessions");
    });

  const handleDeleteSession = (id: string) =>
    guard(async () => {
      await api.adminDeleteSession(adminId, adminPw, id);
      setSessions((p) => p.filter((s) => s.id !== id));
      setSelectedSession(null);
      showToast("삭제되었습니다.", "success");
      navigate("/admin/sessions");
    });

  const handleSaveSession = (u: FeedbackSession) =>
    guard(async () => {
      await api.adminUpdateSession(adminId, adminPw, u.id, u.period, u.status ?? "진행중", u.members);
      await loadAdmin(adminId, adminPw);
      setSelectedSession(u);
      navigate("/admin/sessions/detail");
    });

  const handleResetCode = (sessionId: string, memberId: string) =>
    guard(async () => {
      await api.adminResetCode(adminId, adminPw, sessionId, memberId);
      showToast("비밀번호가 초기화되었습니다.", "success");
    });

  const handlePasswordChanged = (pw: string) =>
    guard(async () => {
      await api.adminChangePassword(adminId, adminPw, pw);
      setAdminPw(pw);
      navigate("/admin");
    });

  const requiresMemberLogin = [
    "/code-change",
    "/category",
    "/intro",
    "/members",
    "/write",
    "/insight-intro",
    "/insight-write",
  ].includes(location.pathname);

  if ((!me && requiresMemberLogin) || (!adminId && location.pathname.startsWith("/admin"))) {
    return <Navigate to={HOME} replace />;
  }

  return (
    <div className="flex justify-center min-h-screen bg-neutral-900 transition-colors duration-300">
      <div className="w-full max-w-md h-screen bg-background-dark relative flex flex-col shadow-2xl overflow-hidden border-x border-white/5">
        <Routes location={location} key={location.pathname}>
          <Route
            path={HOME}
            element={
              <Page>
                <P0_Login
                  onLogin={handleLogin}
                  onAdminLogin={handleAdminLogin}
                  showToast={showToast}
                  theme={theme}
                  onThemeChange={setTheme}
                />
              </Page>
            }
          />
          <Route
            path="/code-change"
            element={
              <Page>
                <P0_1_CodeChange
                  currentName={me?.name || ""}
                  showToast={showToast}
                  onBack={() => navigate(HOME)}
                  onComplete={handleCodeChange}
                />
              </Page>
            }
          />

          <Route
            path="/category"
            element={
              <Page>
                <P1_Category
                  availableTypes={Array.from(
                    new Set(
                      sessions
                        .filter((s) => isSessionActive(s) && s.members.some((m) => m.id === me?.id))
                        .map((s) => s.type),
                    ),
                  )}
                  onSelect360={() => {
                    const s = pickSession(T360);
                    if (s) {
                      setActiveSession(s);
                      navigate("/intro");
                    }
                  }}
                  onSelectInsight={() => {
                    const s = pickSession(TINSIGHT);
                    if (s) {
                      setActiveSession(s);
                      navigate("/insight-intro");
                    }
                  }}
                />
              </Page>
            }
          />
          <Route
            path="/intro"
            element={
              <Page>
                <P2_1_Intro onNext={() => navigate("/members")} onBack={() => navigate("/category")} />
              </Page>
            }
          />
          <Route
            path="/members"
            element={
              <Page>
                <P2_2_MemberList
                  members={(liveActive?.members || [])
                    .filter((m) => m.id !== me?.id)
                    .map((m) => ({
                      ...m,
                      isAvailable: !liveActive?.feedbacks?.[m.id]?.some((f) => f.authorHash === me?.id),
                    }))}
                  initialOpenTeam={selectedMember?.team || null}
                  onMemberSelect={(m) => {
                    setSelectedMember(m);
                    navigate("/write");
                  }}
                  onBackToStart={() => navigate("/category")}
                  onBack={() => navigate("/intro")}
                />
              </Page>
            }
          />
          <Route
            path="/write"
            element={
              <Page>
                {selectedMember && (
                  <P2_3_MemberWrite
                    member={selectedMember}
                    initialData={liveActive?.feedbacks?.[selectedMember.id]?.find((f) => f.authorHash === me?.id)}
                    onComplete={(g, s, r, w, p) => handleFeedbackComplete(selectedMember.id, g, s, r, w, p)}
                    onBack={() => navigate("/members")}
                  />
                )}
              </Page>
            }
          />
          <Route
            path="/insight-intro"
            element={
              <Page>
                <P3_1_InsightIntro
                  onParticipate={() => navigate("/insight-write")}
                  onBack={() => navigate("/category")}
                />
              </Page>
            }
          />
          <Route
            path="/insight-write"
            element={
              <Page>
                <P3_2_InsightWrite
                  initialData={liveActive?.insights?.find((i) => i.authorHash === me?.id)?.content}
                  onComplete={handleInsightComplete}
                  onBack={() => navigate("/insight-intro")}
                />
              </Page>
            }
          />

          <Route
            path="/admin"
            element={
              <Page>
                <P4_AdminDashboard
                  onGoToDashboard={() => navigate("/admin/results")}
                  onGoToAddFeedback={() => navigate("/admin/sessions")}
                  onGoToPasswordChange={() => navigate("/admin/password")}
                  onBack={() => {
                    setAdminId("");
                    setAdminPw("");
                    setSessions([]);
                    navigate(HOME);
                  }}
                />
              </Page>
            }
          />
          <Route
            path="/admin/password"
            element={
              <Page>
                <P4_1_AdminPasswordChange
                  currentAdminPassword={adminPw}
                  showToast={showToast}
                  onBack={() => navigate("/admin")}
                  onPasswordChanged={handlePasswordChanged}
                />
              </Page>
            }
          />
          <Route
            path="/admin/results"
            element={
              <Page>
                <P5_AdminDashboard
                  onSelect360={() => navigate("/admin/results/360")}
                  onSelectInsight={() => navigate("/admin/results/insight")}
                  onBack={() => navigate("/admin")}
                />
              </Page>
            }
          />
          <Route
            path="/admin/results/360"
            element={
              <Page>
                <P5_1_AdminMemberList
                  sessions={sessions.filter((s) => s.type === T360)}
                  onMemberSelect={(m, y) => {
                    setSelectedMember(m);
                    setSelectedYear(y);
                    navigate("/admin/results/360/detail");
                  }}
                  onBack={() => navigate("/admin/results")}
                />
              </Page>
            }
          />
          <Route
            path="/admin/results/360/detail"
            element={
              <Page>
                {selectedMember && (
                  <P5_2_AdminMemberDetail
                    member={selectedMember}
                    year={selectedYear}
                    feedbackData={
                      sessions.find((s) => s.year === selectedYear && s.type === T360)?.feedbacks?.[
                        selectedMember.id
                      ] || null
                    }
                    onBack={() => navigate("/admin/results/360")}
                  />
                )}
              </Page>
            }
          />
          <Route
            path="/admin/results/insight"
            element={
              <Page>
                <P6_AdminInsightList
                  sessions={sessions.filter((s) => s.type === TINSIGHT)}
                  onBack={() => navigate("/admin/results")}
                />
              </Page>
            }
          />

          <Route
            path="/admin/sessions"
            element={
              <Page>
                <P7_AdminFeedbackList
                  sessions={sessions}
                  onSelectSession={(s) => {
                    setSelectedSession(s);
                    navigate("/admin/sessions/detail");
                  }}
                  onRegister={() => {
                    setSelectedSession(null);
                    setTempSession({});
                    setTempMembers([]);
                    navigate("/admin/sessions/create");
                  }}
                  onBack={() => navigate("/admin")}
                />
              </Page>
            }
          />
          <Route
            path="/admin/sessions/create"
            element={
              <Page>
                <P7_AdminFeedbackSessionCreate
                  sessions={sessions}
                  showToast={showToast}
                  onNext={(year, type, period, code) => {
                    setTempSession({ year, type: type as FeedbackSession["type"], period, code });
                    // 360/인사이트 모두 같은 연도의 360도 세션 인원을 기본값으로 불러옴
                    const base = sessions.find((s) => s.year === year && s.type === T360);
                    setTempMembers(base ? base.members.map((m) => ({ ...m })) : []);
                    navigate("/admin/sessions/members");
                  }}
                  onBack={() => navigate("/admin/sessions")}
                />
              </Page>
            }
          />
          <Route
            path="/admin/sessions/members"
            element={
              <Page>
                <P7_2_AdminMemberManagement
                  members={tempMembers}
                  allSessions={sessions}
                  sessionYear={tempSession.year || ""}
                  sessionType={tempSession.type || ""}
                  onDeleteMember={(id) => setTempMembers((p) => p.filter((m) => m.id !== id))}
                  onAddMember={() => navigate("/admin/sessions/members/add")}
                  onMembersLoaded={setTempMembers}
                  onRegisterComplete={handleRegisterSession}
                  onBack={() => navigate("/admin/sessions/create")}
                />
              </Page>
            }
          />
          <Route
            path="/admin/sessions/members/add"
            element={
              <Page>
                <P7_3_AdminMemberRegister
                  showToast={showToast}
                  onBack={() => navigate(selectedSession ? "/admin/sessions/edit" : "/admin/sessions/members")}
                  onRegister={(data) => {
                    // 신규 직원은 서버에서 이름 기준으로 upsert 되므로 임시 id 는 화면용입니다.
                    const nm: Member = { ...data, id: Math.random().toString(36).slice(2, 11), isAvailable: true };
                    if (selectedSession) {
                      setSelectedSession({ ...selectedSession, members: [...selectedSession.members, nm] });
                      navigate("/admin/sessions/edit");
                    } else {
                      setTempMembers((p) => [...p, nm]);
                      navigate("/admin/sessions/members");
                    }
                  }}
                />
              </Page>
            }
          />
          <Route
            path="/admin/sessions/detail"
            element={
              <Page>
                {selectedSession && (
                  <P7_4_AdminFeedbackDetail
                    session={selectedSession}
                    onEdit={() => navigate("/admin/sessions/edit")}
                    onDelete={handleDeleteSession}
                    onResetCode={handleResetCode}
                    onBack={() => navigate("/admin/sessions")}
                  />
                )}
              </Page>
            }
          />
          <Route
            path="/admin/sessions/edit"
            element={
              <Page>
                {selectedSession && (
                  <P7_5_AdminFeedbackEdit
                    key={selectedSession.id + selectedSession.members.length}
                    session={selectedSession}
                    showToast={showToast}
                    onSave={handleSaveSession}
                    onAddMember={(period: string, members: Member[], status: SessionStatus) => {
                      setSelectedSession({ ...selectedSession, period, members, status });
                      navigate("/admin/sessions/members/add");
                    }}
                    // 편집 화면의 삭제는 화면 상태에서만 반영하고, '수정완료' 시 서버와 동기화합니다.
                    onDeleteMember={() => {}}
                    onBack={() => navigate("/admin/sessions/detail")}
                  />
                )}
              </Page>
            }
          />

          <Route path="*" element={<Navigate to={HOME} replace />} />
        </Routes>
        {toastMessage && <Toast message={toastMessage} type={toastType} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
