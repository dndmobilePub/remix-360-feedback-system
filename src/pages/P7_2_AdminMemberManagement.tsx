import { useState } from 'react'
import { MdClose, MdExpandMore } from 'react-icons/md'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { modalAccent, modalDanger, modalGhost } from '../lib/ui'
import type { FeedbackSession, Member } from '../types'

interface Props {
  members: Member[]
  allSessions: FeedbackSession[]
  sessionYear: string
  sessionType: string
  onDeleteMember: (id: string) => void
  onAddMember: () => void
  onMembersLoaded: (m: Member[]) => void
  onRegisterComplete: () => void
  onBack: () => void
}

const ghostBtn = 'flex-1 py-4 bg-background-dark border border-theme text-theme-main font-bold rounded-2xl active:scale-95 transition-all'

export default function P7_2_AdminMemberManagement({ members, allSessions, sessionYear, sessionType, onDeleteMember, onAddMember, onMembersLoaded, onRegisterComplete, onBack }: Props) {
  const [toDelete, setToDelete] = useState<Member | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [complete, setComplete] = useState(false)
  const [importModal, setImportModal] = useState(false)

  const prev360 = allSessions.filter((s) => s.type === '360도 다면 피드백' && s.year < sessionYear)
  const [importDone, setImportDone] = useState(prev360.length === 0 || members.length > 0)
  const teams = Array.from(new Set(members.map((m) => m.team)))

  const doImport = () => {
    const latest = [...prev360].sort((a, b) => b.year.localeCompare(a.year))[0]
    if (latest) onMembersLoaded(latest.members.map((m) => ({ ...m, isAvailable: true })))
    setImportModal(false)
    setImportDone(true)
  }

  return (
    <Layout
      title="직원 명단 관리"
      onBack={onBack}
      footer={
        <div className="flex gap-3 w-full">
          {!importDone
            ? <button onClick={() => setImportModal(true)} className={ghostBtn}>직원 불러오기</button>
            : <button onClick={onAddMember} className={ghostBtn}>직원 추가하기</button>}
          <button onClick={() => setConfirm(true)} className="flex-1 py-4 bg-accent text-white font-bold rounded-2xl active:scale-95 transition-all shadow-xl">등록하기</button>
        </div>
      }
    >
      <div className="px-6 pt-10 pb-10">
        <h2 className="text-[28px] font-bold leading-tight mb-4 text-theme-main">직원 명단 관리</h2>
        <div className="space-y-1">
          <p className="text-theme-sub text-[15px] font-medium opacity-70 leading-relaxed">
            {!importDone ? '직원 불러오기를 통해 이전 명단을 가져올 수 있습니다.' : '직원을 추가하려면 하단 버튼에서 직원추가를 눌러주세요.'}
          </p>
          <p className="text-theme-sub text-[15px] font-medium opacity-70 leading-relaxed">직원을 삭제하려면 이름 옆에 x버튼을 눌러주세요.</p>
        </div>
      </div>

      <div className="px-5 space-y-10 pb-20">
        {teams.length > 0 ? teams.map((team) => (
          <div key={team}>
            <div className="flex items-center justify-between py-2 mb-5 border-b border-theme">
              <h3 className="text-[19px] font-bold text-theme-main">{team}</h3>
              <MdExpandMore className="text-[24px] text-theme-sub rotate-180" />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {members.filter((m) => m.team === team).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-dark border border-theme shadow-sm">
                  <span className="text-[15px] font-bold text-theme-main truncate">{m.name}</span>
                  <button onClick={() => setToDelete(m)} className="flex items-center justify-center ml-2 text-theme-sub opacity-40 hover:opacity-100 transition-opacity">
                    <MdClose className="text-[16px]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )) : <div className="py-20 text-center text-theme-sub opacity-40">직원 명단이 비어있습니다.</div>}
      </div>

      {importModal && (
        <Modal z={110} title="직원 불러오기" body={<>이전 피드백 명단을<br />불러오시겠습니까?</>} onClose={() => { setImportModal(false); setImportDone(true) }}>
          <div className="flex gap-3">
            <button onClick={() => { setImportModal(false); setImportDone(true) }} className={modalGhost}>취소</button>
            <button onClick={doImport} className={modalAccent}>불러오기</button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title="피드백 등록하기" body={<>{sessionYear}년 {sessionType}을<br />등록하시겠습니까?</>} onClose={() => setConfirm(false)}>
          <div className="flex gap-3">
            <button onClick={() => setConfirm(false)} className={modalGhost}>취소하기</button>
            <button onClick={() => { setConfirm(false); setComplete(true) }} className={modalAccent}>등록하기</button>
          </div>
        </Modal>
      )}
      {complete && (
        <Modal title="등록 완료" body={<>{sessionYear}년 {sessionType}이<br />등록되었습니다.</>}>
          <button onClick={onRegisterComplete} className={`w-full ${modalAccent}`}>확인</button>
        </Modal>
      )}
      {toDelete && (
        <Modal title="등록 삭제" body="직원 정보를 삭제하시겠습니까?" onClose={() => setToDelete(null)}>
          <div className="flex gap-3">
            <button onClick={() => setToDelete(null)} className={modalGhost}>취소하기</button>
            <button onClick={() => { onDeleteMember(toDelete.id); setToDelete(null) }} className={modalDanger}>삭제하기</button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
