# 🐎 Juego de los Caballos – Baraja Española

Aplicación web interactiva desarrollada con **Next.js** que implementa el juego tradicional de los Caballos con sistema de usuarios, puntos, apuestas y multijugador (4 jugadores simultáneos).

Desplegado en Vercel.

---

## 🌐 Enlace de la aplicación

🔗 https://juego-de-caballos.vercel.app

Repositorio:
🔗 https://github.com/estebanbonilla22/juego-de-caballos

---

## ✨ Características

- **Registro de usuarios**: Cada usuario se registra con email y contraseña.
- **1000 puntos iniciales**: Al registrarse, la plataforma asigna 1000 puntos.
- **Apuesta variable**: Cada jugador apuesta la cantidad de puntos que desee antes de iniciar.
- **Multiplicador x5**: Al ganar, los puntos apostados se multiplican por 5.
- **Compra de puntos**: Cuando se acaban los puntos, se puede comprar un paquete de 1000 puntos por $10.000.
- **4 jugadores simultáneos**: Conexión en tiempo real para partidas de 4 usuarios.

---

## 🎯 Reglas del juego

- Se colocan 7 cartas boca abajo formando un recorrido.
- Cada jugador, en su turno, saca una carta del mazo.
- Según el palo de la carta, avanza el caballo correspondiente.
- Cuando todos los caballos han pasado una posición del recorrido:
  - Se destapa la carta correspondiente.
  - El caballo del palo revelado retrocede una posición.
- El primer jugador que logre que un caballo llegue a la posición 7 gana y recibe su apuesta x5.

---

## 🛠 Tecnologías utilizadas

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase (Auth, Base de datos, Realtime)
- Vercel (deploy)

---

## ⚙️ Configuración e instalación

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/estebanbonilla22/juego-de-caballos.git
cd juego-de-caballos
```

### 2️⃣ Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto.
2. En **Settings > API**, copia la **Project URL** y la **anon key**.
3. Ejecuta el SQL de `supabase/migrations/001_initial.sql` en el **SQL Editor** de Supabase.
4. En **Authentication > URL Configuration**, agrega:
   - Site URL: `https://tu-dominio.vercel.app` (o `http://localhost:3000` para local)
   - Redirect URLs: `https://tu-dominio.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`
5. Opcional: En **Database > Replication**, habilita Realtime para las tablas `game_states` y `room_players` (o ejecuta el SQL al final de la migración).

### 3️⃣ Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

En Vercel, agrega estas mismas variables en **Settings > Environment Variables**.

### 4️⃣ Instalar dependencias y ejecutar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 5️⃣ Build y deploy

```bash
npm run build
```

En Vercel, conecta el repositorio y configura las variables de entorno. El deploy se hace automáticamente en cada push.

---

## 📁 Estructura del proyecto

- `app/` – Páginas y rutas (Next.js App Router)
- `app/actions/` – Server Actions (game logic, auth)
- `app/auth/` – Login, registro, callback
- `app/lobby/` – Crear/unirse a sala
- `app/room/[id]/` – Sala de juego multijugador
- `lib/supabase/` – Cliente Supabase (browser, server, middleware)
- `supabase/migrations/` – SQL para tablas y políticas

---

## 💳 Compra de puntos

La compra de 1000 puntos por $10.000 está preparada con un flujo simulado. Para producción con pagos reales, integra un gateway (Stripe, Mercado Pago, etc.) y llama a la verificación de pago antes de ejecutar la acción que suma los puntos.
