import Link from "next/link";
import { requestResetAction, resetPasswordAction } from "@/app/actions/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const reset = params.token ? (
    <form action={resetPasswordAction}>
      <input name="token" type="hidden" value={params.token} />
      <label>
        New password
        <input
          name="password"
          type="password"
          required
          minLength={15}
          autoComplete="new-password"
        />
      </label>
      <button>Reset password</button>
    </form>
  ) : (
    <form action={requestResetAction}>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <button>Send reset link</button>
    </form>
  );
  return (
    <main className="auth-page">
      <section className="panel">
        <h1>Reset password</h1>
        {params.sent && (
          <p className="success">
            If that account exists, a reset link is in the local mailbox.
          </p>
        )}
        {params.error && <p className="error">{params.error}</p>}
        {reset}
        <p>
          <Link href="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
