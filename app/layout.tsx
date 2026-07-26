import type { Metadata } from "next";
import { Cinzel, Libre_Baskerville, Geist_Mono } from "next/font/google";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const libre = Libre_Baskerville({
  variable: "--font-libre",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kingdom of Patterngard",
  description: "Gamified LeetCode pattern practice with spaced repetition",
  icons: {
    icon: [{ url: "/icons/patterngard-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/patterngard-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${libre.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
