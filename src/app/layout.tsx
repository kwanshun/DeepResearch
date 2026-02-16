import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iterative Research Agent",
  description: "Next-gen research with Gemini 3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased h-full">
        {children}
      </body>
    </html>
  );
}
