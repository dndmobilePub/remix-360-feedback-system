import { useRef, useState } from 'react'
import { MdExpandMore } from 'react-icons/md'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { btnAccent, modalAccent } from '../lib/ui'
import { TEAMS } from '../data/mock'
import type { Member, ShowToast } from '../types'

interface Props {
  onRegister: (data: Pick<Member, 'name' | 'team'>) => void
  onBack: () => void
  showToast: ShowToast
}

const field = (err?: boolean) => `w-full h-[52px] bg-surface-dark border rounded-2xl px-5 text-theme-main focus:outline-none transition-all shadow-sm ${err ? 'border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-white/10 focus:ring-1 focus:ring-accent/20'}`

export default function P7_3_AdminMemberRegister({ onRegister, onBack, showToast }: Props) {
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<{ name?: boolean; team?: boolean }>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const teamRef = useRef<HTMLSelectElement>(null)

  const submit = () => {
    if (!team) { setErrors({ team: true }); showToast('팀명을 선택해주세요.', 'warning'); teamRef.current?.focus(); return }
    if (!name.trim()) { setErrors({ name: true }); showToast('이름을 입력해주세요.', 'warning'); nameRef.current?.focus(); return }
    setErrors({})
    setDone(true)
  }

  return (
    <Layout title="직원 추가하기" onBack={onBack} footer={<button onClick={submit} className={btnAccent}>직원 추가하기</button>}>
      <div className="px-6 pt-10 pb-8">
        <h2 className="text-[28px] font-bold leading-tight mb-4 text-theme-main">직원 추가하기</h2>
        <p className="text-theme-sub text-[15px] font-medium opacity-70">새로운 직원의 정보를 입력해주세요.</p>
      </div>
      <div className="px-6 space-y-8 pb-10">
        <div className="space-y-3">
          <label className="text-[15px] font-bold text-theme-main ml-1">팀명</label>
          <div className="relative">
            <select ref={teamRef} value={team} onChange={(e) => { setTeam(e.target.value); setErrors((p) => ({ ...p, team: false })) }} className={`${field(errors.team)} appearance-none`}>
              <option value="" disabled>팀을 선택해주세요</option>
              {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none"><MdExpandMore className="text-[24px] text-zinc-500" /></div>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[15px] font-bold text-theme-main ml-1">이름</label>
          <input ref={nameRef} type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })) }} placeholder="이름을 입력하세요" className={`${field(errors.name)} placeholder:text-zinc-600`} />
        </div>
      </div>
      {done && (
        <Modal title="추가 완료" body="직원 정보가 추가되었습니다.">
          <button onClick={() => { onRegister({ name: name.trim(), team }); setDone(false) }} className={`w-full ${modalAccent}`}>확인</button>
        </Modal>
      )}
    </Layout>
  )
}
