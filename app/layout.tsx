import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home Base",
  description: "Personal finance dashboard for Sarah & Hunter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto max-w-md px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
