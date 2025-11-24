import type { Metadata } from 'next'
import { Geist, Geist_Mono, Crimson_Pro } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CollapsibleSidebar } from '@/components/collapsible-sidebar'
import { AppStateProvider } from '@/contexts/app-state-context'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  variable: '--font-geist-sans',
});
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono',
});
const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-crimson-pro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          /* Instant navigation - no transitions */
          * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          /* Prevent layout shift */
          html, body {
            overflow-x: hidden;
          }
          /* GPU acceleration */
          main {
            transform: translateZ(0);
            backface-visibility: hidden;
          }
        `}} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} ${crimsonPro.variable} antialiased`}>
        <AppStateProvider>
          <div className="flex h-screen bg-background">
            <CollapsibleSidebar />
            <main className="flex-1 overflow-auto flex flex-col">
              {children}
            </main>
          </div>
        </AppStateProvider>
        <Analytics />
      </body>
    </html>
  )
}
