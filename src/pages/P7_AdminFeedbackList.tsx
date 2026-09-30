import { useState } from 'react'
import { MdExpandMore } from 'react-icons/md'
import Layout from '../components/Layout'
import type { FeedbackSession } from '../types'

interface Props {
  sessions: FeedbackSession[]
  onSelectSession: (s: FeedbackSession) => void
  onRegister: () => void
  onBack: () => void
}

export default function P7_AdminFeedbackList({ sessions, onSelectSession, onRegister, onBack }: Props) {
  const [open, setOpen] = useState({ fb: true, insight: true })
  const sorted = (type: string) => sessions.filter((s) => s.type === type).sort((a, b) => b.year.localeCompare(a.year))

  const groups = [
    { key: 'fb' as const, title: '360도 피드백', list: sorted('360도 다면 피드백'), suffix: '다면피드백' },
    { key: 'insight' as const, title: '인사이트 피드백', list: sorted('인사이트 피드백'), suffix: '인사이트 피드백' },
  ]

  return (
    <Layout
      title="피드백 관리하기"
      onBack={onBack}
      footer={<button onClick={onRegister} className="w-full h-[56px] bg-accent text-white font-bold rounded-2xl text-[16px] shadow-xl active:scale-[0.98] transition-all">등록하기</button>}
    >
      <div className="px-6 pt-10 pb-8">
        <h2 className="text-[28px] font-bold leading-tight mb-4 text-theme-main">피드백 관리하기</h2>
        <p className="text-theme-sub text-[15px] font-medium opacity-70">피드백 항목들을 관리해주세요</p>
      </div>
      <div className="px-5 space-y-10 pb-20">
        {groups.map((g) => (
          <div key={g.key} className="space-y-4">
            <button onClick={() => setOpen((p) => ({ ...p, [g.key]: !p[g.key] }))} className="w-full flex items-center justify-between py-2 border-b border-theme">
              <h3 className="text-[20px] font-bold text-theme-main">{g.title}</h3>
              <MdExpandMore className={`text-[24px] text-theme-sub transition-transform duration-300 ${open[g.key] ? 'rotate-180' : ''}`} />
            </button>
            {open[g.key] && (
              <div className="space-y-3 animate-slide">
                {g.list.map((s) => (
                  <div key={s.id} onClick={() => onSelectSession(s)} className="flex items-center justify-between p-6 bg-surface-dark border border-theme rounded-[24px] cursor-pointer active:scale-[0.98] transition-all hover:bg-accent/5">
                    <span className="text-[17px] font-bold text-theme-main opacity-80">{s.year}년 {g.suffix}</span>
                  </div>
                ))}
                {g.list.length === 0 && <p className="text-sm text-theme-sub py-4 text-center italic opacity-40">등록된 항목이 없습니다.</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  )
}
