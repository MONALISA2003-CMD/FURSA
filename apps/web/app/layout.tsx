import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FURSA | Your Next Opportunity Starts Here",
  description:
    "Discover source-backed job opportunities across the Gulf in Arabic and English.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
