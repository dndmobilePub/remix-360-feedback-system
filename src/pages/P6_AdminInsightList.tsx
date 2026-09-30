import { useState } from "react";
import { MdExpandMore, MdDownload } from "react-icons/md";
import Layout from "../components/Layout";
import { addReportSheet, createReportWorkbook, downloadWorkbook } from "../utils/exportExcel";
import type { Row } from "../utils/exportExcel";
import type { FeedbackSession, Member } from "../types";

interface Props {
  sessions: FeedbackSession[];
  onBack: () => void;
}

async function downloadYear(sessions: FeedbackSession[], year: string) {
  try {
    const list = sessions.filter((s) => s.year === year);
    if (list.length === 0) return;

    const insights = list.flatMap((s) => s.insights ?? []);
    const insightRows: Row[] = insights.map((i, idx) => ({
      연도: `${year}년`,
      번호: idx + 1,
      "인사이트 내용": i.content || "",
      구분: `인사이트 #${idx + 1}`,
    }));
    if (insightRows.length === 0)
      insightRows.push({ 연도: `${year}년`, 번호: 1, "인사이트 내용": "등록된 인사이트가 없습니다.", 구분: "-" });

    const wb = createReportWorkbook();
    addReportSheet(wb, {
      name: "인사이트 평가",
      columns: [
        { header: "연도", key: "연도", width: 12 },
        { header: "번호", key: "번호", width: 10 },
        { header: "인사이트 내용", key: "인사이트 내용", width: 85 },
        { header: "구분", key: "구분", width: 18 },
      ],
      rows: insightRows,
    });

    const memberMap = new Map<string, Member>();
    list
      .flatMap((s) => s.members ?? [])
      .forEach((m) => {
        if (m?.id && !memberMap.has(m.id)) memberMap.set(m.id, m);
      });
    const members = Array.from(memberMap.values()).sort(
      (a, b) =>
        (a.team || "").trim().localeCompare((b.team || "").trim()) ||
        (a.name || "").trim().localeCompare((b.name || "").trim()),
    );
    if (members.length > 0) {
      addReportSheet(wb, {
        name: "평가 대상 사원",
        columns: [
          { header: "연도", key: "연도", width: 12 },
          { header: "번호", key: "번호", width: 10 },
          { header: "소속팀", key: "소속팀", width: 18 },
          { header: "사원명", key: "사원명", width: 16 },
        ],
        rows: members.map((m, idx) => ({
          연도: `${year}년`,
          번호: idx + 1,
          소속팀: m.team || "",
          사원명: m.name || "",
        })),
      });
    }

    await downloadWorkbook(wb, `${year}년_인사이트_평가_전체.xlsx`);
  } catch (e) {
    console.error("인사이트 전체 다운로드 오류:", e);
    alert("엑셀 파일 생성 중 오류가 발생했습니다.");
  }
}

export default function P6_AdminInsightList({ sessions, onBack }: Props) {
  const years = Array.from(new Set(sessions.map((s) => s.year))).sort((a, b) => b.localeCompare(a));
  const [openYear, setOpenYear] = useState<string | null>(years[0] || null);

  return (
    <Layout
      title="인사이트 평가"
      onBack={onBack}
      footer={
        <button
          onClick={onBack}
          className="w-full py-4 bg-accent border border-theme text-white font-bold rounded-2xl active:scale-95 transition-all"
        >
          뒤로가기
        </button>
      }
    >
      <div className="px-6 pt-12 pb-10 text-center">
        <h2 className="text-[28px] font-bold leading-tight text-theme-main">
          회사·팀 성장을 위한
          <br />
          인사이트
        </h2>
      </div>
      <div className="px-5 space-y-4 pb-16">
        {years.map((year) => {
          const insights = sessions.find((s) => s.year === year)?.insights || [];
          return (
            <div key={year} className="space-y-4">
              <button
                onClick={() => setOpenYear((p) => (p === year ? null : year))}
                className="w-full flex items-center justify-between py-4 border-b border-theme active:opacity-70 transition-all"
              >
                <h3 className="text-[20px] font-extrabold text-theme-main">{year}년</h3>
                <MdExpandMore
                  className={`text-[24px] text-theme-sub transition-transform duration-300 ${openYear === year ? "rotate-180" : ""}`}
                />
              </button>
              {openYear === year && (
                <div className="space-y-4 animate-slide">
                  {insights.length > 0 && (
                    <div className="pb-1">
                      <button
                        onClick={() => downloadYear(sessions, year)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-surface-dark hover:bg-accent hover:text-white border border-theme text-theme-main font-bold text-[14px] transition-all active:scale-[0.98] shadow-sm group"
                      >
                        <MdDownload className="text-[20px] text-accent group-hover:text-white transition-colors" />
                        <span>전체 다운로드</span>
                      </button>
                    </div>
                  )}
                  {insights.map((i, k) => (
                    <div key={k} className="p-6 rounded-[24px] bg-surface-dark border border-theme shadow-sm">
                      <p className="custom-scrollbar text-[15px] leading-relaxed text-theme-main opacity-80 break-all whitespace-pre-wrap max-h-[285px] overflow-y-auto overscroll-contain">
                        {i.content}
                      </p>
                    </div>
                  ))}
                  {insights.length === 0 && (
                    <div className="py-10 text-center text-theme-sub text-sm italic opacity-40">
                      등록된 인사이트가 없습니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {years.length === 0 && <p className="text-center text-theme-sub py-10">등록된 데이터가 없습니다.</p>}
      </div>
    </Layout>
  );
}
