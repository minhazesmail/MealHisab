import type { Metadata } from 'next'
import LandingPage from '@/components/landing-page'

export const metadata: Metadata = {
  title: 'MealHisab BD — Simple meal accounting for shared flats',
  description:
    'Track meals, expenses, contributions and monthly settlements for Bangladeshi messes, shared flats and small households.',
}

export default function Home() {
  return <LandingPage />
}
