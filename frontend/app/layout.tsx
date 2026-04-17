import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastHost } from "@/components/ui/Toast";

const DESCRIPTION =
  "A deployed, clickable LMSR prediction market on BNB testnet. No real money — create a market, trade YES/NO shares, resolve, and claim.";

export const metadata: Metadata = {
  title: {
    default: "Prediction Market Demo · Igbo Labs",
    template: "%s · Igbo Labs",
  },
  description: DESCRIPTION,
  applicationName: "Igbo Labs Prediction Market Demo",
  keywords: ["prediction market", "LMSR", "BNB", "testnet", "Polymarket", "Igbo Labs"],
  authors: [{ name: "Igbo Labs" }],
  openGraph: {
    title: "Prediction Market Demo · Igbo Labs",
    description: DESCRIPTION,
    type: "website",
    siteName: "Igbo Labs · Prediction Market Demo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prediction Market Demo · Igbo Labs",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
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
