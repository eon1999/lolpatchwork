/**
 * Data Dragon build-time pipeline (SPEC §2.2).
 * Fetches the pinned patch's champion data and emits:
 *   src/data/champions.json  — Record<id, Champion>
 *   src/data/version.json    — { patch, generatedAt }
 * Never fetched at runtime. Re-run via `npm run champions`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const BASE = "https://ddragon.leagueoflegends.com";
const OUT_DIR = resolve(import.meta.dirname, "../src/data");
const CONCURRENCY = 8;

type DDragonImage = { full: string };
type DDragonSpell = {
  id: string;
  name: string;
  description: string;
  cooldownBurn: string;
  costBurn: string;
  rangeBurn: string;
  image: DDragonImage;
};
type DDragonChampion = {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  partype: string;
  image: DDragonImage;
  passive: { name: string; description: string; image: DDragonImage };
  spells: DDragonSpell[];
};
type ChampionSummary = { id: string; name: string; title: string; key: string };

const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Strip tags except <br>→\n, decode entities, collapse whitespace, trim. */
export function sanitize(text: string): string {
  let s = text;
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]*>/g, "");
  s = s.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
  s = s.replace(/&[a-z#0-9]+;/gi, (ent) => ENTITIES[ent.toLowerCase()] ?? ent);
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/ ?\n ?/g, "\n");
  return s.trim();
}

async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw new Error("unreachable");
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: size }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const override = process.env.DDRAGON_VERSION?.trim();
  let patch = override;
  if (!patch) {
    // versions.json intermittently serves a leading empty string — skip those.
    const versions = await fetchJson<string[]>(`${BASE}/api/versions.json`);
    patch = versions.find((v) => /^\d+\.\d+\.\d+$/.test(v));
    if (!patch) throw new Error(`No valid patch in versions.json: ${JSON.stringify(versions.slice(0, 5))}`);
  }
  console.log(`Data Dragon patch: ${patch}${override ? " (pinned via env)" : " (latest)"}`);

  const summary = await fetchJson<{ data: Record<string, ChampionSummary> }>(
    `${BASE}/cdn/${patch}/data/en_US/champion.json`,
  );
  const champs = Object.values(summary.data);
  console.log(`${champs.length} champions to fetch.`);

  const built = await pool(champs, CONCURRENCY, async (c) => {
    const detail = await fetchJson<{ data: Record<string, DDragonChampion> }>(
      `${BASE}/cdn/${patch}/data/en_US/champion/${c.id}.json`,
    );
    const d = detail.data[c.id];
    const [p, q, w, e, r] = [d.passive, d.spells[0], d.spells[1], d.spells[2], d.spells[3]];
    if (!p || !q || !w || !e || !r) throw new Error(`${d.id}: missing passive or spells`);
    return {
      id: d.id,
      key: d.key,
      name: d.name,
      title: d.title,
      tags: d.tags,
      square: `${BASE}/cdn/${patch}/img/champion/${d.image.full}`,
      loading: `${BASE}/cdn/img/champion/loading/${d.id}_0.jpg`,
      splash: `${BASE}/cdn/img/champion/splash/${d.id}_0.jpg`,
      abilities: {
        passive: {
          name: p.name,
          description: sanitize(p.description),
          icon: `${BASE}/cdn/${patch}/img/passive/${p.image.full}`,
        },
        q: spell(q),
        w: spell(w),
        e: spell(e),
        r: spell(r),
      },
    };

    function spell(s: DDragonSpell) {
      return {
        name: s.name,
        description: sanitize(s.description),
        icon: `${BASE}/cdn/${patch}/img/spell/${s.image.full}`,
        cooldown: s.cooldownBurn,
        cost: s.costBurn,
        range: s.rangeBurn,
      };
    }
  });

  for (const c of built) {
    for (const a of Object.values(c.abilities)) {
      if (a.description.includes("<") || a.description.includes("{{")) {
        throw new Error(`${c.id}/${a.name}: sanitized description still contains < or {{`);
      }
    }
  }

  const byId: Record<string, unknown> = {};
  built.sort((a, b) => a.name.localeCompare(b.name));
  for (const c of built) byId[c.id] = c;

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, "champions.json"), JSON.stringify(byId));
  await writeFile(
    resolve(OUT_DIR, "version.json"),
    JSON.stringify({ patch, generatedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`Wrote ${built.length} champions to src/data/champions.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
