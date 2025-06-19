import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { BounceScrollDisabler } from "@/components/bounce-scroll-disabler"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "コツコツ単語帳",
  description:
    "忘却曲線を用いた今までにない単語帳アプリ。自動で自分用の忘却曲線に沿った単語帳を作成して忘れる前に出題してくれる。記憶に定着しやすい。",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="コツコツ単語帳" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="コツコツ単語帳" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <BounceScrollDisabler />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
