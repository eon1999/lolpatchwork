/**
 * AC checks that need the live server + DB:
 *  - cron rollover idempotency (§2.10)
 *  - draft expiry → 410 (§2.5)
 *  - cursor pagination pages without duplicates
 *  - pairing never serves the viewer's own creations (§1.5)
 * Usage: tsx --env-file=.env scripts/verify-acs.ts [baseUrl]
 */
import postgres from "postgres";

const BASE = process.argv[2] ?? "http://localhost:3000";
const sqlClient = postgres(process.env.DATABASE_URL!, { max: 1 });

let cookie = "";
let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? ` (${extra})` : ""}`);
  if (!cond) failures++;
}

async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const pair = c.split(";")[0];
    if (pair.startsWith("uid=")) cookie = pair;
  }
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function main() {
  // --- AC §2.10: rollover twice → identical hall_of_fame, no duplicates
  const cronSecret = process.env.CRON_SECRET!;
  const r1 = await call("POST", "/api/cron/weekly-rollover", {}, { authorization: `Bearer ${cronSecret}` });
  check("rollover #1 ok", r1.json?.ok === true, JSON.stringify(r1.json?.data ?? r1.json?.error));
  const r2 = await call("POST", "/api/cron/weekly-rollover", {}, { authorization: `Bearer ${cronSecret}` });
  check("rollover #2 ok (idempotent)", r2.json?.ok === true, JSON.stringify(r2.json?.data ?? r2.json?.error));
  const dupes = await sqlClient`
    select week_key, rank, count(*) as n from hall_of_fame group by week_key, rank having count(*) > 1
  `;
  check("AC: no duplicate hall_of_fame rows", dupes.length === 0);

  // --- AC §2.5: expired draft → 410
  const start = await call("POST", "/api/draft");
  const draftId = start.json.data.draftId as string;
  await sqlClient`update drafts set expires_at = now() - interval '1 minute' where id = ${draftId}::uuid`;
  const expired = await call("POST", `/api/draft/${draftId}/reveal`);
  check("AC: expired draft reveal → 410", expired.status === 410, String(expired.status));
  const expiredPublish = await call("POST", `/api/draft/${draftId}/publish`, { name: "nope" });
  check("AC: expired draft publish → 410", expiredPublish.status === 410, String(expiredPublish.status));

  // --- Cursor pagination pages without duplicates
  const page1 = await call("GET", "/api/creations?sort=new&limit=24");
  const page2 = await call("GET", `/api/creations?sort=new&limit=24&cursor=${page1.json.data.nextCursor}`);
  const ids1 = new Set((page1.json.data.items as any[]).map((i) => i.id));
  const ids2 = (page2.json.data.items as any[]).map((i) => i.id);
  check("pagination: page 2 has 24 items", ids2.length === 24, String(ids2.length));
  check("pagination: no overlap between pages", ids2.every((id) => !ids1.has(id)));
  const week1 = await call("GET", "/api/creations?sort=week&limit=24");
  const week2 = await call("GET", `/api/creations?sort=week&limit=24&cursor=${week1.json.data.nextCursor}`);
  const wids1 = new Set((week1.json.data.items as any[]).map((i) => i.id));
  check("week sort cursor pages", (week2.json.data.items as any[]).every((i) => !wids1.has(i.id)));

  // --- AC §1.5: pairing never serves the viewer's own creations
  // Publish one creation as this user first.
  const d2 = await call("POST", "/api/draft");
  const slots = ["model", "passive", "q", "w", "e", "r"];
  for (const slot of slots) {
    const rev = await call("POST", `/api/draft/${d2.json.data.draftId}/reveal`);
    if (rev.json?.ok) await call("POST", `/api/draft/${d2.json.data.draftId}/assign`, { slot });
  }
  const pub = await call("POST", `/api/draft/${d2.json.data.draftId}/publish`, { name: "Mine Only" });
  const mine = pub.json?.data?.creationId as string;
  check("setup: published own creation", !!mine);
  let selfServed = 0;
  for (let i = 0; i < 10; i++) {
    const pair = await call("GET", "/api/battle");
    if (pair.json?.ok && (pair.json.data.a.id === mine || pair.json.data.b.id === mine)) selfServed++;
  }
  check("AC: own creation never served in 10 pairs", selfServed === 0, `selfServed=${selfServed}`);

  // --- AC §1.5/§1.6: votes land in the current week (sanity)
  const lb = await call("GET", "/api/leaderboard");
  check("leaderboard week is current", lb.json?.data?.week === (await sqlClient`select to_char(now(), 'IYYY-"W"IW') as w`)[0].w);

  console.log(failures === 0 ? "\nALL AC CHECKS PASSED" : `\n${failures} FAILURES`);
  await sqlClient.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await sqlClient.end().catch(() => {});
  process.exit(1);
});
