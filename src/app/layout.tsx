import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supply Chain Command Center",
  description: "Supply chain dashboard with analytics and GenAI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
