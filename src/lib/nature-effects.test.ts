import { describe, expect, it } from "vitest";
import { natureEffectFor, natureEffects } from "./nature-effects";

describe("nature effects", () => {
  it("covers all 25 natures", () => {
    expect(Object.keys(natureEffects)).toHaveLength(25);
  });

  it("returns increased and decreased stats", () => {
    expect(natureEffectFor("adamant")).toEqual({
      increased: "atk",
      decreased: "spa",
    });
    expect(natureEffectFor("timid")).toEqual({
      increased: "spe",
      decreased: "atk",
    });
  });

  it("returns no modifiers for neutral or unknown natures", () => {
    expect(natureEffectFor("serious")).toBeNull();
    expect(natureEffectFor("unknown")).toBeNull();
    expect(natureEffectFor(null)).toBeNull();
  });
});
