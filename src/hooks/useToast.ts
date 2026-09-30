import { useState, useCallback } from 'react'
import type { ToastType } from '../types'

export const useToast = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<ToastType>('success')

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToastMessage(message)
    setToastType(type)
    setTimeout(() => setToastMessage(null), 3000)
  }, [])

  return { toastMessage, toastType, showToast }
}
