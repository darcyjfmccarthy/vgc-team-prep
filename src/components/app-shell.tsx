import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          VGC Team Prep
        </Link>
        <nav>
          <Link href="/teams">Teams</Link>
          <Link href="/teams/import">Import</Link>
          <Link href="/dev/mailbox">Mailbox</Link>
          <form action={logoutAction}>
            <button className="link-button">Log out</button>
          </form>
        </nav>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
