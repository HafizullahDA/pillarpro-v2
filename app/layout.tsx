import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pillarpro.in'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'PillarPro — Civil Contractor Financial & Operations ERP',
    template: '%s | PillarPro',
  },
  description:
    'The Financial & Operations Operating System built specifically for civil infrastructure contractors. RA Billing, statutory deductions, supplier khatas, and site muster rolls.',
  keywords: [
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
    icon: [{ url: '/icon.svg?v=2', type: 'image/svg+xml' }],
    shortcut: '/icon.svg?v=2',
    apple: '/icon.svg?v=2',
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
  maximumScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
