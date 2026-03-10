"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || undefined },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">¡Cuenta creada!</h2>
          <p className="text-slate-300 mb-2">
            Revisa tu email para confirmar la cuenta. Al registrarte recibiste{" "}
            <strong>1000 puntos</strong> para jugar.
          </p>
          <Link
            href="/auth/login"
            className="inline-block rounded-xl bg-emerald-600 px-6 py-2 font-semibold hover:bg-emerald-500"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-bold mb-2">🐎 Crear cuenta</h1>
        <p className="text-slate-400 text-sm mb-6">
          Al registrarte recibirás <strong>1000 puntos</strong> para apostar
        </p>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Nombre (opcional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3"
              placeholder="Tu nombre en el juego"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Creando cuenta…" : "Registrarme"}
          </button>
        </form>
        <p className="mt-4 text-center text-slate-400 text-sm">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="text-emerald-400 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
