import type { Metadata } from "next";
import BattleClient from "@/components/BattleClient";

export const metadata: Metadata = { title: "Battle" };

export default function BattlePage() {
  return (
    <div className="mx-auto max-w-6xl py-8">
      <BattleClient />
    </div>
  );
}
