import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, points")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || profile?.email || user.email || "Jugador";
  const points = profile?.points ?? 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold">🐎 Juego de los Caballos</h1>
        <p className="text-slate-400">Bienvenido, {displayName}</p>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <div className="text-3xl font-bold text-amber-400">{points}</div>
          <div className="text-sm text-slate-300">puntos disponibles</div>
        </div>

        {points < 100 && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-200 text-sm">
              Te quedan pocos puntos. Puedes comprar 1000 puntos para seguir jugando.
            </p>
          </div>
        )}

        <div className="grid gap-4">
          <Link
            href="/lobby"
            className="block rounded-2xl border border-white/10 bg-emerald-600/20 hover:bg-emerald-600/40 p-6 font-semibold"
          >
            Crear sala o unirse (4 jugadores)
          </Link>
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-slate-400 hover:text-white text-sm"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
