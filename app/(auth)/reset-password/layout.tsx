import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset Password | PillarPro',
  description: 'Set a new secure password for your PillarPro Contractor Workspace.',
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

