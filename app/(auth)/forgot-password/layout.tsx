import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forgot Password | PillarPro',
  description: 'Reset your PillarPro Civil Contractor Workspace password securely.',
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

