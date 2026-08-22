'use client'

import { useEffect, useId, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useI18n } from '@/components/language-provider'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  destructive = false,
  pending = false,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  destructive?: boolean
  pending?: boolean
}) {
  const { t } = useI18n()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onCancel()
      if (event.key === 'Enter' && !pending) onConfirm()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel, onConfirm, pending])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        aria-label={t('common.cancel')}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !pending && onCancel()}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl"
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-main disabled:opacity-50"
          onClick={onCancel}
          disabled={pending}
          aria-label={t('common.cancel')}
        >
          <X size={18} />
        </button>
        <div className="flex items-start gap-4 pr-8">
          <div className="rounded-2xl bg-red-500/10 p-3 text-danger">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-bold text-main">{title}</h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? 'bg-danger text-white hover:brightness-110' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? t('common.saving') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
