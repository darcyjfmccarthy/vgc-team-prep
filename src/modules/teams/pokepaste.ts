import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/config";
import { AppError } from "@/lib/errors";
import type { Pokepaste } from "./types";

const ID_PATTERN = /^[a-f0-9]{16}$/;
const maxBytes = 128 * 1024;

export function parsePokepasteUrl(input: string): {
  id: string;
  canonicalUrl: string;
} {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new AppError("INVALID_POKEPASTE_URL", "Enter a valid Poképaste URL.");
  }
  const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (
    url.protocol !== "https:" ||
    url.hostname !== "pokepast.es" ||
    url.port ||
    !ID_PATTERN.test(id)
  )
    throw new AppError(
      "INVALID_POKEPASTE_URL",
      "Use an HTTPS pokepast.es URL.",
    );
  return { id, canonicalUrl: `https://pokepast.es/${id}` };
}

function metadataFromHtml(
  html: string,
): Pick<Pokepaste, "title" | "author" | "formatId"> {
  const title = html.match(/<h1>([^<]+)<\/h1>/)?.[1]?.trim() ?? null;
  const author =
    html.match(/<h2>\s*&nbsp;by\s+([^<]+)<\/h2>/)?.[1]?.trim() ?? null;
  const formatId = html.match(/Format:\s*([^<\s]+)/)?.[1]?.trim() ?? null;
  return { title, author, formatId };
}

async function fixture(id: string, canonicalUrl: string): Promise<Pokepaste> {
  try {
    const base = path.join(
      process.cwd(),
      "src",
      "modules",
      "teams",
      "fixtures",
      id,
    );
    const [teamText, metadata] = await Promise.all([
      readFile(`${base}.txt`, "utf8"),
      readFile(`${base}.json`, "utf8"),
    ]);
    const parsed = JSON.parse(metadata) as Omit<Pokepaste, "teamText">;
    return { ...parsed, canonicalUrl, teamText };
  } catch {
    throw new AppError(
      "POKEPASTE_UNAVAILABLE",
      "That Poképaste is not available in local fixture mode.",
    );
  }
}

async function responseText(url: string, expected: RegExp): Promise<string> {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
    headers: { accept: "text/plain,text/html" },
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok)
    throw new AppError(
      "POKEPASTE_UNAVAILABLE",
      "Poképaste could not be retrieved.",
    );
  if (!expected.test(contentType))
    throw new AppError(
      "POKEPASTE_MALFORMED",
      "Poképaste returned an unexpected response.",
    );
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > maxBytes)
    throw new AppError(
      "POKEPASTE_MALFORMED",
      "Poképaste response is too large.",
    );
  const text = await response.text();
  if (Buffer.byteLength(text) > maxBytes)
    throw new AppError(
      "POKEPASTE_MALFORMED",
      "Poképaste response is too large.",
    );
  return text;
}

export async function fetchPokepaste(input: string): Promise<Pokepaste> {
  const { id, canonicalUrl } = parsePokepasteUrl(input);
  if (env.REPLAY_PROVIDER_MODE === "fixtures") return fixture(id, canonicalUrl);
  try {
    const [teamText, html] = await Promise.all([
      responseText(`${canonicalUrl}/raw`, /^text\/plain/i),
      responseText(canonicalUrl, /^text\/html/i),
    ]);
    return { id, canonicalUrl, teamText, ...metadataFromHtml(html) };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Poképaste is currently unavailable.",
    );
  }
}
