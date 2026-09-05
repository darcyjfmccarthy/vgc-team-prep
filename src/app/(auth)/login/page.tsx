import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <section className="panel">
        <h1>Sign in</h1>
        {params.error && <p className="error">{params.error}</p>}
        {params.reset && (
          <p className="success">Password reset. You can now sign in.</p>
        )}
        <form action={loginAction}>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button>Sign in</button>
        </form>
        <p>
          <Link href="/reset-password">Forgot password?</Link> ·{" "}
          <Link href="/register">Create account</Link>
        </p>
      </section>
    </main>
  );
}
