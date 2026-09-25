import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UVS Problem Selection",
  description: "Problem database and paper drafting for Ung Vetenskapssport problem groups",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
