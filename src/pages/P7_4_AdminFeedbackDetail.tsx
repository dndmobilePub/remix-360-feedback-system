import { useState } from "react";
import { MdExpandMore, MdLockReset } from "react-icons/md";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { modalAccent, modalDanger, modalGhost } from "../lib/ui";
import type { FeedbackSession, Member } from "../types";
import { sessionStatusText } from "../lib/session";

interface Props {
  session: FeedbackSession | null;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onResetCode: (sessionId: string, memberId: string) => void;
  onBack: () => void;
}

export default function P7_4_AdminFeedbackDetail({ session, onEdit, onDelete, onResetCode, onBack }: Props) {
  const [openTeams, setOpenTeams] = useState<Record<string, boolean>>({ "기획팀 (Planning Team)": true });
  const [resetting, setResetting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!session) return null;

  const status = sessionStatusText(session);

  const byTeam = session.members.reduce<Record<string, Member[]>>((acc, m) => {
    (acc[m.team] ||= []).push(m);
    return acc;
  }, {});
  const is360 = session.type === "360도 다면 피드백";

  const rows = [
    { label: "생성할 년도", value: `${session.year}년` },
    { label: "피드백 목록", value: is360 ? "360도 다면평가" : "인사이트 평가" },
    { label: "오픈 기간", value: session.period },
    { label: "피드백 상태", value: status },
    { label: "초기 코드", value: session.code || `DND${session.year}` },
  ];

  return (
    <Layout
      title={`${session.year}년 ${is360 ? "다면피드백" : "인사이트 피드백"} 상세 정보`}
      onBack={onBack}
      footer={
        <div className="flex gap-3">
          <button
            onClick={() => setDeleting(true)}
            className="flex-1 h-[56px] bg-background-dark border border-theme text-theme-main font-bold rounded-2xl text-[16px] active:scale-[0.98] transition-all"
          >
            삭제하기
          </button>
          <button
            onClick={onEdit}
            className="flex-1 h-[56px] bg-accent text-white font-bold rounded-2xl text-[16px] shadow-xl active:scale-[0.98] transition-all"
          >
            수정하기
          </button>
        </div>
      }
    >
      <div className="px-6 pt-10 pb-8 space-y-10">
        <div className="bg-surface-dark border border-theme rounded-[20px] overflow-hidden shadow-lg">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`grid grid-cols-[110px_1fr] h-[64px] ${i !== rows.length - 1 ? "border-b border-theme" : ""}`}
            >
              <div className="flex items-center px-5 bg-theme-highlight text-[15px] text-theme-sub font-bold border-r border-theme">
                {r.label}
              </div>
              <div className="flex items-center px-5 text-[17px] font-bold text-theme-main opacity-90">{r.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pb-10">
          {Object.keys(byTeam).map((team) => {
            const isOpen = openTeams[team];
            return (
              <div key={team} className="bg-surface-dark border border-theme rounded-[20px] overflow-hidden">
                <button
                  onClick={() => setOpenTeams((p) => ({ ...p, [team]: !p[team] }))}
                  className="w-full flex items-center justify-between px-6 py-5 active:bg-theme-highlight transition-colors"
                >
                  <span className="text-[17px] font-bold text-theme-main">{team.split(" (")[0]}</span>
                  <MdExpandMore
                    className={`text-[24px] text-theme-sub transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 pt-1 animate-slide space-y-3">
                    {byTeam[team].map((m) => (
                      <div key={m.id} className="flex justify-between items-center py-1">
                        <span className="text-[15px] text-theme-sub font-medium">{m.name}</span>
                        <button
                          onClick={() => setResetting(m.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-theme-highlight border border-theme text-theme-sub transition-colors"
                        >
                          <MdLockReset className="text-[16px]" />
                          <span className="text-[12px] font-bold">초기화</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {resetting && (
        <Modal
          title="비밀번호 초기화"
          body={
            <>
              해당 직원의 비밀번호를
              <br />
              초기 코드로 변경하시겠습니까?
            </>
          }
          onClose={() => setResetting(null)}
        >
          <div className="flex gap-3">
            <button onClick={() => setResetting(null)} className={modalGhost}>
              취소
            </button>
            <button
              onClick={() => {
                onResetCode(session.id, resetting);
                setResetting(null);
              }}
              className={modalAccent}
            >
              초기화
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="피드백 삭제"
          body={
            <>
              이 피드백 세션을 삭제하시겠습니까?
              <br />
              <span className="text-red-500 text-[13px]">삭제 시 모든 데이터가 영구 삭제됩니다.</span>
            </>
          }
          onClose={() => setDeleting(false)}
        >
          <div className="flex gap-3">
            <button onClick={() => setDeleting(false)} className={modalGhost}>
              취소
            </button>
            <button
              onClick={() => {
                onDelete(session.id);
                setDeleting(false);
              }}
              className={modalDanger}
            >
              삭제
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
