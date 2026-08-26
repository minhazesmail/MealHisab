import Link from 'next/link'
import { redirect } from 'next/navigation'

export default function ManagerRegistrationPage() {
  return <main className="min-h-screen bg-canvas px-4 py-10 text-main"><div className="mx-auto max-w-xl"><Link href="/account-type" className="text-sm font-semibold text-muted hover:text-main">← Back</Link><div className="card mt-6 space-y-5 border-brand-green/20"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Flat Manager</p><h1 className="mt-2 text-3xl font-black">Register as a Flat Manager</h1><p className="mt-2 text-sm leading-6 text-muted">Enter your name and choose phone or email verification. After OTP verification, you’ll activate the ৳49/month Manager Plan before creating your flat.</p></div><Link href="/login?role=manager&next=/manager/subscribe" className="btn-primary flex w-full justify-center">Continue to OTP verification</Link><p className="text-center text-xs text-muted">Already registered? <Link href="/login" className="font-semibold text-brand-green">Log in</Link></p></div></div></main>
}
