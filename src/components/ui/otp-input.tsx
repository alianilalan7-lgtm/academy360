'use client'

import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  error,
  disabled = false,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length)

  function focusInput(index: number) {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus()
    }
  }

  function handleChange(index: number, digit: string) {
    if (!/^\d*$/.test(digit)) return

    const newDigits = [...digits]
    newDigits[index] = digit.slice(-1)
    const newValue = newDigits.join('')
    onChange(newValue)

    if (digit && index < length - 1) {
      focusInput(index + 1)
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        focusInput(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      focusInput(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      focusInput(index + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '')
    if (pastedData) {
      onChange(pastedData.slice(0, length))
      const lastIndex = Math.min(pastedData.length, length) - 1
      focusInput(lastIndex)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            disabled={disabled}
            className={cn(
              'h-12 w-10 rounded-lg border-2 text-center text-xl font-semibold transition-all duration-200',
              'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
              'disabled:cursor-not-allowed disabled:bg-gray-50',
              'sm:h-14 sm:w-12 sm:text-2xl',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : focusedIndex === index
                ? 'border-emerald-500'
                : digit
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-300'
            )}
            aria-label={`Kod hanesi ${index + 1}`}
          />
        ))}
      </div>
      {error && (
        <p className="text-center text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
