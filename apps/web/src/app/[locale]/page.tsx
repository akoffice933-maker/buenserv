import Image from 'next/image';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {MotionReveal} from '@/components/motion-reveal';
import {getTelegramDeepLink} from '@/lib/telegram/deep-link';
import {localizedMetadata} from '@/lib/seo';
import {CATEGORY_META, CATEGORY_SLUGS} from '@/lib/categories';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'home'});
  return localizedMetadata(locale, '', t('title'), t('description'));
}

const TRUST_ICONS = ['✓', '📍', '💬', '🔒'] as const;

export default async function HomePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations('home');
  const tCat = await getTranslations('categories');
  const tHow = await getTranslations('how');
  const tProviders = await getTranslations('providers');
  const categories = tCat.raw('items') as Record<(typeof CATEGORY_SLUGS)[number], string>;
  const steps = tHow.raw('steps') as string[];
  const telegram = getTelegramDeepLink();

  const trustLabels =
    locale === 'ru'
      ? ['Проверенные профили', 'Barrios BA', 'Чат в Telegram', 'Без escrow']
      : locale === 'en'
        ? ['Verified profiles', 'BA neighborhoods', 'Chat in Telegram', 'No escrow']
        : ['Perfiles con contexto', 'Barrios de BA', 'Chat en Telegram', 'Sin custodia'];

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="bs-hero-mesh">
        {/* Hero */}
        <section className="mx-auto grid min-h-[calc(100vh-68px)] max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:py-24">
          <MotionReveal>
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-bs-primary uppercase">
              {t('eyebrow')}
            </span>
            <h1 className="font-display mt-4 max-w-4xl text-5xl leading-[0.94] font-extrabold tracking-[-0.065em] text-bs-ink sm:text-7xl">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-bs-muted">{t('description')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={telegram}
                className="bs-cta-glow inline-flex items-center gap-2 rounded-lg bg-bs-primary px-5 py-3.5 text-sm font-extrabold text-white no-underline hover:bg-bs-primary-dark"
              >
                {t('telegram')}
              </a>
              <Link
                href={`/${locale}/how-it-works`}
                className="inline-flex rounded-lg border border-black/10 bg-white px-5 py-3.5 text-sm font-extrabold text-bs-ink no-underline transition hover:-translate-y-0.5 hover:border-bs-primary/30"
              >
                {tHow('title').split('.')[0]}
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-bs-muted">
              <span className="inline-flex -space-x-1.5" aria-hidden>
                <i className="block size-6 rounded-full border-2 border-bs-canvas bg-gradient-to-br from-amber-200 to-stone-600" />
                <i className="block size-6 rounded-full border-2 border-bs-canvas bg-gradient-to-br from-stone-400 to-stone-800" />
                <i className="block size-6 rounded-full border-2 border-bs-canvas bg-gradient-to-br from-orange-100 to-amber-700" />
              </span>
              Buenos Aires · ES / RU / EN
            </p>
          </MotionReveal>

          <MotionReveal delay={80} className="relative">
            <div className="relative min-h-80 overflow-hidden rounded-[28px] shadow-[0_20px_48px_rgba(23,53,42,0.16)] lg:min-h-[420px]">
              <Image
                src="/assets/buenserv-hero.webp"
                alt={t('heroAlt')}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            </div>
            {/* Floating mini-app peek */}
            <div className="absolute -bottom-3 right-4 w-[200px] rounded-t-2xl border-6 border-b-0 border-[#29332e] bg-[#18211d] p-3.5 text-white shadow-[0_16px_30px_rgba(0,0,0,0.35)] sm:right-8 sm:w-[220px]">
              <p className="mb-3 text-[10px] tracking-wide text-[#a8c6bb]">BuenServ · Telegram</p>
              <div className="mb-2 rounded-lg rounded-bl-sm bg-[#2a3a33] p-2.5 text-[11px] leading-snug">
                {locale === 'ru'
                  ? 'Найди проверенного мастера рядом — в пару тапов.'
                  : locale === 'en'
                    ? 'Find a trusted local pro — in a couple of taps.'
                    : 'Encontrá un profesional de confianza cerca — en dos toques.'}
              </div>
              <div className="rounded-md bg-bs-primary py-2 text-center text-[10px] font-bold">
                {t('telegram').replace(' ↗', '')}
              </div>
            </div>
          </MotionReveal>
        </section>

        {/* Trust strip */}
        <section className="border-y border-black/8 bg-white">
          <div className="mx-auto grid max-w-7xl sm:grid-cols-2 lg:grid-cols-4">
            {trustLabels.map((label, i) => (
              <MotionReveal
                key={label}
                delay={i * 40}
                className="bs-trust-item flex items-center gap-3 border-black/8 px-5 py-5 sm:border-r sm:last:border-r-0 lg:px-6"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-bs-mint text-sm font-bold text-bs-primary">
                  {TRUST_ICONS[i]}
                </span>
                <span className="text-sm font-bold text-bs-ink">{label}</span>
              </MotionReveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <MotionReveal className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-bs-primary uppercase">
                {tHow('eyebrow')}
              </span>
              <h2 className="font-display mt-2 text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
                {tHow('title')}
              </h2>
            </div>
            <p className="max-w-md text-bs-muted">{tHow('description')}</p>
          </MotionReveal>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <MotionReveal
                key={step}
                delay={i * 70}
                as="article"
                className="bs-lift rounded-2xl border border-black/8 bg-white p-6"
              >
                <span className="text-xs font-extrabold tracking-wide text-bs-secondary">
                  0{i + 1}
                </span>
                <div className="bs-step-orb mt-5 mb-4 grid size-11 place-items-center rounded-xl bg-bs-soft-green text-lg text-bs-primary">
                  {i === 0 ? '⌕' : i === 1 ? '✉' : '✓'}
                </div>
                <h3 className="font-display text-xl font-extrabold tracking-tight">{step}</h3>
              </MotionReveal>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="bg-[#f0f5f1] py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <MotionReveal className="mb-8">
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-bs-primary uppercase">
                {tCat('eyebrow')}
              </span>
              <h2 className="font-display mt-2 text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
                {tCat('title')}
              </h2>
              <p className="mt-2 max-w-lg text-bs-muted">{tCat('description')}</p>
            </MotionReveal>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORY_SLUGS.map((slug, i) => (
                <MotionReveal key={slug} delay={i * 45}>
                  <Link
                    href={`/${locale}/categories/${slug}`}
                    className="bs-lift group flex items-center gap-3 rounded-2xl border border-black/8 bg-white p-3 no-underline"
                  >
                    <Image
                      src={`/assets/${CATEGORY_META[slug].image}`}
                      alt=""
                      width={72}
                      height={56}
                      className="h-14 w-[72px] rounded-xl object-cover"
                    />
                    <span className="font-display text-lg font-extrabold group-hover:text-bs-primary">
                      {categories[slug]}
                    </span>
                  </Link>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Providers CTA */}
        <section className="bg-bs-ink py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:px-8">
            <MotionReveal>
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-[#83dbc0] uppercase">
                {tProviders('eyebrow')}
              </span>
              <h2 className="font-display mt-3 max-w-xl text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
                {tProviders('title')}
              </h2>
              <p className="mt-4 max-w-lg text-lg text-[#c0cac5]">{tProviders('description')}</p>
              <a
                href={telegram}
                className="bs-cta-glow mt-8 inline-flex rounded-lg bg-bs-primary px-5 py-3.5 text-sm font-extrabold text-white no-underline hover:bg-bs-primary-dark"
              >
                {tProviders('cta')}
              </a>
            </MotionReveal>
            <MotionReveal delay={90} className="rounded-2xl border border-[#405249] bg-[#25332d]/90 p-6 backdrop-blur">
              <ul className="space-y-4 text-sm text-[#e7eee9]">
                {(
                  locale === 'ru'
                    ? ['Профиль в каталоге BA', 'Заявки в Telegram', 'Ты решаешь цену и условия']
                    : locale === 'en'
                      ? ['Profile in the BA directory', 'Leads in Telegram', 'You set price and terms']
                      : ['Perfil en el directorio de BA', 'Consultas por Telegram', 'Vos definís precio y condiciones']
                ).map(item => (
                  <li key={item} className="flex gap-3">
                    <span className="text-[#92e0c7]">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </MotionReveal>
          </div>
        </section>

        {/* Final CTA band */}
        <section className="px-5 py-16 lg:px-8">
          <MotionReveal className="bs-final-band mx-auto max-w-7xl rounded-[26px] px-8 py-14 lg:px-16">
            <h2 className="font-display relative z-10 max-w-2xl text-3xl font-extrabold tracking-[-0.05em] text-bs-ink sm:text-4xl">
              {t('title')}
            </h2>
            <p className="relative z-10 mt-4 max-w-lg text-lg text-[#53635b]">{t('description')}</p>
            <a
              href={telegram}
              className="bs-cta-glow relative z-10 mt-8 inline-flex rounded-lg bg-bs-primary px-5 py-3.5 text-sm font-extrabold text-white no-underline hover:bg-bs-primary-dark"
            >
              {t('telegram')}
            </a>
          </MotionReveal>
        </section>
      </main>
    </>
  );
}
