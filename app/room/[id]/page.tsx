"use client";

import {
  setBet,
  startGame,
  drawCard,
  getProfile,
  purchasePoints,
} from "@/app/actions/game";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Suit = "Oros" | "Copas" | "Espadas" | "Bastos";
type Card = { suit: Suit; rank: number };

const SUITS: Suit[] = ["Oros", "Copas", "Espadas", "Bastos"];

function cardPath(card: Card) {
  const suit = card.suit.toLowerCase();
  return `/cards/${suit}_${card.rank}.png`;
}

function horseCardPath(suit: Suit) {
  return `/cards/${suit.toLowerCase()}_11.png`;
}

type GameState = {
  phase: string;
  players: string[];
  track: { card: Card; revealed: boolean }[];
  deck: { suit: string; rank: number }[];
  discard: { suit: string; rank: number }[];
  horses: Record<string, number>;
  turnIndex: number;
  log: string[];
  gameOver: boolean;
  winner: string;
  winnerSuit?: string;
};

type RoomPlayer = {
  id: string;
  display_name: string;
  bet_amount: number;
  position: number;
};

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<{ code: string; status: string; host_id: string } | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [profile, setProfile] = useState<{ id?: string; points: number; display_name?: string } | null>(null);
  const [betInput, setBetInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPurchase, setShowPurchase] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createSupabaseClient();
    const { data: roomData } = await supabase
      .from("game_rooms")
      .select("code, status, host_id")
      .eq("id", roomId)
      .single();
    setRoom(roomData || null);

    const { data: playersData } = await supabase
      .from("room_players")
      .select("id, display_name, bet_amount, position")
      .eq("room_id", roomId)
      .order("position");
    setPlayers(playersData || []);

    const { data: gs } = await supabase.from("game_states").select("state").eq("room_id", roomId).single();
    setGameState(gs?.state as GameState || null);

    const p = await getProfile();
    setProfile(p ? { id: p.id, points: p.points, display_name: p.display_name } : null);
  }, [roomId]);

  useEffect(() => {
    getProfile().then((p) => {
      if (!p) router.replace("/auth/login");
    });
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createSupabaseClient();
    const sub = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_states", filter: `room_id=eq.${roomId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => refresh()
      )
      .subscribe();
    const interval = setInterval(refresh, 2000);
    return () => {
      sub.unsubscribe();
      clearInterval(interval);
    };
  }, [roomId, refresh]);

  const isHost = room?.host_id && profile?.id && room.host_id === profile.id;

  async function handleSetBet() {
    const amount = parseInt(betInput, 10);
    if (isNaN(amount) || amount < 1) {
      setError("Apuesta mínima: 1 punto");
      return;
    }
    setLoading(true);
    setError("");
    const result = await setBet(roomId, amount);
    setLoading(false);
    if (result.error) setError(result.error);
    else refresh();
  }

  async function handleStart() {
    setLoading(true);
    setError("");
    const result = await startGame(roomId);
    setLoading(false);
    if (result.error) setError(result.error);
    else refresh();
  }

  async function handleDraw() {
    setLoading(true);
    setError("");
    const result = await drawCard(roomId);
    setLoading(false);
    if (result.error) setError(result.error);
    else refresh();
  }

  async function handlePurchase() {
    setLoading(true);
    setError("");
    const result = await purchasePoints();
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setShowPurchase(false);
      refresh();
    }
  }

  const currentPlayer = gameState?.players?.[gameState.turnIndex ?? 0] ?? "";
  const myName = profile?.display_name || "";
  const isMyTurn = currentPlayer === myName;
  const allPlayersReady = players.length === 4 && players.every((p) => p.bet_amount > 0);
  const canStart = isHost && allPlayersReady;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <a href="/" className="text-slate-400 hover:text-white text-sm">← Volver</a>
          <div className="flex items-center gap-4">
            <span className="text-amber-400 font-bold">{profile?.points ?? 0} pts</span>
            {room && <span className="text-slate-400">Sala: {room.code}</span>}
          </div>
        </div>

        {profile && (profile.points ?? 0) < 100 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between">
            <p className="text-amber-200 text-sm">Te quedan pocos puntos</p>
            <button
              onClick={() => setShowPurchase(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold hover:bg-amber-500"
            >
              Comprar 1000 pts
            </button>
          </div>
        )}

        {showPurchase && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-2">Comprar puntos</h3>
              <p className="text-slate-400 text-sm mb-4">
                1000 puntos por $10.000
              </p>
              <p className="text-slate-500 text-xs mb-4">
                En desarrollo: esta compra simula la adición de puntos. En producción se conectaría a un gateway de pago.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPurchase(false)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-amber-600 px-4 py-2 font-semibold hover:bg-amber-500 disabled:opacity-50"
                >
                  {loading ? "..." : "Comprar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {gameState?.phase === "waiting" && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold mb-4">Jugadores ({players.length}/4)</h2>
            <div className="space-y-2 mb-6">
              {players.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5">
                  <span>{p.display_name}</span>
                  {p.bet_amount > 0 ? (
                    <span className="text-emerald-400">{p.bet_amount} pts apostados</span>
                  ) : p.display_name === myName ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={profile?.points ?? 0}
                        value={betInput}
                        onChange={(e) => setBetInput(e.target.value)}
                        placeholder="Apuesta"
                        className="w-24 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-sm"
                      />
                      <button
                        onClick={handleSetBet}
                        disabled={loading}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-sm"
                      >
                        Apostar
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-500">Esperando apuesta…</span>
                  )}
                </div>
              ))}
            </div>
            {room?.host_id && (
              <div className="mt-2">
                {isHost ? (
                  <>
                    {players.length < 4 ? (
                      <p className="text-slate-400 text-sm mb-2">
                        Esperando que se unan 4 jugadores ({players.length}/4).
                      </p>
                    ) : !allPlayersReady ? (
                      <p className="text-slate-400 text-sm mb-2">
                        Todos los jugadores deben apostar antes de iniciar.
                      </p>
                    ) : (
                      <p className="text-emerald-300 text-sm mb-2">
                        Todos listos. Puedes iniciar la partida.
                      </p>
                    )}
                    <button
                      onClick={handleStart}
                      disabled={!allPlayersReady || loading}
                      className="rounded-xl bg-emerald-600 px-6 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {loading ? "Cargando..." : "Iniciar partida"}
                    </button>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Esperando a que el anfitrión inicie la partida.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {gameState?.phase === "playing" && (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <span className="text-slate-300">Turno: <strong>{currentPlayer}</strong></span>
                {isMyTurn && (
                  <button
                    onClick={handleDraw}
                    disabled={loading}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
                  >
                    🎴 Sacar carta
                  </button>
                )}
              </div>
            </section>

            {gameState.gameOver && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <div className="text-emerald-200 text-sm">🏆 Ganador</div>
                <div className="text-xl font-bold">{gameState.winner}</div>
                <div className="text-sm text-slate-400">El ganador recibe su apuesta x5</div>
              </div>
            )}

            <section>
              <h2 className="text-lg font-bold mb-3">🧱 Recorrido</h2>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                {(gameState.track || []).map((slot, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="aspect-[208/320] w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <img
                        src={slot.revealed ? cardPath(slot.card as Card) : "/cards/back.png"}
                        alt={slot.revealed ? `${slot.card.rank} de ${slot.card.suit}` : "Reverso"}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-bold mb-3">🏁 Caballos</h2>
              <div className="space-y-3">
                {SUITS.map((suit) => (
                  <div key={suit} className="grid grid-cols-8 gap-2">
                    {Array.from({ length: 8 }, (_, pos) => (
                      <div
                        key={pos}
                        className="relative rounded-xl border border-white/10 bg-black/20 p-2 min-h-[92px] flex items-center justify-center overflow-hidden"
                      >
                        {gameState.horses?.[suit] === pos && (
                          <img
                            src={horseCardPath(suit)}
                            alt={`Caballo ${suit}`}
                            className="h-full max-h-[86px] object-contain"
                          />
                        )}
                        {pos === 0 && (
                          <div className="absolute left-2 top-2 text-[11px] text-slate-300 font-semibold">
                            ♞ {suit}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-bold mb-3">📜 Historial</h2>
              <div className="max-h-48 overflow-y-auto space-y-1 text-sm text-slate-200">
                {(gameState.log || []).map((line, idx) => (
                  <div key={idx}>• {line}</div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
