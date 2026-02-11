import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFL Data Assistant - Durable AI Workflow",
  description: "An NFL data chatbot using Vercel Workflows, AI SDK, and Sandbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
