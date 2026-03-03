"use client";

import React, { useMemo, useState } from "react";

type Suit = "Oros" | "Copas" | "Espadas" | "Bastos";
type Card = { suit: Suit; rank: number };

const SUITS: Suit[] = ["Oros", "Copas", "Espadas", "Bastos"];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type TrackSlot = { card: Card; revealed: boolean };

function cardPath(card: Card) {
  // Ej: /cards/oros_1.png
  const suit = card.suit.toLowerCase();
  return `/cards/${suit}_${card.rank}.png`;
}

function horseCardPath(suit: Suit) {
  // Caballo = 11
  const s = suit.toLowerCase();
  return `/cards/${s}_11.png`;
}

export default function Page() {
  const [playersCount, setPlayersCount] = useState<2 | 3 | 4>(2);
  const [playerNames, setPlayerNames] = useState<string[]>(["", "", "", ""]);

  const [players, setPlayers] = useState<string[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);

  const [deck, setDeck] = useState<Card[]>([]);
  const [discard, setDiscard] = useState<Card[]>([]);
  const [track, setTrack] = useState<TrackSlot[]>([]);

  const [horses, setHorses] = useState<Record<Suit, number>>({
    Oros: 0,
    Copas: 0,
    Espadas: 0,
    Bastos: 0,
  });

  const [log, setLog] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState("");

  const started = useMemo(() => players.length > 0, [players.length]);

  function addLog(text: string) {
    setLog((prev) => [text, ...prev].slice(0, 200));
  }

  function newGame() {
    const raw = Array.from({ length: playersCount }, (_, i) =>
      playerNames[i].trim() !== "" ? playerNames[i].trim() : `Jugador ${i + 1}`
    );

    const order = shuffle(raw);

    const full = shuffle(buildDeck());
    const newTrack: TrackSlot[] = full.slice(0, 7).map((card) => ({ card, revealed: false }));
    const rest = full.slice(7);

    setPlayers(order);
    setTurnIndex(0);

    setTrack(newTrack);
    setDeck(rest);
    setDiscard([]);

    setHorses({ Oros: 0, Copas: 0, Espadas: 0, Bastos: 0 });

    setLog([]);
    setGameOver(false);
    setWinner("");

    addLog(`🆕 Nueva partida — orden: ${order.join(" → ")}`);
  }

  function drawCard() {
    if (!started || gameOver) return;

    let d = [...deck];
    let disc = [...discard];

    if (d.length === 0) {
      if (disc.length === 0) {
        addLog("⚠️ No hay cartas para continuar.");
        return;
      }
      d = shuffle(disc);
      disc = [];
      addLog("🔁 Mazo vacío → se rebarajó el descarte.");
    }

    const card = d.pop();
    if (!card) return;
    disc.push(card);

    const player = players[turnIndex];
    addLog(`🎴 ${player} sacó ${card.rank} de ${card.suit}`);

    // Avanza caballo del palo
    const nextHorses = { ...horses };
    const before = nextHorses[card.suit];
    const after = Math.min(7, before + 1);
    nextHorses[card.suit] = after;
    addLog(`➡️ Caballo ${card.suit}: ${before} → ${after}`);

    // ¿Ganó?
    if (after === 7) {
      setDeck(d);
      setDiscard(disc);
      setHorses(nextHorses);

      setGameOver(true);
      setWinner(`${player} con el caballo de ${card.suit}`);
      addLog(`🏆 GANADOR: ${player} (caballo ${card.suit})`);
      return;
    }

    // Revelar cartas del recorrido cuando TODOS hayan pasado
    const positions = Object.values(nextHorses);
    const minPos = Math.min(...positions);

    const nextTrack = track.map((t) => ({ ...t }));
    for (let i = 0; i < nextTrack.length; i++) {
      const trackPos = i + 1; // 1..7
      if (!nextTrack[i].revealed && minPos > trackPos) {
        nextTrack[i].revealed = true;

        const suit = nextTrack[i].card.suit;
        const b = nextHorses[suit];
        nextHorses[suit] = Math.max(0, b - 1);

        addLog(`📌 Se destapa carta #${trackPos}: ${nextTrack[i].card.rank} de ${suit}`);
        addLog(`↩️ Retrocede ${suit}: ${b} → ${nextHorses[suit]}`);
      }
    }

    setDeck(d);
    setDiscard(disc);
    setTrack(nextTrack);
    setHorses(nextHorses);
    setTurnIndex((turnIndex + 1) % players.length);
  }

  const currentPlayer = players[turnIndex] ?? "—";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">🐎 Juego de los Caballos</h1>

        {/* CONFIG */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={playersCount}
              onChange={(e) => setPlayersCount(Number(e.target.value) as 2 | 3 | 4)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2"
              disabled={started && !gameOver}
              title={started && !gameOver ? "Crea una nueva partida para cambiar jugadores" : ""}
            >
              <option value={2}>2 jugadores</option>
              <option value={3}>3 jugadores</option>
              <option value={4}>4 jugadores</option>
            </select>

            <button
              onClick={newGame}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500 active:bg-blue-700"
            >
              🆕 Nueva partida
            </button>

            <button
              onClick={drawCard}
              disabled={!started || gameOver}
              className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50"
            >
              🎴 Sacar carta
            </button>

            <div className="ml-auto text-sm text-slate-200">
              Turno: <span className="font-bold">{currentPlayer}</span> · Mazo: {deck.length} · Descarte:{" "}
              {discard.length}
            </div>
          </div>

          {/* Inputs nombres */}
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {Array.from({ length: playersCount }, (_, i) => (
              <input
                key={i}
                value={playerNames[i]}
                onChange={(e) => {
                  const copy = [...playerNames];
                  copy[i] = e.target.value;
                  setPlayerNames(copy);
                }}
                placeholder={`Nombre jugador ${i + 1}`}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2"
                disabled={started && !gameOver}
              />
            ))}
          </div>

          {gameOver && (
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="text-emerald-200 text-sm">🏆 Ganador</div>
              <div className="text-xl font-bold">{winner}</div>
            </div>
          )}
        </section>

        {/* RECORRIDO (cartas verticales que se voltean) */}
        <section>
          <h2 className="text-lg font-bold mb-3">🧱 Recorrido (7 cartas)</h2>

          {track.length === 0 ? (
            <div className="text-slate-400">Pulsa “Nueva partida” para crear el recorrido.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              {track.map((slot, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-300 mb-2">Carta #{index + 1}</div>

                  <div className="aspect-[208/320] w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    <img
                      src={slot.revealed ? cardPath(slot.card) : "/cards/back.png"}
                      alt={slot.revealed ? `${slot.card.rank} de ${slot.card.suit}` : "Reverso"}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PISTA CABALLOS (carta 11 avanzando) */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold mb-3">🏁 Caballos avanzando (0..7)</h2>

          {/* Encabezado */}
          <div className="grid grid-cols-8 gap-2 text-xs text-slate-300 mb-3">
            <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-center">Salida</div>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-2 text-center">
                {i + 1}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {SUITS.map((suit) => (
              <div key={suit} className="grid grid-cols-8 gap-2">
                {Array.from({ length: 8 }, (_, pos) => (
                  <div
                    key={pos}
                    className="relative rounded-xl border border-white/10 bg-black/20 p-2 min-h-[92px] flex items-center justify-center overflow-hidden"
                  >
                    {horses[suit] === pos ? (
                      <img
                        src={horseCardPath(suit)}
                        alt={`Caballo de ${suit}`}
                        className="h-full max-h-[86px] object-contain drop-shadow"
                      />
                    ) : null}

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

        {/* HISTORIAL */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold mb-3">📜 Historial</h2>
          <div className="max-h-64 overflow-y-auto space-y-1 text-sm text-slate-200">
            {log.length === 0 ? (
              <div className="text-slate-400">Aquí aparecerán los eventos…</div>
            ) : (
              log.map((line, idx) => <div key={idx}>• {line}</div>)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}