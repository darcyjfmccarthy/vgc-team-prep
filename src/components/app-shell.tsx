"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = [
    { href: "/", label: "Home" },
    { href: "/teams", label: "Teams" },
    { href: "/knowledge", label: "Knowledge" },
    { href: "/settings", label: "Profile" },
  ];
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="app-sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">V</span>VGC Team Prep
        </Link>
        <nav aria-label="Primary navigation" className="primary-nav">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <form action={logoutAction}>
            <button className="link-button">Log out</button>
          </form>
        </div>
      </aside>
      <header className="mobile-header">
        <Link href="/" className="brand">
          <span className="brand-mark">V</span>VGC Team Prep
        </Link>
      </header>
      <main id="main-content" className="page">
        {children}
      </main>
      <nav aria-label="Mobile primary navigation" className="mobile-nav">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={active ? "active" : ""}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
