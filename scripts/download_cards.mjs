import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

const suits = [
  { suitKey: "oros", commonsSuffix: "oros" },
  { suitKey: "copas", commonsSuffix: "copas" },
  { suitKey: "espadas", commonsSuffix: "espadas" },
  { suitKey: "bastos", commonsSuffix: "bastos" },
];

const ranks = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

function commonsFilename(rank, commonsSuffix) {
  if (rank === 1) return `A${commonsSuffix}.png`;   // As
  if (rank === 10) return `S${commonsSuffix}.png`;  // Sota
  if (rank === 11) return `C${commonsSuffix}.png`;  // Caballo
  if (rank === 12) return `R${commonsSuffix}.png`;  // Rey
  return `${rank}${commonsSuffix}.png`;             // 2..7
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, { tries = 8, baseDelayMs = 800 } = {}) {
  let lastErr = null;

  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url);

      if (res.status === 429) {
        // Backoff exponencial + jitter
        const jitter = Math.floor(Math.random() * 250);
        const wait = baseDelayMs * Math.pow(2, attempt - 1) + jitter;

        console.log(`⏳ 429 rate limit. Reintento ${attempt}/${tries} en ${wait} ms`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return res;
    } catch (e) {
      lastErr = e;
      const jitter = Math.floor(Math.random() * 250);
      const wait = baseDelayMs * Math.pow(2, attempt - 1) + jitter;

      console.log(`⏳ Error (${e.message}). Reintento ${attempt}/${tries} en ${wait} ms`);
      await sleep(wait);
    }
  }

  throw lastErr ?? new Error("fetch failed");
}

async function getCommonsFileUrl(filename) {
  const api = new URL(COMMONS_API);
  api.searchParams.set("action", "query");
  api.searchParams.set("format", "json");
  api.searchParams.set("prop", "imageinfo");
  api.searchParams.set("iiprop", "url");
  api.searchParams.set("titles", "File:" + filename);
  api.searchParams.set("origin", "*");

  const res = await fetchWithRetry(api.toString());
  const data = await res.json();

  const pages = data?.query?.pages;
  const firstKey = Object.keys(pages)[0];
  const page = pages[firstKey];

  const fileUrl = page?.imageinfo?.[0]?.url;
  if (!fileUrl) throw new Error("No image URL (file missing or no imageinfo)");
  return fileUrl;
}

async function downloadTo(fileUrl, outPath) {
  const res = await fetchWithRetry(fileUrl, { tries: 8, baseDelayMs: 800 });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "cards");
  await mkdir(outDir, { recursive: true });

  console.log("📁 Guardando en:", outDir);
  console.log("🐢 Modo seguro: 1 descarga a la vez + pausas cortas para evitar 429\n");

  let ok = 0;
  let fail = 0;

  // Pausa corta fija entre archivos (ayuda mucho)
  const politeDelayMs = 350;

  for (const { suitKey, commonsSuffix } of suits) {
    for (const rank of ranks) {
      const commonsFile = commonsFilename(rank, commonsSuffix);
      const outName = `${suitKey}_${rank}.png`;
      const outPath = path.join(outDir, outName);

      try {
        const fileUrl = await getCommonsFileUrl(commonsFile);
        await downloadTo(fileUrl, outPath);
        console.log("✅", outName, "<-", commonsFile);
        ok++;
      } catch (e) {
        console.log("❌", outName, "<-", commonsFile, "=>", e.message);
        fail++;
      }

      await sleep(politeDelayMs);
    }
  }

  // Reverso
  try {
    const backCommons = "Atras.png";
    const backUrl = await getCommonsFileUrl(backCommons);
    await downloadTo(backUrl, path.join(outDir, "back.png"));
    console.log("✅ back.png <-", backCommons);
  } catch (e) {
    console.log("❌ No se pudo bajar back.png:", e.message);
  }

  console.log(`\n✅ Listo. OK=${ok}, FAIL=${fail}`);
  console.log("Si aún sale 429, vuelve a ejecutar el script: continuará y completará lo que falte.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});