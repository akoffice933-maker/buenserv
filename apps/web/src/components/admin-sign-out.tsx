import {signOutAdmin} from '@/app/admin/actions';

export function AdminSignOut() {
  return <form action={signOutAdmin} className="fixed right-5 top-5 z-50"><button className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-bs-ink shadow-sm">Salir</button></form>;
}
