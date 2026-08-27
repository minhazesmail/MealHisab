const universities = [
  {
    name: 'North South University',
    shortName: 'NSU',
    logo: 'https://image.pngaaa.com/679/7881679-middle.png',
    knockOutWhite: true,
  },
  {
    name: 'BRAC University',
    shortName: 'BRACU',
    logo: 'https://www.bracu.ac.bd/sites/default/files/resources/media/bracu_logo.png',
    knockOutWhite: false,
  },
  {
    name: 'American International University-Bangladesh',
    shortName: 'AIUB',
    logo: 'https://vectorseek.com/wp-content/uploads/2023/08/Aiub-Logo-Vector.svg-.png',
    knockOutWhite: false,
  },
  {
    name: 'Independent University, Bangladesh',
    shortName: 'IUB',
    logo: 'https://images.seeklogo.com/logo-png/61/1/independent-university-bangladesh-iub-logo-png_seeklogo-619669.png',
    knockOutWhite: true,
  },
  {
    name: 'United International University',
    shortName: 'UIU',
    logo: 'https://bitm.org.bd/storage/collaborator/vfeSmq8C64ZLUVOmzUhq6HJUiunqQt2Uqgk2WYBh.png',
    knockOutWhite: false,
  },
  {
    name: 'Daffodil International University',
    shortName: 'DIU',
    logo: 'https://icon2.cleanpng.com/20180505/bvw/avstwg208.webp',
    knockOutWhite: true,
  },
  {
    name: 'University of Dhaka',
    shortName: 'DU',
    logo: 'https://w7.pngwing.com/pngs/520/105/png-transparent-dhaka-university-library-institute-of-information-technology-university-of-dhaka-institute-of-business-administration-university-of-dhaka-curzon-hall-alumni-association-emblem-people-logo.png',
    knockOutWhite: true,
  },
  {
    name: 'University of Chittagong',
    shortName: 'CU',
    logo: 'https://cu.ac.bd/wp-content/uploads/2024/03/university-of-chittagong-seeklogo.com-removebg-preview-removebg-preview-1.png',
    knockOutWhite: false,
  },
  {
    name: 'Green University of Bangladesh',
    shortName: 'GUB',
    logo: 'https://images.seeklogo.com/logo-png/65/1/green-university-of-bangladesh-logo-png_seeklogo-653144.png',
    knockOutWhite: true,
  },
  {
    name: 'East West University',
    shortName: 'EWU',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/16/East-west-university-LogoSVG.svg',
    knockOutWhite: false,
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
                referrerPolicy="no-referrer"
                className={`h-16 w-full object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 ${university.knockOutWhite ? 'mix-blend-multiply dark:mix-blend-normal' : ''}`}
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
