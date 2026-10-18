import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { PwaProvider } from '@/components/pwa/PwaProvider'
import { VisitorTracker } from '@/components/analytics/VisitorTracker'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

const getSafeBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://pillarprojk.com'
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).origin
  } catch {
    return 'https://pillarprojk.com'
  }
}
const baseUrl = getSafeBaseUrl()

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
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
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
  themeColor: '#ffffff',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-50 text-slate-900 min-h-dvh selection:bg-blue-600 selection:text-white">
        <PwaProvider>{children}</PwaProvider>
        <Analytics />
        <VisitorTracker />
      </body>
    </html>
  )
}
