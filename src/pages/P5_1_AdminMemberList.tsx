import { useState } from "react";
import { MdExpandMore, MdDownload } from "react-icons/md";
import Layout from "../components/Layout";
import { pct, tally } from "../lib/tally";
import { addReportSheet, createReportWorkbook, downloadWorkbook } from "../utils/exportExcel";
import type { Row } from "../utils/exportExcel";
import type { Feedback, FeedbackSession, Member } from "../types";

interface Props {
  sessions: FeedbackSession[];
  onMemberSelect: (m: Member, year: string) => void;
  onBack: () => void;
}

const byTeamName = (a: Member, b: Member) =>
  (a.team || "").trim().localeCompare((b.team || "").trim()) ||
  (a.name || "").trim().localeCompare((b.name || "").trim());

async function downloadYear(sessions: FeedbackSession[], year: string) {
  try {
    const list = sessions.filter((s) => s.year === year);
    if (list.length === 0) return alert(`${year}년도 세션 데이터를 찾을 수 없습니다.`);

    const memberMap = new Map<string, Member>();
    const fbMap: Record<string, Feedback[]> = {};
    list.forEach((s) => {
      s.members.forEach((m) => {
        if (m?.id && !memberMap.has(m.id)) memberMap.set(m.id, m);
      });
      Object.entries(s.feedbacks ?? {}).forEach(([mid, fbs]) => {
        (fbMap[mid] ||= []).push(...fbs);
      });
    });
    const members = Array.from(memberMap.values()).sort(byTeamName);

    const detailRows: Row[] = [];
    const summaryRows: Row[] = [];
    const mergeRowRanges: { rowNumber: number; fromCol: number; toCol: number }[] = [];

    members.forEach((member) => {
      const fbs = fbMap[member.id] ?? [];
      const n = fbs.length;
      const w = tally(fbs, "workRehire");
      const p = tally(fbs, "personalRehire");
      const wTxt = `${pct(w.like, n)}% / ${pct(w.neutral, n)}% / ${pct(w.dislike, n)}% (${w.like}/${w.neutral}/${w.dislike})`;
      const pTxt = `${pct(p.like, n)}% / ${pct(p.neutral, n)}% / ${pct(p.dislike, n)}% (${p.like}/${p.neutral}/${p.dislike})`;

      summaryRows.push({
        연도: `${year}년`,
        소속팀: member.team || "",
        사원명: member.name || "",
        "참여 인원(총 피드백 수)": `${n}명`,
        "업무적 협업(좋아요/그저그래요/싫어요)": wTxt,
        "태도 및 소통 협업(좋아요/그저그래요/싫어요)": pTxt,
        "좋은점 요약": fbs.map((f, i) => `${i + 1}. ${f.good || ""}`).join("\n\n") || "작성된 내용 없음",
        "바라는점 요약": fbs.map((f, i) => `${i + 1}. ${f.suggestions || ""}`).join("\n\n") || "작성된 내용 없음",
      });

      if (n > 0) {
        fbs.forEach((fb, i) => {
          detailRows.push({
            연도: `${year}년`,
            소속팀: member.team || "",
            사원명: member.name || "",
            "피드백 번호": i + 1,
            "업무적 협업": fb.workRehire || (fb.rehire === true ? "좋아요" : fb.rehire === false ? "싫어요" : "-"),
            "태도 및 소통 협업":
              fb.personalRehire || (fb.rehire === true ? "좋아요" : fb.rehire === false ? "싫어요" : "-"),
            좋은점: fb.good || "",
            바라는점: fb.suggestions || "",
          });
        });
      } else {
        detailRows.push({
          연도: `${year}년`,
          소속팀: member.team || "",
          사원명: member.name || "",
          "피드백 번호": "-",
          "업무적 협업": "-",
          "태도 및 소통 협업": "-",
          좋은점: "작성된 피드백 없음",
          바라는점: "작성된 피드백 없음",
        });
      }

      const combined =
        n > 0
          ? `• 업무적 협업 : 좋아요 ${pct(w.like, n)}%, 그저그래요 ${pct(w.neutral, n)}%, 싫어요 ${pct(w.dislike, n)}% (${w.like}/${w.neutral}/${w.dislike})\n• 태도 및 소통 협업 : 좋아요 ${pct(p.like, n)}%, 그저그래요 ${pct(p.neutral, n)}%, 싫어요 ${pct(p.dislike, n)}% (${p.like}/${p.neutral}/${p.dislike})`
          : "• 업무적 협업 : 응답 없음\n• 태도 및 소통 협업 : 응답 없음";

      detailRows.push({
        연도: `${year}년`,
        소속팀: member.team || "",
        사원명: member.name || "",
        "피드백 번호": combined,
        "업무적 협업": "",
        "태도 및 소통 협업": "",
        좋은점: `[${member.name} 님 총 ${n}명 참여 완료]`,
        바라는점: "-",
        _isGroupSummary: true,
      });
      // 헤더가 1행이므로 방금 추가한 행 번호 = detailRows.length + 1
      mergeRowRanges.push({ rowNumber: detailRows.length + 1, fromCol: 4, toCol: 6 });
    });

    if (detailRows.length === 0) {
      detailRows.push({
        연도: `${year}년`,
        소속팀: "-",
        사원명: "-",
        "피드백 번호": "-",
        "업무적 협업": "-",
        "태도 및 소통 협업": "-",
        좋은점: "등록된 사원 데이터가 없습니다.",
        바라는점: "-",
      });
    }
    if (summaryRows.length === 0) {
      summaryRows.push({
        연도: `${year}년`,
        소속팀: "-",
        사원명: "-",
        "참여 인원(총 피드백 수)": "0명",
        "업무적 협업(좋아요/그저그래요/싫어요)": "0 / 0 / 0",
        "태도 및 소통 협업(좋아요/그저그래요/싫어요)": "0 / 0 / 0",
        "좋은점 요약": "등록된 사원 데이터가 없습니다.",
        "바라는점 요약": "-",
      });
    }

    const wb = createReportWorkbook();
    addReportSheet(wb, {
      name: "360 피드백 상세",
      columns: [
        { header: "연도", key: "연도", width: 12 },
        { header: "소속팀", key: "소속팀", width: 20 },
        { header: "사원명", key: "사원명", width: 16 },
        { header: "피드백 번호", key: "피드백 번호", width: 18 },
        { header: "업무적 협업", key: "업무적 협업", width: 26 },
        { header: "태도 및 소통 협업", key: "태도 및 소통 협업", width: 26 },
        { header: "좋은점", key: "좋은점", width: 60 },
        { header: "바라는점", key: "바라는점", width: 60 },
      ],
      rows: detailRows,
      mergeRowRanges,
      autoFilter: { from: "B1", to: `C${detailRows.length + 1}` },
    });
    addReportSheet(wb, {
      name: "사원별 요약",
      columns: [
        { header: "연도", key: "연도", width: 12 },
        { header: "소속팀", key: "소속팀", width: 20 },
        { header: "사원명", key: "사원명", width: 16 },
        { header: "참여 인원(총 피드백 수)", key: "참여 인원(총 피드백 수)", width: 22 },
        { header: "업무적 협업(좋아요/그저그래요/싫어요)", key: "업무적 협업(좋아요/그저그래요/싫어요)", width: 34 },
        {
          header: "태도 및 소통 협업(좋아요/그저그래요/싫어요)",
          key: "태도 및 소통 협업(좋아요/그저그래요/싫어요)",
          width: 34,
        },
        { header: "좋은점 요약", key: "좋은점 요약", width: 65 },
        { header: "바라는점 요약", key: "바라는점 요약", width: 65 },
      ],
      rows: summaryRows,
      isSummary: true,
    });
    await downloadWorkbook(wb, `${year}년_360도_다면피드백_전체.xlsx`);
  } catch (e) {
    console.error("360 피드백 전체 다운로드 중 오류:", e);
    alert("엑셀 파일 생성 중 오류가 발생했습니다.");
  }
}

