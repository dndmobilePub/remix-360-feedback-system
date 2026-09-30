import { MdGroups, MdShowChart } from 'react-icons/md'
import Layout from '../components/Layout'

interface Props { onSelect360: () => void; onSelectInsight: () => void; onBack: () => void }

const card = 'w-full flex flex-col gap-3 p-5 rounded-[28px] bg-surface-dark border border-white/5 transition-all text-left group active:scale-[0.98] shadow-lg'
const circle = 'w-11 h-11 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors'

export default function P5_AdminDashboard({ onSelect360, onSelectInsight, onBack }: Props) {
  return (
    <Layout title="피드백 확인하기" onBack={onBack}>
      <div className="px-6 pt-8 pb-6">
        <h2 className="text-[24px] font-bold leading-tight mb-2 text-theme-main">피드백 확인하기</h2>
        <p className="text-theme-sub text-[14px] font-medium opacity-70">확인할 피드백 유형을 선택해주세요.</p>
      </div>
      <div className="px-5 space-y-3">
        <button onClick={onSelect360} className={card}>
          <div className={circle}><MdGroups className="text-[24px]" /></div>
          <div>
            <h3 className="text-[18px] font-bold mb-1 text-theme-main">360도 다면피드백</h3>
            <p className="text-[13px] text-theme-sub font-medium opacity-60">구성원 피드백 및 다면 진단 결과 확인</p>
          </div>
        </button>
        <button onClick={onSelectInsight} className={card}>
          <div className={circle}><MdShowChart className="text-[24px]" /></div>
          <div>
            <h3 className="text-[18px] font-bold mb-1 text-theme-main">인사이트 평가</h3>
            <p className="text-[13px] text-theme-sub font-medium opacity-60">AI 기반의 인사이트 리포트 확인</p>
          </div>
        </button>
      </div>
    </Layout>
  )
}
