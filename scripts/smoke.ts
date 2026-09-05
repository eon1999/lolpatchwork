/**
 * API smoke test against a running dev/prod server.
 * Exercises the draft state machine ACs (§2.5), vote idempotency, and reads.
 * Usage: tsx --env-file=.env scripts/smoke.ts [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3000";

let cookie = "";

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const pair = c.split(";")[0];
    if (pair.startsWith("uid=")) cookie = pair;
  }
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-json (og image etc.) */
  }
  return { status: res.status, json };
}

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? ` (${extra})` : ""}`);
  if (!cond) failures++;
}

async function main() {
  console.log(`Smoke testing ${BASE}`);

  // Pages
  for (const p of ["/", "/draft", "/gallery", "/battle", "/leaderboard", "/admin"]) {
    const res = await fetch(BASE + p);
    check(`GET ${p} → 200`, res.status === 200, String(res.status));
  }

  // Draft state machine
  const start = await call("POST", "/api/draft");
  check("POST /api/draft → ok", start.status === 200 && start.json.ok, JSON.stringify(start.json).slice(0, 120));
  const draftId = start.json?.data?.draftId as string;
  check("draft returns total=6, no champion list", start.json?.data?.total === 6 && !start.json?.data?.championIds);

  const assignments: Record<string, string> = {};
  const slots = ["model", "passive", "q", "w", "e", "r"];
  let lastChampion: any = null;

  for (let i = 0; i < 5; i++) {
    const reveal = await call("POST", `/api/draft/${draftId}/reveal`);
    check(`reveal #${i + 1} → ok`, reveal.json?.ok === true, JSON.stringify(reveal.json).slice(0, 100));
    lastChampion = reveal.json?.data?.champion;
    const assign = await call("POST", `/api/draft/${draftId}/assign`, { slot: slots[i] });
    assignments[slots[i]] = lastChampion?.id;
    check(`assign ${slots[i]} → ok`, assign.json?.ok === true);
  }

  // AC: double reveal without assign → 409
  const reveal6 = await call("POST", `/api/draft/${draftId}/reveal`);
  check("reveal #6 → ok", reveal6.json?.ok === true);
  const revealDup = await call("POST", `/api/draft/${draftId}/reveal`);
  check("AC: double reveal → 409", revealDup.status === 409, String(revealDup.status));

  // 6th assign: any slot other than the last remaining one must be rejected
  const wrongSlot = await call("POST", `/api/draft/${draftId}/assign`, { slot: slots[0] });
  check("AC: filled slot rejected on round 6", wrongSlot.status === 409, String(wrongSlot.status));
  const assign6 = await call("POST", `/api/draft/${draftId}/assign`, { slot: slots[5] });
  check("final assign → ok", assign6.json?.ok === true);

  // AC: publish ignores client-sent champion ids
  const publish = await call("POST", `/api/draft/${draftId}/publish`, {
    name: "Smoke Test Abomination",
    tagline: "injected via smoke test",
    modelId: "Teemo",
    qId: "Teemo",
    passiveId: "Teemo",
    wId: "Teemo",
    eId: "Teemo",
    rId: "Teemo",
  });
  check("publish → 201", publish.status === 201, JSON.stringify(publish.json).slice(0, 120));
  const creationId = publish.json?.data?.creationId as string;

  const fetched = await call("GET", `/api/creations/${creationId}`);
  check(
    "AC: injected champion ids ignored",
    fetched.json?.data?.model?.championId === assignments.model &&
      fetched.json?.data?.slots?.q?.championId === assignments.q,
    `model=${fetched.json?.data?.model?.championId} q=${fetched.json?.data?.slots?.q?.championId}`,
  );

  // Permalink page + OG image
  const page = await fetch(`${BASE}/c/${creationId}`);
  check("GET /c/{id} → 200", page.status === 200);
  const og = await fetch(`${BASE}/c/${creationId}/opengraph-image`);
  check("GET opengraph-image → 200 png", og.status === 200 && (og.headers.get("content-type") ?? "").includes("image/png"), `${og.status} ${og.headers.get("content-type")}`);

  // Feed
  const feed = await call("GET", "/api/creations?sort=new&limit=24");
  check("GET /api/creations → 24 items + cursor", feed.json?.data?.items?.length === 24 && !!feed.json?.data?.nextCursor);
  const weekFeed = await call("GET", "/api/creations?sort=week&limit=24");
  check("GET /api/creations?sort=week → ok", weekFeed.json?.ok === true);

  // Upvote toggle
  const up1 = await call("POST", `/api/creations/${creationId}/upvote`);
  check("upvote on", up1.json?.data?.upvoted === true, JSON.stringify(up1.json).slice(0, 80));
  const up2 = await call("POST", `/api/creations/${creationId}/upvote`);
  check("upvote toggle off", up2.json?.data?.upvoted === false);

  // Battle + vote idempotency
  const pair = await call("GET", "/api/battle");
  check("GET /api/battle → pair", pair.json?.ok === true && !!pair.json?.data?.pairToken, JSON.stringify(pair.json).slice(0, 100));
  const vote1 = await call("POST", "/api/battle/vote", { pairToken: pair.json?.data?.pairToken, winner: "a" });
  check("vote → counted", vote1.json?.data?.counted === true, JSON.stringify(vote1.json).slice(0, 100));
  const vote2 = await call("POST", "/api/battle/vote", { pairToken: pair.json?.data?.pairToken, winner: "a" });
  check("AC: double vote idempotent", vote2.json?.data?.counted === false, JSON.stringify(vote2.json).slice(0, 100));
  const badVote = await call("POST", "/api/battle/vote", { pairToken: "garbage.token", winner: "a" });
  check("forged pairToken → 403", badVote.status === 403, String(badVote.status));

  // Next pair must differ from the just-voted one
  const pair2 = await call("GET", "/api/battle");
  const different =
    pair2.json?.data?.a?.id !== pair.json?.data?.a?.id || pair2.json?.data?.b?.id !== pair.json?.data?.b?.id;
  check("next pair differs from voted pair", different === true);

  // Leaderboard + hall of fame + rename
  const lb = await call("GET", "/api/leaderboard");
  check("GET /api/leaderboard → ok", lb.json?.ok === true);
  const hof = await call("GET", "/api/hall-of-fame");
  check("GET /api/hall-of-fame → ok", hof.json?.ok === true);
  const rename = await call("POST", "/api/user/name", { name: "Smoke Poro 1" });
  check("rename → ok", rename.json?.ok === true);
  const rename2 = await call("POST", "/api/user/name", { name: "Smoke Poro 2" });
  check("rename twice in 24h → 429", rename2.status === 429, String(rename2.status));
  const renameBad = await call("POST", "/api/user/name", { name: "fuuuck" });
  check("profanity rename rejected", renameBad.status === 400, String(renameBad.status));

  // Cron requires secret
  const cronBad = await call("POST", "/api/cron/weekly-rollover");
  check("cron without secret → 401", cronBad.status === 401, String(cronBad.status));

  console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
