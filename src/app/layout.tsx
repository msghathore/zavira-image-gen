import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Image Generator - Conversation Style",
  description: "Generate and edit images through natural conversation using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#0a0a0a]">
        {children}
      </body>
    </html>
  );
}
