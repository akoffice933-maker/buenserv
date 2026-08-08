export default function LocaleLoading() {
  return <main aria-busy="true" aria-live="polite" className="mx-auto min-h-screen max-w-7xl px-5 py-18"><div className="h-3 w-32 animate-pulse rounded bg-bs-mint"/><div className="mt-5 h-14 max-w-2xl animate-pulse rounded bg-black/7"/><div className="mt-5 h-5 max-w-xl animate-pulse rounded bg-black/7"/><div className="mt-12 grid gap-4 md:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-52 animate-pulse rounded-2xl border border-black/7 bg-white"/>)}</div></main>;
}
