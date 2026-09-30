import { useRef, useState } from "react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { modalAccent } from "../lib/ui";
import type { ShowToast } from "../types";

interface Props {
  currentAdminPassword: string;
  onPasswordChanged: (pw: string) => void;
  onBack: () => void;
  showToast: ShowToast;
}

type Key = "current" | "next" | "confirm";

export default function P4_1_AdminPasswordChange({
  currentAdminPassword,
  onPasswordChanged,
  onBack,
  showToast,
}: Props) {
  const [values, setValues] = useState<Record<Key, string>>({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<Key, boolean>>>({});
  const [done, setDone] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const refs: Record<Key, React.RefObject<HTMLInputElement | null>> = {
    current: currentRef,
    next: nextRef,
    confirm: confirmRef,
  };

  const fields: { key: Key; label: string }[] = [
    { key: "current", label: "현재 비밀번호" },
    { key: "next", label: "새 비밀번호" },
    { key: "confirm", label: "새 비밀번호 재확인" },
  ];

  const fail = (key: Key, msg: string) => {
    setErrors({ [key]: true });
    showToast(msg, "warning");
    refs[key].current?.focus();
  };

  const submit = () => {
    if (!values.current) return fail("current", "현재 비밀번호를 입력해주세요.");
    if (!values.next) return fail("next", "새 비밀번호를 입력해주세요.");
    if (!values.confirm) return fail("confirm", "새 비밀번호 재확인을 입력해주세요.");
    if (values.current !== currentAdminPassword) return fail("current", "현재 비밀번호가 일치하지 않습니다.");
    if (values.next !== values.confirm) return fail("confirm", "새 비밀번호가 일치하지 않습니다.");
    setErrors({});
    setDone(true);
  };

  return (
    <Layout
      title=""
      onBack={onBack}
      footer={
        <button
          onClick={submit}
          className="w-full h-[56px] bg-accent text-white font-bold rounded-2xl text-[16px] shadow-xl active:scale-[0.98] transition-all"
        >
          변경하기
        </button>
      }
    >
      <div className="px-6 pt-10 pb-8">
        <h2 className="text-[28px] font-bold leading-tight mb-4 text-theme-main">관리자 비밀번호 변경</h2>
        <p className="text-theme-sub text-[15px] font-medium opacity-70">관리자 비밀번호를 변경해주세요.</p>
      </div>
      <div className="px-6 space-y-8">
        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-3">
            <label className="text-[15px] font-bold text-theme-main ml-1">{label}</label>
            <input
              ref={refs[key]}
              type="password"
              value={values[key]}
              onChange={(e) => {
                setValues((v) => ({ ...v, [key]: e.target.value }));
                setErrors((p) => ({ ...p, [key]: false }));
              }}
              placeholder={`${label}를 입력하세요`}
              className={`w-full h-[52px] bg-surface-dark border rounded-2xl px-5 text-theme-main placeholder:text-theme-sub/30 focus:outline-none transition-all shadow-sm ${errors[key] ? "border-red-500 ring-1 ring-red-500/50" : "border-theme focus:ring-1 focus:ring-accent/20"}`}
            />
          </div>
        ))}
      </div>
      {done && (
        <Modal title="변경완료" body="비밀번호 변경이 완료되었습니다.">
          <button
            onClick={() => {
              onPasswordChanged(values.next);
              setDone(false);
            }}
            className={`w-full ${modalAccent}`}
          >
            확인
          </button>
        </Modal>
      )}
    </Layout>
  );
}
