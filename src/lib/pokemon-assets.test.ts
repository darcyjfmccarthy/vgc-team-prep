import { describe, expect, it } from "vitest";
import { itemIconUrl, pokemonSpriteUrl } from "./pokemon-assets";

describe("Pokémon Showdown asset URLs", () => {
  it("builds a base species sprite URL", () => {
    expect(pokemonSpriteUrl("basculegion", false)).toBe(
      "https://play.pokemonshowdown.com/sprites/gen5/basculegion.png",
    );
  });

  it("preserves alternate-form slugs", () => {
    expect(pokemonSpriteUrl("froslass-mega", false)).toBe(
      "https://play.pokemonshowdown.com/sprites/gen5/froslass-mega.png",
    );
  });

  it("uses the shiny collection", () => {
    expect(pokemonSpriteUrl("scovillain-mega", true)).toBe(
      "https://play.pokemonshowdown.com/sprites/gen5-shiny/scovillain-mega.png",
    );
  });

  it("builds a held-item icon URL", () => {
    expect(itemIconUrl("life-orb")).toBe(
      "https://play.pokemonshowdown.com/sprites/itemicons/life-orb.png",
    );
  });
});
