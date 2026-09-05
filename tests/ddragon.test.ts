import { describe, expect, it } from "vitest";
import { sanitizeTooltip, stripScalingNumbers, toReadableTooltip } from "../src/lib/ddragon";

describe("sanitizeTooltip", () => {
  it("strips Data Dragon markup instead of rendering it", () => {
    expect(sanitizeTooltip("Deals <magicDamage>50 damage</magicDamage>.")).toBe(
      "Deals 50 damage.",
    );
  });

  it("turns <br> into real line breaks", () => {
    expect(sanitizeTooltip("One<br>Two")).toBe("One\nTwo");
  });

  it("decodes entities", () => {
    expect(sanitizeTooltip("Zed&#39;s shadow &amp; blade")).toBe("Zed's shadow & blade");
  });

  it("drops Riot's inline icon tokens", () => {
    expect(sanitizeTooltip("Attack Speed (%i:scaleAS%%i:scaleAP%)")).toBe("Attack Speed ()");
  });

  it("cannot emit a script tag", () => {
    const dirty = "<script>alert('x')</script>hello";
    expect(sanitizeTooltip(dirty)).toBe("alert('x')hello");
    expect(sanitizeTooltip(dirty)).not.toContain("<");
  });
});

describe("stripScalingNumbers", () => {
  it("omits the value and keeps the damage type", () => {
    expect(stripScalingNumbers("Deals {{ e1 }} magic damage.")).toBe("Deals magic damage.");
  });

  it("keeps durations readable instead of leaving 'for seconds'", () => {
    expect(stripScalingNumbers("Slows for {{ e2 }} seconds.")).toBe("Slows for a few seconds.");
    expect(stripScalingNumbers("Stunned for up to {{ maxdur }} seconds.")).toBe(
      "Stunned for a few seconds.",
    );
    expect(stripScalingNumbers("Reduces cooldown by {{ e1 }} seconds.")).toBe(
      "Reduces cooldown by a few seconds.",
    );
    expect(stripScalingNumbers("For the next {{ d }} seconds, she gains Speed.")).toBe(
      "For the next few seconds, she gains Speed.",
    );
  });

  it("turns percentages of a resource into a proportion", () => {
    expect(stripScalingNumbers("Heals for {{ a1 }}% of missing Health.")).toBe(
      "Heals for a portion of missing Health.",
    );
    expect(stripScalingNumbers("Deals {{ e1 }}% max Health damage.")).toBe(
      "Deals a portion of max Health damage.",
    );
  });

  it("keeps 'of' when it binds to the noun after the value", () => {
    expect(stripScalingNumbers("fires a volley of {{ e1 }} arrows")).toBe(
      "fires a volley of arrows",
    );
    expect(stripScalingNumbers("applies {{ n }} stacks of Plasma")).toBe(
      "applies several stacks of Plasma",
    );
  });

  it("drops 'of' when the value ended the clause", () => {
    expect(stripScalingNumbers("up to a maximum of {{ e1 }}.")).toBe("up to a maximum.");
  });

  it("removes a preposition left pointing at nothing", () => {
    expect(stripScalingNumbers("Slowing enemies by {{ e2 }}%.")).toBe("Slowing enemies.");
    expect(stripScalingNumbers("down to a minimum of {{ e3 }}.")).toBe("down to a minimum.");
    expect(stripScalingNumbers("storing up to {{ n }} bullets.")).toBe("storing bullets.");
  });

  it("drops scaling parentheticals whole", () => {
    expect(stripScalingNumbers("Deals {{ e1 }} (+{{ a1 }} AP) damage.")).toBe("Deals damage.");
  });

  it("gives a stranded verb its object back", () => {
    expect(stripScalingNumbers("dealing {{ total }} to all enemies")).toBe(
      "dealing damage to all enemies",
    );
  });

  it("leaves a grammatical sentence alone", () => {
    const clean = "the damage he deals to Champions";
    expect(stripScalingNumbers(clean)).toBe(clean);
  });

  it("keeps vague counts rather than dropping them", () => {
    expect(stripScalingNumbers("may Recast {{ n }} times.")).toBe("may Recast several times.");
  });

  it("never leaves a question mark or a placeholder behind", () => {
    const out = stripScalingNumbers("Deals {{ e1 }} plus {{ f2 }}% of {{ a3 }} damage.");
    expect(out).not.toMatch(/[?{}]/);
    expect(out).not.toMatch(/ {2}/);
  });
});

describe("toReadableTooltip", () => {
  it("strips markup before repairing grammar, so tagged values still parse", () => {
    expect(
      toReadableTooltip("Slows for <scaleTime>{{ e2 }}</scaleTime> seconds."),
    ).toBe("Slows for a few seconds.");
  });

  it("produces prose with no numbers claimed", () => {
    const out = toReadableTooltip(
      "<spellActive>Aatrox</spellActive> deals <physicalDamage>{{ e1 }} physical damage</physicalDamage> and Slows by {{ e2 }}% for {{ e3 }} seconds.",
    );
    expect(out).toBe("Aatrox deals physical damage and Slows for a few seconds.");
  });
});
