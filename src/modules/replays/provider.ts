import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/config";
import { AppError } from "@/lib/errors";

export function parseReplayUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new AppError(
      "VALIDATION_FAILED",
      "Enter an HTTPS Pokémon Showdown replay URL.",
    );
  }
  const match = /^\/([a-z0-9]+-\d+(?:-[a-z0-9]+)?)(?:\.(?:log|json))?\/?$/.exec(
    url.pathname,
  );
  if (
    url.protocol !== "https:" ||
    url.hostname !== "replay.pokemonshowdown.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    !match
  )
    throw new AppError(
      "VALIDATION_FAILED",
      "Use a replay.pokemonshowdown.com replay URL without credentials or query parameters.",
    );
  return {
    id: match[1],
    canonicalUrl: `https://replay.pokemonshowdown.com/${match[1]}`,
    formatId: match[1].split("-")[0],
  };
}
export async function fetchReplayLog(input: string): Promise<string> {
  const { id, canonicalUrl } = parseReplayUrl(input);
  if (env.REPLAY_PROVIDER_MODE === "fixtures") {
    try {
      return await readFile(
        path.join(process.cwd(), "src/modules/replays/fixtures", `${id}.log`),
        "utf8",
      );
    } catch {
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Replay is not in local fixtures. Use a sample URL or switch the provider to connected mode.",
      );
    }
  }
  try {
    const response = await fetch(`${canonicalUrl}.log`, {
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: { accept: "text/plain" },
    });
    if (!response.ok)
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        response.status === 404 || response.status === 403
          ? "Replay is private, deleted, or unavailable. Check the complete replay URL, including its private suffix."
          : "Showdown could not return this replay. Try again later.",
      );
    if (!/^text\/plain\b/i.test(response.headers.get("content-type") ?? ""))
      throw new AppError(
        "VALIDATION_FAILED",
        "Showdown returned an unexpected replay response.",
      );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Missing body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4 * 1024 * 1024) {
        await reader.cancel();
        throw new AppError(
          "VALIDATION_FAILED",
          "Replay exceeds the 4 MB import limit.",
        );
      }
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Replay retrieval timed out or failed. Check the URL and retry.",
    );
  }
}
