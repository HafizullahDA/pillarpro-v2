import React from 'react'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  theme?: 'dark' | 'light'
  subtitle?: string
  href?: string
  className?: string
}

const SIZE_CONFIGS = {
  sm: { icon: 'w-7 h-7', text: 'text-base', sub: 'text-[9px]' },
  md: { icon: 'w-8 h-8', text: 'text-lg', sub: 'text-[10px]' },
  lg: { icon: 'w-10 h-10', text: 'text-2xl', sub: 'text-xs' },
}

export function LogoIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      className={`${className} shrink-0`}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Rounded Foundation */}
      <rect width="64" height="64" rx="16" className="fill-blue-600" />

      {/* Structural Pillar Column (Vertical Stem) */}
      <rect x="12" y="10" width="11" height="42" rx="3" fill="#FFFFFF" />
      {/* Fluting Column Relief Accent */}
      <rect x="16" y="15" width="3" height="32" rx="1.5" fill="#DBEAFE" />
      {/* Foundation Footing Base Cap */}
      <rect x="10" y="49" width="15" height="3.5" rx="1.75" fill="#93C5FD" />

      {/* Cantilever Precast Beam Loop */}
      <path
        d="M27 10H42C51.3888 10 59 17.6112 59 27C59 36.3888 51.3888 44 42 44H27V10Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />

      {/* Inner Loop Cutout Counter */}
      <path
        d="M27 20H40C43.866 20 47 23.134 47 27C47 30.866 43.866 34 40 34H27V20Z"
        className="fill-blue-600"
      />

      {/* Connector Brackets */}
      <rect x="23" y="15" width="4" height="3" rx="1" fill="#BFDBFE" />
      <rect x="23" y="36" width="4" height="3" rx="1" fill="#BFDBFE" />
    </svg>
  )
}

export function Logo({
  size = 'md',
  showWordmark = true,
  theme = 'light',
  subtitle,
  href,
  className = '',
}: LogoProps) {
  const conf = SIZE_CONFIGS[size]
  const isDark = theme === 'dark'

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <LogoIcon className={conf.icon} />
      {showWordmark && (
        <div className="flex flex-col">
          <div className={`font-black tracking-tight leading-none ${conf.text}`}>
            <span className={isDark ? 'text-white' : 'text-slate-900'}>Pillar</span>
            <span className="text-blue-600 ml-0.5">Pro</span>
          </div>
          {subtitle && (
            <span
              className={`font-bold tracking-[0.2em] uppercase mt-1 ${conf.sub} ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex hover:opacity-95 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}

