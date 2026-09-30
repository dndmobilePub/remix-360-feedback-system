import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  body?: ReactNode
  onClose?: () => void
  children?: ReactNode
  z?: number
}

export default function Modal({ title, body, onClose, children, z = 100 }: ModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center px-8" style={{ zIndex: z }}>
      <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-md animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-[320px] bg-surface-dark border border-theme rounded-[32px] p-8 shadow-2xl animate-zoom text-center">
        <h3 className="text-[22px] font-bold text-theme-main mb-3">{title}</h3>
        {body && <p className="text-[15px] text-theme-sub font-medium mb-8 leading-relaxed">{body}</p>}
        {children}
      </div>
    </div>
  )
}
