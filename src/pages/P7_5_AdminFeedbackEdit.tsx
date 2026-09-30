import { useState } from "react";
import { MdCalendarMonth, MdClose, MdExpandLess } from "react-icons/md";
import Layout from "../components/Layout";
import CalendarModal from "../components/CalendarModal";
import { TEAMS } from "../data/mock";
import type { FeedbackSession, Member, SessionStatus, ShowToast } from "../types";

interface Props {
  session: FeedbackSession;
  onSave: (s: FeedbackSession) => void;
  onAddMember: (period: string, members: Member[], status: SessionStatus) => void;
  onDeleteMember: (id: string) => void;
  onBack: () => void;
  showToast: ShowToast;
}

const fmt = (d: Date) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
const toDate = (s?: string) => (s ? new Date(s.replace(/\./g, "-")) : undefined);

// 라우트에서 key 로 마운트하면 세션 변경 시 상태가 초기화됩니다.
export default function P7_5_AdminFeedbackEdit({
  session,
  onSave,
  onAddMember,
  onDeleteMember,
  onBack,
  showToast,
}: Props) {
  const [period, setPeriod] = useState(session.period || "");
  const [status, setStatus] = useState<SessionStatus>(session.status ?? "진행중");
  const [members, setMembers] = useState<Member[]>(session.members);
  const [calendar, setCalendar] = useState(false);
  const [periodError, setPeriodError] = useState(false);
  const [openTeams, setOpenTeams] = useState<Record<string, boolean>>({
    [TEAMS[0]]: true,
    [TEAMS[1]]: true,
    [TEAMS[2]]: true,
  });

  const is360 = session.type === "360도 다면 피드백";
  const [start, end] = session.period ? session.period.split(" - ") : [];

  const save = () => {
    if (!period) {
      setPeriodError(true);
      showToast("오픈 기간을 선택해주세요.", "warning");
      setCalendar(true);
      return;
    }
    // 오픈 기간이 바뀌면 자동으로 '진행중' (서버 RPC 에서도 동일하게 처리)
    const finalStatus: SessionStatus = period !== session.period ? "진행중" : status;
    onSave({ ...session, period, status: finalStatus, members });
    showToast("수정되었습니다.", "success");
  };

  const remove = (id: string) => {
    setMembers((p) => p.filter((m) => m.id !== id));
    onDeleteMember(id);
  };

  const readOnly = [
    { label: "생성할 년도", value: `${session.year}년` },
    { label: "피드백 목록", value: is360 ? "360도 다면평가" : "인사이트 평가" },
  ];

  return (
    <Layout
      title="피드백 상세내용 수정하기"
      onBack={onBack}
      footer={
        <div className="flex gap-3">
          <button
            onClick={() => onAddMember(period, members, status)}
            className="flex-1 h-[56px] bg-background-dark border border-theme text-theme-main font-bold rounded-2xl active:scale-[0.98] transition-all"
          >
            직원 추가하기
          </button>
          <button
            onClick={save}
            className="flex-1 h-[56px] bg-accent text-white font-bold rounded-2xl shadow-xl active:scale-[0.98] transition-all"
          >
            수정완료
          </button>
        </div>
      }
    >
      <div className="px-6 pt-10 pb-4">
        <h2 className="text-[28px] font-bold leading-tight mb-4 text-theme-main">피드백 상세내용 수정하기</h2>
        <p className="text-theme-sub text-[15px] font-medium opacity-70">피드백 상세 내용을 수정해주세요.</p>
      </div>
      <div className="px-6 space-y-8 pb-10">
        {readOnly.map((r) => (
          <div key={r.label} className="space-y-3">
            <label className="text-[15px] font-bold text-theme-main ml-1">{r.label}</label>
            <input
              type="text"
              readOnly
              value={r.value}
              className="w-full h-[52px] bg-surface-dark border border-theme rounded-2xl px-5 text-theme-sub outline-none cursor-default opacity-60"
            />
          </div>
        ))}
        <div className="space-y-3">
          <label className="text-[15px] font-bold text-theme-main ml-1">오픈 기간 설정</label>
          <div className="relative" onClick={() => setCalendar(true)}>
            <input
              type="text"
              readOnly
              value={period}
              placeholder="YYYY.MM.DD - YYYY.MM.DD"
              className={`w-full h-[52px] bg-surface-dark border rounded-2xl px-5 text-theme-main placeholder:text-theme-sub/30 focus:outline-none transition-all cursor-pointer ${periodError ? "border-red-500 ring-1 ring-red-500/50" : "border-theme"}`}
            />
            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
              <MdCalendarMonth className="text-[24px] text-theme-sub" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[15px] font-bold text-theme-main ml-1">피드백 상태</label>
          <div className="grid grid-cols-2 gap-3">
            {(["진행중", "완료"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`h-[52px] rounded-2xl font-bold text-[15px] border transition-all ${
                  status === s
                    ? "bg-accent text-white border-accent shadow-md"
                    : "bg-surface-dark border-theme text-theme-sub hover:text-theme-main"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {is360 && (
          <div className="space-y-8 pt-4 pb-20">
            {TEAMS.map((team) => {
              const isOpen = openTeams[team];
              const list = members.filter((m) => m.team === team);
              return (
                <div key={team} className="space-y-4">
                  <button
                    onClick={() => setOpenTeams((p) => ({ ...p, [team]: !p[team] }))}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="text-[18px] font-bold text-theme-main">{team}</h3>
                    <MdExpandLess
                      className={`text-[24px] text-theme-sub transition-transform duration-300 ${isOpen ? "" : "rotate-180"}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="flex flex-wrap gap-2 animate-slide">
                      {list.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 px-4 py-2.5 bg-theme-highlight border border-theme rounded-xl"
                        >
                          <span className="text-[14px] font-bold text-theme-main">{m.name}</span>
                          <button
                            onClick={() => remove(m.id)}
                            className="flex items-center justify-center text-theme-main opacity-40 hover:opacity-100 transition-opacity"
                          >
                            <MdClose className="text-[16px]" />
                          </button>
                        </div>
                      ))}
                      {list.length === 0 && (
                        <p className="text-sm text-theme-sub italic px-1 opacity-40">등록된 직원이 없습니다.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <CalendarModal
        isOpen={calendar}
        onClose={() => setCalendar(false)}
        onSelect={(s, e) => {
          setPeriod(`${fmt(s)} - ${fmt(e)}`);
          setPeriodError(false);
          setStatus("진행중");
        }}
        initialStartDate={toDate(start)}
        initialEndDate={toDate(end)}
      />
    </Layout>
  );
}
