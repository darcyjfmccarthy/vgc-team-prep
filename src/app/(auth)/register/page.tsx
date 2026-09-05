import Link from "next/link";
import { registerAction } from "@/app/actions/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <section className="panel">
        <h1>Create account</h1>
        {params.error && <p className="error">{params.error}</p>}
        <form action={registerAction}>
          <label>
            Display name
            <input name="displayName" autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password <small>15–128 characters</small>
            <input
              name="password"
              type="password"
              required
              minLength={15}
              autoComplete="new-password"
            />
          </label>
          <button>Create account</button>
        </form>
        <p>
          <Link href="/login">Already have an account?</Link>
        </p>
      </section>
    </main>
  );
}
