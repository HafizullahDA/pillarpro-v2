'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function UserProfileModal({
  open,
  onClose,
  userName,
  userRole,
  userEmail,
}: {
  open: boolean
  onClose: () => void
  userName: string
  userRole: string
  userEmail?: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState(userName)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSaveName = async () => {
    if (!name.trim()) return
    setSaving(true); setError(''); setSuccess('')

    const { error: authErr } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    })

    if (authErr) {
      setSaving(false); setError(authErr.message); return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_profiles').update({ display_name: name.trim() }).eq('id', user.id)
    }

    setSaving(false)
    setSuccess('Name updated successfully!')
    setTimeout(() => setSuccess(''), 3000)
    router.refresh()
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/sign-in')
  }

  return (
    <Drawer open={open} onClose={onClose} title="User Account Settings" size="sm">
      <div className="space-y-5">
        {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        {success && <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{success}</div>}

        <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-base shrink-0">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
            {userEmail && <p className="text-xs text-slate-500 truncate mb-1">{userEmail}</p>}
            <Badge label={userRole.replace('_', ' ')} variant="info" className="capitalize mt-0.5" />
          </div>
        </div>

        <FieldWrapper label="Display Name">
          <div className="flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />
            <Button size="sm" loading={saving} onClick={handleSaveName}>Save</Button>
          </div>
        </FieldWrapper>

        <div className="border-t border-slate-100 pt-4">
          <Button variant="danger" loading={signingOut} onClick={handleSignOut} className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
