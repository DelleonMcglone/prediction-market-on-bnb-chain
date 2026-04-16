import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastHost } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Prediction Market Demo · Igbo Labs",
  description:
    "An LMSR-backed prediction market demo on BNB testnet. Accompanies Igbo Labs Case Study № 007.",
  openGraph: {
    title: "Prediction Market Demo · Igbo Labs",
    description:
      "An LMSR-backed prediction market on BNB testnet. No real money. Trade, resolve, claim.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <ToastHost>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastHost>
        </Providers>
      </body>
    </html>
  );
}
