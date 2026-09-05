import { NextResponse, type NextRequest } from "next/server";
import { correlationId } from "@/lib/logging";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set(
    "x-request-id",
    request.headers.get("x-request-id") ?? correlationId(),
  );
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