export default function P5_1_AdminMemberList({ sessions, onMemberSelect, onBack }: Props) {
  const years = Array.from(new Set(sessions.map((s) => s.year))).sort((a, b) => b.localeCompare(a));
  const [openYear, setOpenYear] = useState<string | null>(years[0] || null);
  const [openTeams, setOpenTeams] = useState<Record<string, string | null>>({});

  return (
    <Layout
      title="360º 다면 피드백"
      onBack={onBack}
      footer={
        <button
          onClick={onBack}
          className="w-full bg-accent text-white font-bold py-4 rounded-2xl text-lg shadow-xl active:scale-[0.98]"
        >
          처음화면으로
        </button>
      }
    >
      <div className="px-6 pt-10 pb-10 text-theme-main">
        <h2 className="text-[22px] font-bold leading-tight mb-3">
          직원 역량 향상을 위한
          <br />
          360º 피드백
        </h2>
        <p className="text-theme-sub text-[15px] font-medium opacity-70">확인하고 싶은 직원을 눌러주세요.</p>
      </div>
      <div className="px-5 space-y-6 pb-20">
        {years.map((year) => {
          const s = sessions.find((x) => x.year === year);
          if (!s) return null;
          const teams = Array.from(new Set(s.members.map((m) => m.team)));
          return (
            <div key={year} className="space-y-4">
              <button
                onClick={() => setOpenYear((p) => (p === year ? null : year))}
                className="w-full flex items-center justify-between py-4 border-b border-theme active:opacity-70 transition-all"
              >
                <h3 className="text-[22px] font-extrabold text-theme-main">{year}년</h3>
                <MdExpandMore
                  className={`text-[24px] text-theme-sub transition-transform duration-300 ${openYear === year ? "rotate-180" : ""}`}
                />
              </button>
              {openYear === year && teams.length > 0 && (
                <div className="bg-surface-dark border border-theme rounded-[28px] px-[10px] py-[15px] space-y-1 animate-slide">
                  {teams.map((team) => {
                    const isOpen = openTeams[year] === team;
                    return (
                      <div key={team} className="w-full">
                        <button
                          onClick={() => setOpenTeams((p) => ({ ...p, [year]: p[year] === team ? null : team }))}
                          className={`w-full flex items-center justify-between px-2 h-[52px] active:opacity-70 transition-all border-b ${isOpen ? "border-theme" : "border-transparent"}`}
                        >
                          <h4 className="text-[17px] font-bold text-theme-main">{team}</h4>
                          <MdExpandMore
                            className={`text-theme-sub text-[20px] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="grid grid-cols-3 gap-2 animate-zoom px-1 pt-4 pb-6">
                            {s.members
                              .filter((m) => m.team === team)
                              .map((member) => {
                                const count = s.feedbacks?.[member.id]?.length || 0;
                                return (
                                  <button
                                    key={member.id}
                                    onClick={() => onMemberSelect(member, year)}
                                    className="relative flex items-center justify-center py-3.5 px-2 rounded-xl text-[14px] font-bold transition-all bg-background-dark border border-theme text-theme-main hover:border-accent/40 active:scale-95 shadow-sm"
                                  >
                                    <span className="truncate">{member.name}</span>
                                    {count > 0 && (
                                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-black shadow-sm">
                                        {count}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="pt-3 px-1 pb-1">
                    <button
                      onClick={() => downloadYear(sessions, year)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-theme-highlight hover:bg-accent hover:text-white border border-theme text-theme-main font-bold text-[14px] transition-all active:scale-[0.98] shadow-sm group"
                    >
                      <MdDownload className="text-[20px] text-accent group-hover:text-white transition-colors" />
                      <span>전체 다운로드</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {years.length === 0 && <p className="text-center text-theme-sub py-10">등록된 세션이 없습니다.</p>}
      </div>
    </Layout>
  );
}
