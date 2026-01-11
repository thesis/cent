import "./globals.css"
import { RootProvider } from "fumadocs-ui/provider"
import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import type { ReactNode } from "react"

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Cent - Arbitrary-precision currency library for TypeScript",
    template: "%s | Cent",
  },
  description:
    "Bulletproof financial math for TypeScript. Built for humans. Optimized for AI.",
  keywords: [
    "typescript",
    "money",
    "currency",
    "financial",
    "precision",
    "bigint",
    "library",
  ],
  authors: [{ name: "Thesis", url: "https://thesis.co" }],
  openGraph: {
    title: "Cent - Arbitrary-precision currency library for TypeScript",
    description:
      "Bulletproof financial math for TypeScript. Built for humans. Optimized for AI.",
    url: "https://cent.thesis.co",
    siteName: "Cent",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cent - Arbitrary-precision currency library for TypeScript",
    description:
      "Bulletproof financial math for TypeScript. Built for humans. Optimized for AI.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={mono.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
