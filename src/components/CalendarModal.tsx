import { useState, useMemo } from 'react'
import { MdClose, MdChevronLeft, MdChevronRight } from 'react-icons/md'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (start: Date, end: Date) => void
  initialStartDate?: Date
  initialEndDate?: Date
}

const fmt = (d: Date | null) => {
  if (!d) return 'YYYY.MM.DD'
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarModal({ isOpen, onClose, onSelect, initialStartDate, initialEndDate }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [currentDate, setCurrentDate] = useState(today)
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate || null)
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate || null)

  const days = useMemo(() => {
    const y = currentDate.getFullYear()
    const mo = currentDate.getMonth()
    const d = new Date(y, mo, 1)
    const list: (Date | null)[] = Array.from({ length: d.getDay() }, () => null)
    while (d.getMonth() === mo) {
      list.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return list
  }, [currentDate])

  const handleClick = (date: Date) => {
    if (!startDate || endDate) {
      setStartDate(date)
      setEndDate(null)
    } else if (date < startDate) {
      setEndDate(startDate)
      setStartDate(date)
    } else {
      setEndDate(date)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-[360px] bg-surface-dark border border-theme rounded-[32px] overflow-hidden shadow-2xl animate-zoom">
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <h3 className="text-[19px] font-bold text-theme-main">날짜 선택</h3>
          <button onClick={onClose} className="text-theme-sub hover:text-theme-main transition-colors">
            <MdClose className="text-[24px]" />
          </button>
        </div>
        <div className="h-px bg-theme-highlight mx-6 mb-6" />
        <div className="flex items-center justify-center gap-12 mb-8">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="text-theme-sub hover:text-theme-main transition-colors">
            <MdChevronLeft className="text-[20px]" />
          </button>
          <div className="text-[17px] font-bold text-theme-main">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</div>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="text-theme-sub hover:text-theme-main transition-colors">
            <MdChevronRight className="text-[20px]" />
          </button>
        </div>
        <div className="px-6 mb-8">
          <div className="grid grid-cols-7 text-center mb-4">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <span key={d} className="text-[13px] font-medium text-theme-sub opacity-40">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {days.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />
              const t = date.getTime()
              const isStart = !!startDate && t === startDate.getTime()
              const isEnd = !!endDate && t === endDate.getTime()
              const selected = isStart || isEnd
              const range = !!startDate && !!endDate && date > startDate && date < endDate
              const isToday = t === today.getTime()
              return (
                <div key={i} className="relative flex items-center justify-center h-10 cursor-pointer" onClick={() => handleClick(date)}>
                  {range && <div className="absolute inset-0 bg-accent/10" />}
                  {isStart && endDate && <div className="absolute inset-y-0 right-0 left-1/2 bg-accent/10" />}
                  {isEnd && startDate && <div className="absolute inset-y-0 left-0 right-1/2 bg-accent/10" />}
                  <div className={`relative z-10 w-9 h-9 flex items-center justify-center rounded-full text-[14px] font-medium transition-all duration-300 ${selected ? 'bg-accent text-white shadow-lg scale-110' : 'text-theme-main hover:bg-theme-highlight'} ${isToday && !selected ? 'ring-1 ring-accent/40' : ''}`}>
                    {date.getDate()}
                    {isToday && !selected && <div className="absolute -bottom-1 w-1 h-1 bg-accent rounded-full" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="px-8 py-5 border-t border-theme flex items-center justify-between">
          <span className="text-[14px] text-theme-sub font-medium">선택된 기간</span>
          <span className="text-[14px] text-theme-main font-bold tracking-tight">{fmt(startDate)} - {fmt(endDate)}</span>
        </div>
        <div className="px-5 pb-6">
          <button
            disabled={!startDate || !endDate}
            onClick={() => { if (startDate && endDate) { onSelect(startDate, endDate); onClose() } }}
            className="w-full h-[56px] bg-accent text-white font-bold rounded-2xl text-[16px] shadow-xl active:scale-[0.98] transition-all disabled:opacity-30"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  )
}
