import { hash, verify } from "@node-rs/argon2";

export const passwordPolicy = { min: 15, max: 128 };

export async function hashPassword(password: string): Promise<string> {
  // Argon2id is the library's stable algorithm value (2). Avoid importing its
  // ambient const enum so this module remains compatible with isolatedModules.
  return hash(password, {
    algorithm: 2 as never,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}
