import { randomUUID } from "node:crypto";

export const correlationId = () => randomUUID();

export function log(event: string, fields: Record<string, unknown> = {}): void {
  const safe = Object.fromEntries(
    Object.entries(fields).filter(
      ([key]) => !/(password|token|cookie|secret|raw|email)/i.test(key),
    ),
  );
  console.log(
    JSON.stringify({ timestamp: new Date().toISOString(), event, ...safe }),
  );
}
