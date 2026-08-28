import type { Metadata } from 'next'
import LandingPage from '@/components/landing-page'
import UniversityTrustBanner from '@/components/university-trust-banner'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'MealHisab BD — Simple meal accounting for shared flats',
  description:
    'Track meals, expenses, contributions and monthly settlements for Bangladeshi messes, shared flats and small households.',
}

export default function Home() {
  return (
    <>
      <LandingPage />
      <style>{`
        footer > p:first-child {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.45rem;
        }
        footer > p:first-child::after {
          content: 'By Hemilin Studio';
          display: inline-flex;
          align-items: center;
          min-height: 1.75rem;
          padding-left: 2rem;
          background-image: url('/hemilin-studio.png?v=20260828-2');
          background-repeat: no-repeat;
          background-position: left center;
          background-size: 1.75rem 1.75rem;
          font-weight: 600;
          color: rgb(var(--text-main));
          white-space: nowrap;
        }
      `}</style>
      <div className="bg-canvas px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <UniversityTrustBanner />
        </div>
      </div>
    </>
  )
}
