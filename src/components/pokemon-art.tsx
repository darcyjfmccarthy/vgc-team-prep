"use client";

import Image from "next/image";
import { useState } from "react";
import { itemIconUrl, pokemonSpriteUrl } from "@/lib/pokemon-assets";

export function PokemonArt({
  slug,
  isShiny,
}: {
  slug: string;
  isShiny: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  function captureCompletedImage(image: HTMLImageElement | null): void {
    if (!image?.complete) return;
    setStatus(image.naturalWidth > 0 ? "loaded" : "failed");
  }

  return (
    <div className="pokemon-art" data-testid="pokemon-art" aria-hidden="true">
      <span className="pokemon-art-fallback">?</span>
      {status !== "failed" && (
        <Image
          ref={captureCompletedImage}
          className={`pokemon-sprite${status === "loaded" ? " is-loaded" : ""}`}
          src={pokemonSpriteUrl(slug, isShiny)}
          alt=""
          width={120}
          height={120}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("failed")}
        />
      )}
    </div>
  );
}

export function ItemIcon({ slug }: { slug: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  function captureCompletedImage(image: HTMLImageElement | null): void {
    if (!image?.complete) return;
    setStatus(image.naturalWidth > 0 ? "loaded" : "failed");
  }

  return (
    <span className="item-icon" aria-hidden="true">
      <span className="item-icon-fallback">◆</span>
      {status !== "failed" && (
        <Image
          ref={captureCompletedImage}
          className={`item-sprite${status === "loaded" ? " is-loaded" : ""}`}
          src={itemIconUrl(slug)}
          alt=""
          width={24}
          height={24}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("failed")}
        />
      )}
    </span>
  );
}
