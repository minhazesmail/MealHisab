'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'

const WHATSAPP_BODY_LIMIT = 1800

type SettlementExportResponse = {
  whatsappUrl: string | null
  shareText: string
}

export function SettlementExportButton({ cycleId }: { cycleId: string }) {
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const response = await fetch(`/api/reports/settlement?cycleId=${encodeURIComponent(cycleId)}`)
      const data = (await response.json()) as SettlementExportResponse & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not prepare the settlement summary')

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer')
        return
      }

      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'MealHisab BD settlement', text: data.shareText })
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return
        }
      }

      await navigator.clipboard.writeText(data.shareText)
      window.alert('The settlement summary is too long for a WhatsApp link, so the full text was copied to your clipboard.')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not export the settlement summary')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="btn-secondary" onClick={handleExport} disabled={busy}>
      <Share2 size={15} />
      {busy ? 'Preparing…' : 'Export summary'}
    </button>
  )
}
