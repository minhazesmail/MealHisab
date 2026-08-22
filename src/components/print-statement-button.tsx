'use client'

export function PrintStatementButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50">
      Print / Save PDF
    </button>
  )
}
