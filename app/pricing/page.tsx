import { Metadata } from 'next'
import { PricingClient } from '@/components/pricing/PricingClient'

export const metadata: Metadata = {
  title: 'Pricing & Plans — Transparent Active-Site Subscriptions',
  description:
    'PillarPro pricing for Indian civil contractors: Active Sites + Unlimited Users. No per-seat penalties. 14-day free trial. Bootstrap (₹999/mo), Growth Contractor (₹1,999/mo), and Enterprise Infra (₹3,999/mo).',
  keywords: [
    'pillarpro pricing',
    'civil contractor software pricing',
    'construction erp cost india',
    'cpwd billing software price',
    'delay defense software cost',
    'powerplay alternative',
    'onsite alternative',
    'pwd contractor software',
  ],
  openGraph: {
    title: 'PillarPro Pricing — Active Sites + Unlimited Users',
    description:
      'Fair, predictable civil contractor ERP pricing. Unlimited site supervisors and munshis with zero per-seat fees. Starting at ₹999/mo with 14-day free trial.',
    url: 'https://pillarprojk.com/pricing',
    type: 'website',
  },
}

export default function PricingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'PillarPro Civil Contractor Operating System',
    image: 'https://pillarprojk.com/icon-512.png',
    description:
      'Financial and Operations OS for Indian civil infrastructure contractors. RA Billing, statutory deductions, Delay Defense, Form 26 e-MB, and muster roll attendance.',
    brand: {
      '@type': 'Brand',
      name: 'PillarPro',
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Bootstrap Plan',
        price: '9999',
        priceCurrency: 'INR',
        billingDuration: 'P1Y',
        description: 'Up to 2 Active Sites, Unlimited Users, RA Bills & Statutory Deductions',
        url: 'https://pillarprojk.com/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Growth Contractor Plan',
        price: '19999',
        priceCurrency: 'INR',
        billingDuration: 'P1Y',
        description:
          'Up to 6 Active Sites, Unlimited Users, Form 26 MB, Delay Defense & Hindrance Register, AI OCR',
        url: 'https://pillarprojk.com/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Enterprise Infra Plan',
        price: '39999',
        priceCurrency: 'INR',
        billingDuration: 'P1Y',
        description:
          'Up to 15 Active Sites, Unlimited Users, Comprehensive Form 27 Legal Dossier, Multi-Firm Consolidation',
        url: 'https://pillarprojk.com/pricing',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PricingClient />
    </>
  )
}
