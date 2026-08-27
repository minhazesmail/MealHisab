const universities = [
  {
    name: 'North South University',
    shortName: 'NSU',
    logo: '/universities/nsu.png',
  },
  {
    name: 'BRAC University',
    shortName: 'BRACU',
    logo: 'https://www.bracu.ac.bd/sites/default/files/resources/media/bracu_logo.png',
  },
  {
    name: 'American International University-Bangladesh',
    shortName: 'AIUB',
    logo: 'https://vectorseek.com/wp-content/uploads/2023/08/Aiub-Logo-Vector.svg-.png',
  },
  {
    name: 'Independent University, Bangladesh',
    shortName: 'IUB',
    logo: '/universities/iub.png',
  },
  {
    name: 'United International University',
    shortName: 'UIU',
    logo: 'https://bitm.org.bd/storage/collaborator/vfeSmq8C64ZLUVOmzUhq6HJUiunqQt2Uqgk2WYBh.png',
  },
  {
    name: 'Daffodil International University',
    shortName: 'DIU',
    logo: '/universities/diu.png',
  },
  {
    name: 'University of Dhaka',
    shortName: 'DU',
    logo: '/universities/du-display.svg?v=1',
  },
  {
    name: 'University of Chittagong',
    shortName: 'CU',
    logo: '/universities/cu-display.svg?v=1',
  },
  {
    name: 'Green University of Bangladesh',
    shortName: 'GUB',
    logo: '/universities/gub.png',
  },
  {
    name: 'East West University',
    shortName: 'EWU',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/16/East-west-university-LogoSVG.svg',
  },
] as const

export default function UniversityTrustBanner() {
  return (
    <section aria-label="Universities our students come from" className="relative overflow-hidden border-y border-line py-10 sm:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-30%,_rgba(57,255,136,.10),_transparent_55%)]" />
      <div className="relative">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Proudly serving students from</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">From private universities to Bangladesh’s public university community, MealHisab helps students keep shared meals and expenses fair.</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {universities.map((university) => (
            <div key={university.shortName} className="group flex min-h-28 flex-col items-center justify-center bg-transparent px-2 py-2 text-center transition hover:-translate-y-0.5">
              <img
                src={university.logo}
                alt={university.name}
                title={university.name}
                loading="lazy"
                className="h-16 w-auto max-w-full object-contain opacity-100"
              />
              <p className="mt-3 text-[11px] font-semibold leading-4 text-muted transition group-hover:text-main">
                {university.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
