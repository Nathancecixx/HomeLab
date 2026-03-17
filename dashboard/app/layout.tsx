import type { Metadata } from "next";
import localFont from "next/font/local";
import { ReactNode } from "react";

import { ThemeScript } from "@/components/theme-script";
import "@/app/globals.css";

const displayFont = localFont({
  variable: "--font-display",
  src: [
    {
      path: "./fonts/SpaceGrotesk-Variable.ttf",
      style: "normal",
      weight: "400 700",
    },
  ],
  display: "swap",
});

const bodyFont = localFont({
  variable: "--font-sans",
  src: [
    {
      path: "./fonts/IBMPlexSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/IBMPlexSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/IBMPlexSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
});

const monoFont = localFont({
  variable: "--font-mono",
  src: [
    {
      path: "./fonts/IBMPlexMono-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/IBMPlexMono-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/IBMPlexMono-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BigRedPi Dashboard",
  description: "Modern monitoring and control surface for the BigRedPi homelab.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
