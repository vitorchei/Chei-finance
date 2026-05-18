'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 2800)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-[100] max-w-lg mx-auto transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${
          type === 'success'
            ? 'bg-green-950/95 border-green-800 text-green-200'
            : 'bg-red-950/95 border-red-800 text-red-200'
        }`}
      >
        {type === 'success' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-green-400 flex-shrink-0"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-red-400 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
        )}
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}
