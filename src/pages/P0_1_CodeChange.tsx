import { useState } from 'react'
import { MdLockReset, MdVpnKey, MdCheckCircle } from 'react-icons/md'
import Layout from '../components/Layout'
import { iconInput } from '../lib/ui'
import type { ShowToast } from '../types'

interface Props {
  currentName: string
  onComplete: (newCode: string) => void
  onBack: () => void
  showToast: ShowToast
}

export default function P0_1_CodeChange({ currentName, onComplete, onBack, showToast }: Props) {
  const [newCode, setNewCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')

  const submit = () => {
    if (!newCode.trim()) return showToast('새로운 코드를 입력해주세요.', 'warning')
    if (newCode.length < 4) return showToast('코드는 최소 4자 이상이어야 합니다.', 'warning')
    if (newCode !== confirmCode) return showToast('코드가 일치하지 않습니다.', 'warning')
    onComplete(newCode.trim())
  }

  return (
    <Layout title="개인 코드 변경" onBack={onBack}>
      <div className="px-6 pt-10 pb-8 text-center">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <MdLockReset className="text-accent text-[40px]" />
        </div>
        <h2 className="text-[24px] font-bold leading-tight mb-3 text-theme-main">
          {currentName}님, 안녕하세요!<br />보안을 위해 코드를 변경해주세요.
        </h2>
        <p className="text-theme-sub text-[14px]">처음 로그인 시 개인 코드 변경이 필요합니다.</p>
      </div>
      <div className="px-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-theme-sub ml-1">새로운 코드</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MdVpnKey className="text-theme-sub text-[20px]" /></div>
            <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="새로운 코드를 입력하세요" className={iconInput} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-theme-sub ml-1">코드 확인</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MdCheckCircle className="text-theme-sub text-[20px]" /></div>
            <input type="text" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="코드를 다시 한번 입력하세요" className={iconInput} />
          </div>
        </div>
        <div className="pt-6">
          <button onClick={submit} className="w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-xl active:scale-[0.98] transition-all text-[16px]">변경 완료 및 로그인</button>
        </div>
      </div>
    </Layout>
  )
}
