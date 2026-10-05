import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Root layout: the <html> and <body> around every page. The page language is English.

// Title and description shown in the browser tab and in search results.
export const metadata: Metadata = {
  title: "ETF & Stock Database",
  description:
    "Course homework: a moving average (SMA) crossover strategy compared with Buy & Hold for ETFs and large stocks. Not investment advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
