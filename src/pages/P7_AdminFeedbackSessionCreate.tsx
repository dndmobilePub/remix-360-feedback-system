import { useRef, useState } from "react";
import { MdExpandMore, MdCalendarMonth, MdVpnKey } from "react-icons/md";
import Layout from "../components/Layout";
import CalendarModal from "../components/CalendarModal";
import { btnAccent } from "../lib/ui";
import type { FeedbackSession, ShowToast } from "../types";

interface Props {
  sessions: FeedbackSession[];
  onNext: (year: string, type: string, period: string, initialCode: string) => void;
  onBack: () => void;
  showToast: ShowToast;
}

type Err = { year?: boolean; type?: boolean; period?: boolean; code?: boolean };

const fmt = (d: Date) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
const field = (err?: boolean) =>
  `w-full h-[52px] bg-surface-dark border rounded-2xl px-5 text-theme-main focus:outline-none transition-all shadow-sm ${err ? "border-red-500 ring-1 ring-red-500/50" : "border-theme focus:ring-1 focus:ring-accent/20"}`;

export default function P7_AdminFeedbackSessionCreate({ sessions, onNext, onBack, showToast }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [period, setPeriod] = useState("");
  const [code, setCode] = useState("");
  const [calendar, setCalendar] = useState(false);
  const [errors, setErrors] = useState<Err>({});

  const yearRef = useRef<HTMLSelectElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const yearOptions = Array.from({ length: 8 }, (_, i) => String(currentYear - 2 + i));

  const prefill = (y: string, t: string) => {
    if (!y || !t) return;
    const existing = sessions.find((s) => s.year === y && s.type === t);
    if (existing) {
      setPeriod(existing.period);
      setCode(existing.code || `DND${y}`);
    } else {
      setPeriod(sessions.find((s) => s.year === y)?.period ?? "");
      setCode(`DND${y}`);
    }
  };

  const next = () => {
    if (!year) {
      setErrors({ year: true });
      showToast("생성할 년도를 선택해주세요.", "warning");
      yearRef.current?.focus();
      return;
    }
    if (!type) {
      setErrors({ type: true });
      showToast("피드백 목록을 선택해주세요.", "warning");
      typeRef.current?.focus();
      return;
    }
    if (!period) {
      setErrors({ period: true });
      showToast("오픈 기간을 설정해주세요.", "warning");
      setCalendar(true);
      return;
    }
    if (!code.trim()) {
      setErrors({ code: true });
      showToast("초기 코드를 입력해주세요.", "warning");
      codeRef.current?.focus();
      return;
    }
    if (sessions.some((session) => session.year === year && session.type === type)) {
      showToast("이미 등록된 피드백 세션이 존재합니다.", "warning");
      return;
    }
    setErrors({});
    onNext(year, type, period, code.trim());
  };

  const chevron = (
    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
      <MdExpandMore className="text-[24px] text-theme-sub" />
    </div>
  );

  return (
    <Layout
      title="신규 피드백 추가하기"
      onBack={onBack}
      footer={
        <button onClick={next} className={btnAccent}>
          다음
        </button>
      }
    >
      <div className="px-6 pt-10 pb-8">
        <h2 className="text-[28px] font-bold leading-tight mb-4 text-theme-main">신규 피드백 추가하기</h2>
        <p className="text-theme-sub text-[15px] font-medium opacity-70">새로운 피드백을 추가해주세요.</p>
      </div>
      <div className="px-6 space-y-8">
        <div className="space-y-3">
          <label className="text-[15px] font-bold text-theme-main ml-1">생성할 년도</label>
          <div className="relative">
            <select
              ref={yearRef}
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setErrors((p) => ({ ...p, year: false }));
                prefill(e.target.value, type);
              }}
              className={`${field(errors.year)} appearance-none`}
            >
              <option value="" disabled>
                년도를 선택해주세요
              </option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            {chevron}
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[15px] font-bold text-theme-main ml-1">피드백 목록</label>
          <div className="relative">
            <select
              ref={typeRef}
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setErrors((p) => ({ ...p, type: false }));
                prefill(year, e.target.value);
              }}
              className={`${field(errors.type)} appearance-none`}
            >
              <option value="" disabled>
                피드백을 선택해주세요
              </option>
              <option value="360도 다면 피드백">360도 다면 피드백</option>
              <option value="인사이트 피드백">인사이트 피드백</option>
            </select>
            {chevron}
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[15px] font-bold text-theme-main ml-1">오픈 기간 설정</label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={period}
              placeholder="YYYY.MM.DD - YYYY.MM.DD"
              onClick={() => setCalendar(true)}
              className={`${field(errors.period)} placeholder:text-theme-sub/40 cursor-pointer`}
            />
            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
              <MdCalendarMonth className="text-[20px] text-theme-sub" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[15px] font-bold text-theme-main ml-1">초기 코드 설정</label>
          <div className="relative">
            <input
              ref={codeRef}
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErrors((p) => ({ ...p, code: false }));
              }}
              placeholder="초기 코드를 입력해주세요 (예: DND2025)"
              className={`${field(errors.code)} placeholder:text-theme-sub/40`}
            />
            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
              <MdVpnKey className="text-[20px] text-theme-sub" />
            </div>
          </div>
          <p className="text-[12px] text-theme-sub opacity-60 ml-1">
            이 코드는 직원들의 초기 로그인 코드로 사용됩니다.
          </p>
        </div>
      </div>
      <CalendarModal
        isOpen={calendar}
        onClose={() => setCalendar(false)}
        onSelect={(s, e) => {
          setPeriod(`${fmt(s)} - ${fmt(e)}`);
          setErrors((p) => ({ ...p, period: false }));
        }}
      />
    </Layout>
  );
}
