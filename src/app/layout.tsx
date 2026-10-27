import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "EC Dashboard",
  description: "Sales and customer dashboard on the marts of ec-analytics-platform (synthetic data).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            EC Dashboard
          </Link>
          <nav aria-label="Pages">
            <Link href="/">Sales</Link>
            <Link href="/customers">Customers</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer muted">
          Synthetic data from{" "}
          <a href="https://github.com/yahayuta/ec-analytics-platform">ec-analytics-platform</a>. All figures in JPY.
        </footer>
      </body>
    </html>
  );
}
