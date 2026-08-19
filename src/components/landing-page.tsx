'use client'

import Link from 'next/link'
import { ArrowRight, Check, CircleCheck, WalletCards, Utensils, Users, Sparkles, PlayCircle } from 'lucide-react'
import { LanguageToggle, useI18n } from '@/components/language-provider'

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#g)" />
      <path d="M14 16.5C17.5 13.5 24 13.2 28.7 16.1C32.5 18.4 35 22 34.2 26.1C33.3 30.9 28.8 34 23 34C17.2 34 13.8 30.8 13.8 26.1C13.8 22.2 16.2 19.1 20.2 17.3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 21.2H31.8M21 26H29M21 30.8H27" stroke="white" strokeWidth="2.1" strokeLinecap="round" opacity=".92" />
      <path d="M28.8 11.8C31.7 10.2 35.4 10.8 37.3 13.5C33.9 14.8 30.6 14.2 28.8 11.8Z" fill="white" opacity=".94" />
      <defs>
        <linearGradient id="g" x1="8" y1="7" x2="41" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16A34A" />
          <stop offset="1" stopColor="#0F766E" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function LandingPage() {
  const { t } = useI18n()

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9f8] text-slate-950">
      <div className="absolute inset-x-0 top-0 -z-0 h-[620px] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,.13),_transparent_38%),radial-gradient(circle_at_85%_20%,_rgba(13,148,136,.12),_transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/65 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size={38} />
            <div>
              <div className="text-sm font-black tracking-tight text-slate-950 sm:text-base">MealHisab</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">BD</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link href="/demo" className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:inline-flex">
              <PlayCircle size={15} /> {t('nav.tryDemo')}
            </Link>
            <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 sm:inline-flex">
              {t('nav.logIn')}
            </Link>
            <Link href="/login" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
              {t('nav.getStarted')}
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.08fr_.92fr] lg:pb-24 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-sm">
              <Sparkles size={14} /> {t('landing.badge')}
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              {t('landing.hero1')} <span className="text-emerald-600">{t('landing.hero2')}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{t('landing.sub')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-700">
                {t('landing.startFlat')} <ArrowRight size={17} />
              </Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-3.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">
                <PlayCircle size={17} /> {t('landing.exploreDemo')}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              {[t('landing.otp'), t('landing.bdt'), t('landing.privacy')].map((text) => (
                <span key={text} className="inline-flex items-center gap-2">
                  <CircleCheck size={14} className="text-emerald-600" />
                  {text}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[44px] bg-emerald-400/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                <div className="flex items-center gap-3">
                  <LogoMark size={30} />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Mirpur Mess</p>
                    <p className="text-[11px] text-slate-400">01 Aug — 31 Aug</p>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">{t('landing.previewOpen')}</div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                {[
                  [t('landing.previewMeals'), '99', t('landing.previewThisCycle')],
                  [t('landing.previewFood'), '৳5,247', t('landing.previewGrocery')],
                  [t('landing.previewRate'), '৳53.00', t('landing.previewPerMeal')],
                ].map(([label, value, meta]) => (
                  <div key={String(label)} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-medium text-slate-400">{label}</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-slate-950">{value}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{meta}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{t('landing.previewBalances')}</p>
                  <p className="text-[11px] text-slate-400">{t('landing.previewLive')}</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-100 text-xs">
                  {[
                    ['Rahim Ahmed', '38', '৳2,014', '+৳286'],
                    ['Nabila Karim', '32', '৳1,696', '-৳196'],
                    ['Sajid Hasan', '29', '৳1,537', '-৳537'],
                  ].map(([name, meals, cost, balance], index) => (
                    <div key={name} className={`grid grid-cols-[1.6fr_.45fr_.75fr_.6fr] items-center gap-2 px-4 py-3 ${index < 2 ? 'border-b border-slate-100' : ''}`}>
                      <div className="font-semibold text-slate-800">{name}</div>
                      <div className="text-slate-500">{meals}</div>
                      <div className="text-slate-500">{cost}</div>
                      <div className={String(balance).startsWith('-') ? 'font-semibold text-rose-500' : 'font-semibold text-emerald-600'}>{balance}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-white/90 bg-white/95 p-4 shadow-xl sm:block">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                  <WalletCards size={17} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{t('landing.cycleReady')}</p>
                  <p className="text-[11px] text-slate-400">{t('landing.cycleReadyBody')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-y border-slate-200/80 py-10 sm:grid-cols-3">
          {[
            [Users, t('landing.truthTitle'), t('landing.truthBody')],
            [Utensils, t('landing.policyTitle'), t('landing.policyBody')],
            [WalletCards, t('landing.closeTitle'), t('landing.closeBody')],
          ].map(([Icon, title, body]) => (
            <div key={String(title)} className="rounded-3xl bg-white/75 p-5 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                {typeof Icon === 'function' ? <Icon size={17} /> : null}
              </div>
              <h3 className="text-sm font-bold text-slate-950">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body as string}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-10 border-b border-slate-200/80 py-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">{t('landing.tryTitle')}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t('landing.tryBody')}</h2>
            <Link href="/demo" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
              <PlayCircle size={16} /> {t('landing.launchDemo')}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [t('landing.featMeals'), t('landing.featMealsBody')],
              [t('landing.featExp'), t('landing.featExpBody')],
              [t('landing.featCont'), t('landing.featContBody')],
              [t('landing.featSet'), t('landing.featSetBody')],
            ].map(([title, body]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-50 p-2 text-emerald-600">
                    <Check size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-10 border-b border-slate-200/80 py-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">{t('landing.why')}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t('landing.whyTitle')}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{t('landing.whyBody')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [t('landing.featMeals'), t('landing.whyMeals')],
              [t('landing.featExp'), t('landing.whyExp')],
              [t('landing.featCont'), t('landing.whyCont')],
              [t('landing.featSet'), t('landing.whySet')],
            ].map(([title, body]) => (
              <div key={title + body} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-50 p-2 text-emerald-600">
                    <Check size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 rounded-[34px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/15 sm:p-8 lg:grid-cols-[1.05fr_.95fr] lg:p-10">
          <div className="flex flex-col justify-center">
            <div className="mb-5 flex items-center gap-3">
              <LogoMark size={42} />
              <div className="font-bold">MealHisab BD</div>
            </div>
            <h2 className="max-w-xl text-3xl font-black tracking-tight sm:text-4xl">{t('landing.ctaTitle')}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">{t('landing.ctaBody')}</p>
          </div>
          <div className="lg:pl-8">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 text-slate-950 shadow-2xl sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">{t('landing.getStarted')}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{t('landing.authTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('landing.authBody')}</p>
              <div className="mt-6 space-y-3">
                <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  {t('landing.continueAuth')} <ArrowRight size={16} />
                </Link>
                <Link href="/demo" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">
                  <PlayCircle size={16} /> {t('landing.tryInteractive')}
                </Link>
                <p className="text-center text-xs leading-5 text-slate-400">{t('landing.demoNote')}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} MealHisab BD. {t('landing.footer')}
          </p>
          <div className="flex gap-4">
            <Link href="/demo" className="hover:text-slate-700">
              {t('nav.tryDemo')}
            </Link>
            <Link href="/login" className="hover:text-slate-700">
              {t('nav.logIn')}
            </Link>
            <Link href="/onboarding" className="hover:text-slate-700">
              {t('landing.createFlat')}
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
