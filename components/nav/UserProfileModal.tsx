'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  getClientOrganization,
  updateClientOrganization,
  OrganizationProfile,
  DEFAULT_ORGANIZATION,
} from '@/lib/organization'

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

  // Organization states
  const [org, setOrg] = useState<OrganizationProfile>(DEFAULT_ORGANIZATION)
  const [editingOrg, setEditingOrg] = useState(false)
  const [orgForm, setOrgForm] = useState({
    name: '',
    registration_no: '',
    gstin: '',
    address: '',
  })
  const [savingOrg, setSavingOrg] = useState(false)

  const isOwner = userRole === 'owner' || userRole === 'managing_partner' || userRole === 'partner'

  useEffect(() => {
    if (open) {
      getClientOrganization().then(data => {
        setOrg(data)
        setOrgForm({
          name: data.name || '',
          registration_no: data.registration_no || '',
          gstin: data.gstin || '',
          address: data.address || '',
        })
      })
    }
  }, [open])

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

  const handleSaveOrg = async () => {
    if (!orgForm.name.trim()) {
      setError('Company/Firm name is required.')
      return
    }
    setSavingOrg(true); setError(''); setSuccess('')

    const res = await updateClientOrganization(org.id, {
      name: orgForm.name.trim(),
      registration_no: orgForm.registration_no.trim() || null,
      gstin: orgForm.gstin.trim() || null,
      address: orgForm.address.trim() || null,
    })

    setSavingOrg(false)
    if (!res.success) {
      setError(res.error || 'Failed to update company details')
      return
    }

    setOrg(prev => ({
      ...prev,
      name: orgForm.name.trim(),
      registration_no: orgForm.registration_no.trim() || null,
      gstin: orgForm.gstin.trim() || null,
      address: orgForm.address.trim() || null,
    }))
    setEditingOrg(false)
    setSuccess('Company details updated successfully!')
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
          <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-base shrink-0 shadow-xs">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
            {userEmail && <p className="text-xs text-slate-500 truncate mb-1">{userEmail}</p>}
            <Badge label={userRole.replace('_', ' ')} variant="info" className="capitalize mt-0.5" />
          </div>
        </div>

        {/* Organization & Firm Details */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Company / Firm Profile</p>
            {isOwner && !editingOrg && (
              <button
                onClick={() => setEditingOrg(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Edit Firm Details
              </button>
            )}
          </div>

          {!editingOrg ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between text-xs">
                <span className="text-slate-500 font-medium">Firm Name</span>
                <span className="font-semibold text-slate-900 text-right">{org.name}</span>
              </div>
              {org.registration_no && (
                <div className="flex items-start justify-between text-xs">
                  <span className="text-slate-500 font-medium">Registration / Class</span>
                  <span className="font-medium text-slate-700 text-right">{org.registration_no}</span>
                </div>
              )}
              {org.gstin && (
                <div className="flex items-start justify-between text-xs">
                  <span className="text-slate-500 font-medium">GSTIN</span>
                  <span className="font-mono text-slate-700 text-right">{org.gstin}</span>
                </div>
              )}
              {org.address && (
                <div className="flex items-start justify-between text-xs">
                  <span className="text-slate-500 font-medium">Location</span>
                  <span className="text-slate-600 text-right">{org.address}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium">Account Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Organization
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <FieldWrapper label="Firm / Company Name" required>
                <Input
                  value={orgForm.name}
                  onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Lone Construction Co."
                />
              </FieldWrapper>
              <FieldWrapper label="Contractor Reg / Class" hint="e.g. Class-A Govt Contractor, PWD">
                <Input
                  value={orgForm.registration_no}
                  onChange={e => setOrgForm(f => ({ ...f, registration_no: e.target.value }))}
                  placeholder="Class-A Registered Contractor"
                />
              </FieldWrapper>
              <FieldWrapper label="GSTIN (Optional)">
                <Input
                  value={orgForm.gstin}
                  onChange={e => setOrgForm(f => ({ ...f, gstin: e.target.value }))}
                  placeholder="01AAAAA0000A1Z5"
                />
              </FieldWrapper>
              <FieldWrapper label="Office Address">
                <Input
                  value={orgForm.address}
                  onChange={e => setOrgForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="City, State"
                />
              </FieldWrapper>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => setEditingOrg(false)} className="flex-1">
                  Cancel
                </Button>
                <Button size="sm" loading={savingOrg} onClick={handleSaveOrg} className="flex-1">
                  Save Firm
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Display Name Edit */}
        <FieldWrapper label="Your Display Name">
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
