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
      <div className="bg-canvas px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <UniversityTrustBanner />
        </div>
      </div>
    </>
  )
}
