import { MdCheckCircle, MdError } from 'react-icons/md'
import type { ToastType } from '../types'

export default function Toast({ message, type = 'success' }: { message: string; type?: ToastType }) {
  const warn = type === 'warning'
  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
        warn ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-500/20' : 'bg-surface-dark border border-theme'
      } backdrop-blur-sm px-6 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-2 animate-zoom pointer-events-none`}
    >
      {warn ? <MdError className="text-[20px] text-red-600" /> : <MdCheckCircle className="text-[20px] text-green-600" />}
      <span className={`font-bold text-sm ${warn ? 'text-red-900 dark:text-red-200' : 'text-theme-main'}`}>{message}</span>
    </div>
  )
}
