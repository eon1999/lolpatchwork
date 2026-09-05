import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, users } from "@/lib/db/schema";
import { getChampion } from "@/lib/champions";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LoL Patchwork creation";

// Creations are immutable after publish — cache forever (SPEC §2.9).
export const revalidate = false;

const SLOT_ORDER = [
  { key: "passive", label: "PASSIVE" },
  { key: "q", label: "Q" },
  { key: "w", label: "W" },
  { key: "e", label: "E" },
  { key: "r", label: "R" },
] as const;

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db
    .select({ creation: creations, authorName: users.displayName })
    .from(creations)
    .innerJoin(users, eq(users.id, creations.userId))
    .where(eq(creations.id, id))
    .limit(1);
  const row = rows[0];
  const model = row ? getChampion(row.creation.modelId) : undefined;

  const slotRow = (key: (typeof SLOT_ORDER)[number]["key"], label: string) => {
    if (!row) return null;
    const champ = getChampion(
      key === "passive"
        ? row.creation.passiveId
        : key === "q"
          ? row.creation.qId
          : key === "w"
            ? row.creation.wId
            : key === "e"
              ? row.creation.eId
              : row.creation.rId,
    );
    if (!champ) return null;
    const ability = champ.abilities[key];
    return (
      <div key={key} style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
        <img
          src={ability.icon}
          width={48}
          height={48}
          style={{ borderRadius: 8, border: "1px solid #1f3a55", objectFit: "cover" }}
        />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 14 }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline" }}>
            <span style={{ color: "#c8aa6e", fontSize: 15, letterSpacing: 2, marginRight: 10 }}>
              {label}
            </span>
            <span style={{ color: "#f0e6d2", fontSize: 21, fontWeight: 700 }}>{ability.name}</span>
          </div>
          <span style={{ color: "#7a8b9e", fontSize: 14 }}>from {champ.name}</span>
        </div>
      </div>
    );
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#071019",
          color: "#f0e6d2",
        }}
      >
        {model && (
          <img
            src={model.loading}
            width={420}
            height={630}
            style={{ objectFit: "cover", objectPosition: "top" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", padding: 44, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 15, letterSpacing: 4, color: "#0ac8b9" }}>
            LOL PATCHWORK
          </div>
          {row && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 62,
                  fontWeight: 800,
                  marginTop: 6,
                  color: "#f0e6d2",
                }}
              >
                {row.creation.name}
              </div>
              {row.creation.tagline && (
                <div style={{ display: "flex", fontSize: 20, color: "#7a8b9e", fontStyle: "italic" }}>
                  {row.creation.tagline}
                </div>
              )}
              <div style={{ display: "flex", fontSize: 16, color: "#c8aa6e", marginTop: 18 }}>
                {model?.name}&apos;s body · built by {row.authorName}
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
                {SLOT_ORDER.map(({ key, label }) => slotRow(key, label))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", fontSize: 14, color: "#7a8b9e" }}>
            lolpatchwork · which one wins the 1v1?
          </div>
        </div>
      </div>
    ),
    size,
  );
}
