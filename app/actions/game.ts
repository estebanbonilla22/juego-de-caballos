"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const INITIAL_POINTS = 1000;
const WIN_MULTIPLIER = 5;
const PURCHASE_POINTS = 1000;
const PURCHASE_PRICE = 10000; // 10.000 - puede ser COP o la moneda que uses

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email, points")
    .eq("id", user.id)
    .single();
  return data;
}

export async function purchasePoints(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .single();

  if (!profile) return { success: false, error: "Perfil no encontrado" };

  // TODO: Aquí iría la verificación de pago real (Stripe, Mercado Pago, etc.)
  // Por ahora simulamos la compra. En producción: verificar webhook de pago antes de ejecutar.
  const { error } = await supabase
    .from("profiles")
    .update({
      points: profile.points + PURCHASE_POINTS,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function createRoom() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", roomId: null, code: null };

  const profile = await getProfile();
  const displayName = profile?.display_name || profile?.email || "Jugador";

  let code = generateCode();
  let exists = true;
  while (exists) {
    const { data } = await supabase.from("game_rooms").select("id").eq("code", code).single();
    exists = !!data;
    if (exists) code = generateCode();
  }

  const { data: room, error: roomErr } = await supabase
    .from("game_rooms")
    .insert({ code, host_id: user.id })
    .select("id")
    .single();

  if (roomErr || !room) return { error: roomErr?.message || "Error", roomId: null, code: null };

  const { error: playerErr } = await supabase.from("room_players").insert({
    room_id: room.id,
    user_id: user.id,
    display_name: displayName,
    bet_amount: 0,
    position: 0,
  });

  if (playerErr) {
    await supabase.from("game_rooms").delete().eq("id", room.id);
    return { error: playerErr.message, roomId: null, code: null };
  }

  await supabase.from("game_states").insert({
    room_id: room.id,
    state: { phase: "waiting", players: [], track: [], horses: {}, deck: [], discard: [] },
  });

  revalidatePath("/");
  return { error: null, roomId: room.id, code };
}

export async function joinRoom(code: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", roomId: null };

  const profile = await getProfile();
  const displayName = profile?.display_name || profile?.email || "Jugador";

  const { data: room } = await supabase
    .from("game_rooms")
    .select("id, status")
    .eq("code", code.toUpperCase())
    .single();

  if (!room) return { error: "Sala no encontrada", roomId: null };
  if (room.status !== "waiting") return { error: "La partida ya empezó", roomId: null };

  const { count } = await supabase
    .from("room_players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) >= 4) return { error: "La sala está llena", roomId: null };

  const { data: existing } = await supabase
    .from("room_players")
    .select("id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .single();

  if (existing) return { error: null, roomId: room.id };

  const { error } = await supabase.from("room_players").insert({
    room_id: room.id,
    user_id: user.id,
    display_name: displayName,
    bet_amount: 0,
    position: count ?? 0,
  });

  if (error) return { error: error.message, roomId: null };
  revalidatePath("/");
  return { error: null, roomId: room.id };
}

export async function setBet(roomId: string, amount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .single();

  if (!profile || profile.points < amount) return { error: "Puntos insuficientes" };
  if (amount < 1) return { error: "Apuesta mínima: 1 punto" };

  const { error } = await supabase
    .from("room_players")
    .update({ bet_amount: amount })
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
}

export async function startGame(roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: room } = await supabase
    .from("game_rooms")
    .select("host_id, status")
    .eq("id", roomId)
    .single();

  if (!room || room.host_id !== user.id) return { error: "No eres el anfitrión" };
  if (room.status !== "waiting") return { error: "La partida ya empezó" };

  const { data: players } = await supabase
    .from("room_players")
    .select("user_id, display_name, bet_amount")
    .eq("room_id", roomId)
    .order("position");

  if (!players || players.length < 2) return { error: "Se necesitan al menos 2 jugadores" };

  // Verificar que todos tienen suficientes puntos y han apostado
  for (const p of players) {
    if (!p.bet_amount || p.bet_amount < 1) return { error: "Todos deben apostar" };
    const { data: prof } = await supabase.from("profiles").select("points").eq("id", p.user_id).single();
    if (!prof || prof.points < p.bet_amount) return { error: `${p.display_name} no tiene suficientes puntos` };
  }

  // Descontar apuestas de cada jugador
  for (const p of players) {
    const { data: prof } = await supabase.from("profiles").select("points").eq("id", p.user_id).single();
    if (prof) {
      await supabase.from("profiles").update({ points: prof.points - p.bet_amount }).eq("id", p.user_id);
    }
  }

  const SUITS = ["Oros", "Copas", "Espadas", "Bastos"] as const;
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  const deck: { suit: string; rank: number }[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const track = deck.splice(0, 7).map((c) => ({ card: c, revealed: false }));
  const order = [...players].sort(() => Math.random() - 0.5).map((x) => x.display_name);

  const state = {
    phase: "playing",
    players: order,
    track,
    deck,
    discard: [] as { suit: string; rank: number }[],
    horses: { Oros: 0, Copas: 0, Espadas: 0, Bastos: 0 } as Record<string, number>,
    turnIndex: 0,
    log: [] as string[],
    gameOver: false,
    winner: "",
    winnerSuit: "" as string,
  };

  await supabase.from("game_rooms").update({ status: "playing" }).eq("id", roomId);
  await supabase.from("game_states").update({ state, updated_at: new Date().toISOString() }).eq("room_id", roomId);

  revalidatePath("/");
  return { error: null };
}

export async function drawCard(roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: gs } = await supabase.from("game_states").select("state").eq("room_id", roomId).single();
  if (!gs) return { error: "Sala no encontrada" };

  const state = gs.state as {
    phase: string;
    players: string[];
    track: { card: { suit: string; rank: number }; revealed: boolean }[];
    deck: { suit: string; rank: number }[];
    discard: { suit: string; rank: number }[];
    horses: Record<string, number>;
    turnIndex: number;
    log: string[];
    gameOver: boolean;
    winner: string;
    winnerSuit: string;
  };

  if (state.phase !== "playing" || state.gameOver) return { error: "Partida no activa" };

  const currentPlayer = state.players[state.turnIndex];
  const { data: rp } = await supabase
    .from("room_players")
    .select("display_name, user_id")
    .eq("room_id", roomId)
    .single();

  const profile = await getProfile();
  const myName = profile?.display_name || profile?.email || "Jugador";
  if (currentPlayer !== myName) return { error: "No es tu turno" };

  let deck = [...state.deck];
  let discard = [...state.discard];

  if (deck.length === 0) {
    if (discard.length === 0) return { error: "No hay cartas" };
    deck = discard.sort(() => Math.random() - 0.5);
    discard = [];
    state.log.push("🔁 Mazo rebarajado");
  }

  const card = deck.pop()!;
  discard.push(card);
  state.log.push(`🎴 ${currentPlayer} sacó ${card.rank} de ${card.suit}`);

  const horses = { ...state.horses };
  const before = horses[card.suit];
  const after = Math.min(7, before + 1);
  horses[card.suit] = after;
  state.log.push(`➡️ Caballo ${card.suit}: ${before} → ${after}`);

  if (after === 7) {
    state.gameOver = true;
    state.winner = `${currentPlayer} con el caballo de ${card.suit}`;
    state.winnerSuit = card.suit;
    state.log.push(`🏆 GANADOR: ${currentPlayer} (caballo ${card.suit})`);

    const winnerIdx = state.players.indexOf(currentPlayer);
    const { data: allPlayers } = await supabase
      .from("room_players")
      .select("user_id, display_name, bet_amount")
      .eq("room_id", roomId);
    const winnerPlayer = allPlayers?.find((p) => p.display_name === currentPlayer);
    if (winnerPlayer) {
      const winAmount = winnerPlayer.bet_amount * WIN_MULTIPLIER;
      const { data: prof } = await supabase.from("profiles").select("points").eq("id", winnerPlayer.user_id).single();
      if (prof) {
        await supabase.from("profiles").update({ points: prof.points + winAmount }).eq("id", winnerPlayer.user_id);
      }
      state.log.push(`💰 ${currentPlayer} gana ${winAmount} puntos (apuesta x5)`);
    }

    await supabase.from("game_rooms").update({ status: "finished" }).eq("id", roomId);
  } else {
    const minPos = Math.min(...Object.values(horses));
    const track = state.track.map((t) => ({ ...t }));
    for (let i = 0; i < track.length; i++) {
      const trackPos = i + 1;
      if (!track[i].revealed && minPos > trackPos) {
        track[i].revealed = true;
        const suit = track[i].card.suit;
        const b = horses[suit];
        horses[suit] = Math.max(0, horses[suit] - 1);
        state.log.push(`📌 Carta #${trackPos} destapada: ${suit} retrocede`);
      }
    }
    state.track = track;
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
  }

  state.deck = deck;
  state.discard = discard;
  state.horses = horses;

  await supabase.from("game_states").update({ state, updated_at: new Date().toISOString() }).eq("room_id", roomId);
  revalidatePath("/");
  return { error: null };
}
