'use client'
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { usePwa } from '@/components/pwa/PwaProvider'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
  const { isStandalone } = usePwa()
  const { locale, setLocale, t } = useLanguage()
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
    logo_url: '',
    signature_url: '',
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
          logo_url: data.logo_url || '',
          signature_url: data.signature_url || '',
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
      logo_url: orgForm.logo_url || null,
      signature_url: orgForm.signature_url || null,
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
      logo_url: orgForm.logo_url || null,
      signature_url: orgForm.signature_url || null,
    }))
    setEditingOrg(false)
    setSuccess('Company details updated successfully!')
    setTimeout(() => setSuccess(''), 3000)
    router.refresh()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'signature_url') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setOrgForm(prev => ({ ...prev, [field]: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
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
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div className="text-xs">
                  <span className="text-slate-500 font-medium block mb-1">Firm Logo</span>
                  {org.logo_url ? (
                    <img src={org.logo_url} alt="Logo" className="h-10 max-w-full object-contain rounded border border-slate-200 bg-white p-1" />
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No logo uploaded</span>
                  )}
                </div>
                <div className="text-xs">
                  <span className="text-slate-500 font-medium block mb-1">Official Seal / Sign</span>
                  {org.signature_url ? (
                    <img src={org.signature_url} alt="Signature" className="h-10 max-w-full object-contain rounded border border-slate-200 bg-white p-1" />
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No seal uploaded</span>
                  )}
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-3 pt-1">
                <FieldWrapper label="Company Logo (PDF Header)">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleImageUpload(e, 'logo_url')}
                    className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {orgForm.logo_url && (
                    <div className="mt-1 flex items-center gap-2">
                      <img src={orgForm.logo_url} alt="Logo preview" className="h-8 max-w-[80px] object-contain rounded border border-slate-200 bg-white p-0.5" />
                      <button
                        type="button"
                        onClick={() => setOrgForm(f => ({ ...f, logo_url: '' }))}
                        className="text-[10px] text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </FieldWrapper>
                <FieldWrapper label="Official Seal & Sign (PDF)">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleImageUpload(e, 'signature_url')}
                    className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {orgForm.signature_url && (
                    <div className="mt-1 flex items-center gap-2">
                      <img src={orgForm.signature_url} alt="Signature preview" className="h-8 max-w-[80px] object-contain rounded border border-slate-200 bg-white p-0.5" />
                      <button
                        type="button"
                        onClick={() => setOrgForm(f => ({ ...f, signature_url: '' }))}
                        className="text-[10px] text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </FieldWrapper>
              </div>
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

        {/* Language Selection */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <div>
              <p className="text-xs font-bold text-slate-900">{locale === 'hi' ? 'ऐप की भाषा' : 'App Language'}</p>
              <p className="text-[11px] text-slate-500">{locale === 'hi' ? 'हिन्दी (Hindi) सक्रिय' : 'English (Active)'}</p>
            </div>
          </div>
          <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                locale === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLocale('hi')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                locale === 'hi' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* Display Name Edit */}
        <FieldWrapper label="Your Display Name">
          <div className="flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />
            <Button size="sm" loading={saving} onClick={handleSaveName}>{t('common.save', 'Save')}</Button>
          </div>
        </FieldWrapper>

        {/* PWA App Install Button (When not running in standalone mode) */}
        {!isStandalone && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-slate-900">Install PillarPro App</p>
                <p className="text-[11px] text-slate-600">Add to Home Screen for fast field access</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('pillarpro_pwa_install_dismissed')
                } catch {}
                window.dispatchEvent(new CustomEvent('pillarpro-show-install'))
                onClose()
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-xs transition-colors shrink-0"
            >
              Install
            </button>
          </div>
        )}

        {/* Subscription & Active Sites */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-slate-900">Subscription & Sites</p>
              <p className="text-[11px] text-slate-500">Active Sites + Unlimited Users model</p>
            </div>
          </div>
          <Link
            href="/pricing"
            target="_blank"
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-colors shrink-0"
          >
            View Plans
          </Link>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <Button variant="danger" loading={signingOut} onClick={handleSignOut} className="w-full">
            Sign Out
          </Button>
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
            <div className="flex items-center gap-2.5">
              <Link href="/pricing" target="_blank" className="hover:text-slate-600 transition-colors">Pricing</Link>
              <span>•</span>
              <Link href="/terms" target="_blank" className="hover:text-slate-600 transition-colors">Terms</Link>
              <span>•</span>
              <Link href="/privacy" target="_blank" className="hover:text-slate-600 transition-colors">Privacy</Link>
            </div>
            <span>v0.1.0</span>
          </div>
        </div>
      </div>
    </Drawer>
  )
}
