import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AudioProvider } from "@/components/player/AudioProvider";
import { AuthProvider } from "@/lib/auth/provider";

export const metadata: Metadata = {
  title: "听日文歌 - Listening JP Songs",
  description: "听歌顺手一点点听懂，而不是正式「学日语」",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="dark">
      <head>
        <script
          async
          crossOrigin="anonymous"
          src="https://tweakcn.com/live-preview.min.js"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <AudioProvider>{children}</AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
