import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SnapToPlaylist - Da Screenshot a Playlist Spotify con Gemini Vision AI",
  description:
    "Estrai automaticamente titoli e artisti dai tuoi screenshot musicali e crea la tua playlist Spotify in un click.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} dark bg-neutral-950`}
    >
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
