import { describe, expect, it } from "vitest";
import {
  championsBaseStatOverrides,
  computeChampionsStat,
} from "@/modules/calculator/champions-stats";

describe("Pokémon Champions Stat Points", () => {
  it("applies the maximum investment inside a positive nature", () => {
    expect(computeChampionsStat("atk", 130, 32, "Adamant")).toBe(200);
  });

  it("applies a negative nature after Stat Points", () => {
    expect(computeChampionsStat("atk", 80, 15, "Timid")).toBe(103);
  });

  it("adds HP Stat Points exactly at level 50", () => {
    expect(computeChampionsStat("hp", 70, 32, "Serious")).toBe(177);
  });

  it("translates points into exact base-stat overrides without an EV cap", () => {
    expect(
      championsBaseStatOverrides(
        { hp: 70, atk: 80, def: 70, spa: 140, spd: 100, spe: 120 },
        { hp: 0, atk: 32, def: 3, spa: 0, spd: 0, spe: 31 },
      ),
    ).toEqual({ hp: 70, atk: 112, def: 73, spa: 140, spd: 100, spe: 151 });
  });
});
