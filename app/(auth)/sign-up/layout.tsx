import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Contractor Workspace',
  description: 'Launch your isolated PillarPro civil contractor operating workspace in 30 seconds.',
}

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

