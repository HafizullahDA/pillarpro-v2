import { Metadata } from 'next'
import { ContactClient } from '@/components/contact/ContactClient'

export const metadata: Metadata = {
  title: 'Contact Us — PillarPro Civil Contractor OS',
  description:
    'Contact the PillarPro infrastructure support desk for tender BOQ onboarding, CPWD Form 26 demo, and enterprise multi-site contracting support. Reach us at contact@pillarprojk.com.',
  openGraph: {
    title: 'Contact Us — PillarPro Support',
    description: 'Reach the PillarPro team directly at contact@pillarprojk.com for civil contractor ERP inquiries.',
    url: 'https://pillarprojk.com/contact',
  },
}

export default function ContactPage() {
  return <ContactClient />
}
