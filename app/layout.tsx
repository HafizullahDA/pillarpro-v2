import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { PwaProvider } from '@/components/pwa/PwaProvider'
import { VisitorTracker } from '@/components/analytics/VisitorTracker'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pillarprojk.com'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'PillarPro — Civil Contractor Financial & Operations ERP',
    template: '%s | PillarPro',
  },
  description:
    'The Financial & Operations Operating System built specifically for civil infrastructure contractors. RA Billing, statutory deductions, supplier khatas, and site muster rolls.',
  keywords: [
    'pillarprojk',
    'pillarprojk.com',
    'pillarpro jk',
    'civil contractor software',
    'construction erp',
    'ra bill generator',
    'running account bill',
    'contractor accounting software',
    'muster roll attendance',
    'pwd billing software',
    'supplier ledger khata',
  ],
  authors: [{ name: 'PillarPro' }],
  creator: 'PillarPro',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48 32x32 16x16' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PillarPro',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'application-name': 'PillarPro',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: baseUrl,
    siteName: 'PillarPro',
    title: 'PillarPro — Civil Contractor Financial & Operations ERP',
    description:
      'Running Account (RA) Billing, statutory deductions (TDS, GST, Cess), supplier khatas, and site muster rolls for civil contractors.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PillarPro — Civil Contractor Financial & Operations ERP',
    description:
      'Running Account (RA) Billing, statutory deductions (TDS, GST, Cess), supplier khatas, and site muster rolls for civil contractors.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
                } else {
                  window.addEventListener('DOMContentLoaded', function() {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
                  });
                }
              }
            `,
          }}
        />
        <PwaProvider>
          {children}
        </PwaProvider>
        <Analytics />
        <VisitorTracker />
      </body>
    </html>
  )
}
