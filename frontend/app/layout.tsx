import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prediction Market Demo · Igbo Labs",
  description:
    "An LMSR-backed prediction market demo on BNB testnet. Accompanies Igbo Labs Case Study № 007.",
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
