import localFont from "next/font/local";

import { PlayerProvider } from "@/components/player-provider";

import "./globals.css";

const displayFont = localFont({
  src: "./fonts/SpaceGrotesk-Variable.ttf",
  variable: "--font-display",
});

const sansFont = localFont({
  src: [
    { path: "./fonts/IBMPlexSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexSans-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
});

const monoFont = localFont({
  src: [{ path: "./fonts/IBMPlexMono-Regular.ttf", weight: "400", style: "normal" }],
  variable: "--font-mono",
});

export const metadata = {
  title: "Data Hub",
  description: "Private chronological social layer for the HomeLab.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}>
      <body>
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
