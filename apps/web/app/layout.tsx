import type { Metadata } from "next";
import "./globals.css";
import "./brand-tokens.css";

export const metadata: Metadata = {
  title: "FURSA | فرصة — Discover Jobs Across the Gulf",
  description: "Discover source-backed job opportunities across the UAE, Saudi Arabia, Qatar, Kuwait, and Bahrain in Arabic and English.",
  applicationName: "FURSA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
