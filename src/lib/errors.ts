export type SafeErrorCode =
  | "VALIDATION_FAILED"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_POKEPASTE_URL"
  | "POKEPASTE_UNAVAILABLE"
  | "POKEPASTE_MALFORMED"
  | "REVISION_CONFLICT";

export type ActionResult<T> =
  | { ok: true; data: T; correlationId: string }
  | {
      ok: false;
      code: SafeErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
      correlationId: string;
    };

export class AppError extends Error {
  constructor(
    public readonly code: SafeErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}
