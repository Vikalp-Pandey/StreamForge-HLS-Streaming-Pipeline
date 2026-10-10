import { Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useLogout, useUser } from '@/hooks/useAuth';

export default function AccountPage() {
  const { data, isLoading, isError } = useUser();
  const logout = useLogout();
  const user = data?.data;

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050505] text-sky-500">
        <Loader2 className="animate-spin" aria-label="Checking session" />
      </main>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#050505] p-6 text-slate-200">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs tracking-[0.25em] text-emerald-400 uppercase">
              Authenticated
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Account session
            </h1>
          </div>
        </div>

        <dl className="space-y-4 rounded-xl border border-white/5 bg-black/20 p-5">
          <div>
            <dt className="text-[10px] tracking-widest text-slate-600 uppercase">
              Name
            </dt>
            <dd className="mt-1 text-sm text-slate-200">{user.name}</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-widest text-slate-600 uppercase">
              Email
            </dt>
            <dd className="mt-1 text-sm text-slate-200">{user.email}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-500/10 text-xs font-bold tracking-widest text-rose-400 uppercase transition hover:bg-rose-500/20 disabled:opacity-50"
        >
          {logout.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}
          Sign out
        </button>
      </section>
    </main>
  );
}
