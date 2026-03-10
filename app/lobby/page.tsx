"use client";

import { createRoom, joinRoom, getProfile } from "@/app/actions/game";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LobbyPage() {
  const router = useRouter();
  useEffect(() => {
    getProfile().then((p) => {
      if (!p) router.replace("/auth/login");
    });
  }, [router]);
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    const { error: err, roomId, code } = await createRoom(maxPlayers);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.push(`/room/${roomId}?code=${code}`);
  }

  async function handleJoin() {
    if (!joinCode.trim()) {
      setError("Ingresa el código de la sala");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err, roomId } = await joinRoom(joinCode.trim().toUpperCase());
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.push(`/room/${roomId}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-md mx-auto">
        <a href="/" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
          ← Volver
        </a>
        <h1 className="text-2xl font-bold mb-6">🐎 Sala de juego</h1>

        {mode === "choose" && (
          <div className="space-y-4">
            <button
              onClick={() => setMode("create")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-6 text-left"
            >
              <div className="font-semibold">Crear sala</div>
              <div className="text-sm text-slate-400">Crea una partida y comparte el código</div>
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-6 text-left"
            >
              <div className="font-semibold">Unirse a sala</div>
              <div className="text-sm text-slate-400">Ingresa el código de 6 caracteres</div>
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Se creará una sala para hasta {maxPlayers} jugadores. Comparte el código con tus amigos.
            </p>
            <label className="block text-sm text-slate-300">
              Máximo de jugadores
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="mt-2 w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2"
              >
                <option value={2}>2 jugadores</option>
                <option value={3}>3 jugadores</option>
                <option value={4}>4 jugadores</option>
              </select>
            </label>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Creando…" : "Crear sala"}
            </button>
            <button
              onClick={() => setMode("choose")}
              className="w-full text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-4">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Código (ej: ABC123)"
              maxLength={6}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-center text-lg tracking-widest uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Uniendo…" : "Unirse"}
            </button>
            <button
              onClick={() => setMode("choose")}
              className="w-full text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
      </div>
    </main>
  );
}
