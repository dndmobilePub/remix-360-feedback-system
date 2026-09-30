import { useState } from "react";
import type { IconType } from "react-icons";
import { MdHandshake, MdBusinessCenter, MdFavorite, MdThumbUp, MdLightbulb, MdTableView } from "react-icons/md";
import FeedbackFace from "../components/FeedbackFace";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { tally } from "../lib/tally";
import type { ChoiceKey } from "../lib/tally";
import { addReportSheet, createReportWorkbook, downloadWorkbook } from "../utils/exportExcel";
import type { Row } from "../utils/exportExcel";
import type { Feedback, Member } from "../types";

interface Props {
  member: Member | null;
  year: string;
  feedbackData: Feedback[] | null;
  onBack: () => void;
}

const empty = (
  <div className="p-10 rounded-2xl bg-surface-dark/50 border border-dashed border-theme text-center text-theme-sub text-sm">
    피드백 내용이 없습니다.
  </div>
);
const textCard =
  "custom-scrollbar p-6 rounded-[20px] bg-surface-dark border border-theme text-[15px] leading-relaxed text-theme-main opacity-90 shadow-sm animate-slide break-all whitespace-pre-wrap max-h-[285px] overflow-y-auto overscroll-auto";

function RehireCard({ title, Icon, list, k }: { title: string; Icon: IconType; list: Feedback[]; k: ChoiceKey }) {
  const t = tally(list, k);
  const cells: { label: string; n: number; mood: "like" | "neutral" | "dislike"; color: string }[] = [
    { label: "좋아요", n: t.like, mood: "like", color: "text-blue-400" },
    { label: "그저그래요", n: t.neutral, mood: "neutral", color: "text-slate-400" },
    { label: "싫어요", n: t.dislike, mood: "dislike", color: "text-slate-400" },
  ];
  return (
    <div className="p-5 rounded-[20px] bg-surface-dark border border-theme shadow-sm space-y-3">
      <span className="text-[14px] font-bold text-theme-main flex items-center gap-1.5">
        <Icon className="text-accent text-[18px]" />
        {title}
      </span>
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-theme/40">
        {cells.map(({ label, n, mood, color }) => (
          <div key={label} className="flex items-center gap-2.5 p-2 rounded-xl bg-theme-highlight/40">
            <FeedbackFace mood={mood} className={`${color} w-[22px] h-[22px]`} />
            <div className="flex flex-col">
              <span className="text-[11px] text-theme-sub font-medium">{label}</span>
              <span className={`text-[16px] font-extrabold ${color}`}>{n}명</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function P5_2_AdminMemberDetail({ member, year, feedbackData, onBack }: Props) {
  const [showExport, setShowExport] = useState(false);
  const list = feedbackData ?? [];
  const good = list.map((f) => f.good).filter(Boolean);
  const sug = list.map((f) => f.suggestions).filter(Boolean);

  const exportExcel = async () => {
    setShowExport(false);
    const base = { 연도: `${year}년`, 소속팀: member?.team || "", 사원명: member?.name || "" };
    const rows: Row[] = [];
    const max = Math.max(good.length, sug.length);
    for (let i = 0; i < max; i++) rows.push({ ...base, 좋은점: good[i] || "", 바라는점: sug[i] || "" });
    if (rows.length === 0) rows.push({ ...base, 좋은점: "작성된 피드백 없음", 바라는점: "작성된 피드백 없음" });

    const wb = createReportWorkbook();
    addReportSheet(wb, {
      name: `${member?.name || "사원"}_피드백`,
      columns: [
        { header: "연도", key: "연도", width: 14 },
        { header: "소속팀", key: "소속팀", width: 18 },
        { header: "사원명", key: "사원명", width: 16 },
        { header: "좋은점", key: "좋은점", width: 65 },
        { header: "바라는점", key: "바라는점", width: 65 },
      ],
      rows,
      mergeColumns: ["연도", "소속팀", "사원명"],
    });
    await downloadWorkbook(wb, `${year}년_${member?.name || "사원"}_360도_피드백.xlsx`);
  };

  return (
    <Layout
      title="360º 피드백"
      onBack={onBack}
      footer={
        <div className="flex gap-3 w-full">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-surface-dark text-theme-main font-bold border border-theme rounded-2xl active:scale-95 transition-all"
          >
            뒤로가기
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex-1 py-4 bg-accent text-white font-bold rounded-2xl active:scale-95 transition-all shadow-xl"
          >
            공유하기
          </button>
        </div>
      }
    >
      <div className="bg-background-dark min-h-full">
        <div className="flex flex-col items-center px-6 pt-12 pb-8 text-center">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-surface-dark border border-theme mb-6 shadow-sm">
            <span className="text-[14px] font-bold text-theme-main">{member?.name}</span>
          </div>
          <div className="text-[20px] font-black text-theme-main mb-2 tracking-tight opacity-80">{year}년</div>
          <h2 className="text-[28px] font-bold leading-tight text-theme-main mb-2">
            직원 역량 향상을 위한
            <br />
            360º 피드백
          </h2>
        </div>
        <div className="px-5 space-y-10 pb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-accent/10 flex items-center justify-center">
                <MdHandshake className="text-[18px] text-accent" />
              </div>
              <p className="text-[20px] font-bold text-theme-main">재협업 희망 여부</p>
            </div>
            <div className="space-y-3">
              <RehireCard title="업무적 협업" Icon={MdBusinessCenter} list={list} k="workRehire" />
              <RehireCard title="태도 및 소통 협업" Icon={MdFavorite} list={list} k="personalRehire" />
            </div>
          </div>

          {[
            {
              label: "좋은점",
              items: good,
              bg: "bg-blue-500/10",
              icon: <MdThumbUp className="text-[18px] text-blue-500" />,
            },
            {
              label: "바라는점",
              items: sug,
              bg: "bg-orange-500/10",
              icon: <MdLightbulb className="text-[18px] text-orange-500" />,
            },
          ].map((sec) => (
            <div key={sec.label} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-[34px] h-[34px] rounded-full ${sec.bg} flex items-center justify-center`}>
                  {sec.icon}
                </div>
                <p className="text-[20px] font-bold text-theme-main">{sec.label}</p>
                <div className="px-2 py-0.5 rounded-md bg-theme-highlight text-[13px] text-theme-sub font-medium">
                  {sec.items.length}개
                </div>
              </div>
              <div className="space-y-3">
                {sec.items.length > 0
                  ? sec.items.map((t, i) => (
                      <div key={i} className={textCard}>
                        {t}
                      </div>
                    ))
                  : empty}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showExport && (
        <Modal title="피드백 공유하기" onClose={() => setShowExport(false)}>
          <div className="mt-6 mb-6">
            <button
              onClick={exportExcel}
              className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-2xl bg-accent text-white font-bold text-[15px] active:scale-95 transition-all shadow-lg hover:brightness-110"
            >
              <MdTableView className="text-[24px]" />
              <span>Excel 파일로 다운로드</span>
            </button>
          </div>
          <button
            onClick={() => setShowExport(false)}
            className="w-full py-3.5 bg-background-dark text-theme-sub border border-theme font-bold rounded-2xl active:scale-95 transition-all text-[15px]"
          >
            취소
          </button>
        </Modal>
      )}
    </Layout>
  );
}
