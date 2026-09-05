const SHOWDOWN_SPRITE_ROOT = "https://play.pokemonshowdown.com/sprites";

export function pokemonSpriteUrl(slug: string, isShiny: boolean): string {
  const collection = isShiny ? "gen5-shiny" : "gen5";
  return `${SHOWDOWN_SPRITE_ROOT}/${collection}/${slug}.png`;
}

export function itemIconUrl(slug: string): string {
  return `${SHOWDOWN_SPRITE_ROOT}/itemicons/${slug}.png`;
}
