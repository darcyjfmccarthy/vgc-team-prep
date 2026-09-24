import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/styles/replay-analysis.css";

export const metadata: Metadata = {
  title: "VGC Team Prep",
  description: "Private Pokémon Champions team preparation.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
