import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Variant Sudoku Solver — Z3 SMT Engine",
  description:
    "Solve Killer, Thermo, Arrow, Kropki, Even/Odd, Diagonal and hybrid Sudoku variants using Z3 SMT with full step-by-step CSP visualization.",
  keywords: ["sudoku", "solver", "z3", "SMT", "CSP", "variant sudoku", "killer sudoku"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
