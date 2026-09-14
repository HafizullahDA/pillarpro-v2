import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'PillarPro — Civil Contractor Financial & Operations ERP'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, rgba(2,6,23,0) 70%)',
          }}
        />

        {/* Top bar: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(37,99,235,0.4)',
            }}
          >
            <div
              style={{
                color: 'white',
                fontSize: '34px',
                fontWeight: 800,
                letterSpacing: '-1px',
              }}
            >
              P
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                color: '#ffffff',
                fontSize: '36px',
                fontWeight: 800,
                letterSpacing: '-0.5px',
              }}
            >
              PillarPro
            </span>
            <span
              style={{
                color: '#60a5fa',
                fontSize: '16px',
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              Civil Contractor OS
            </span>
          </div>
        </div>

        {/* Center: Main Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px' }}>
          <h1
            style={{
              color: '#ffffff',
              fontSize: '56px',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
              margin: 0,
            }}
          >
            The Financial & Operations OS for Infrastructure Contractors
          </h1>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '24px',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Running Account (RA) Billing • Real-time Expense Tracking • Manpower Muster Rolls • Supplier Khata & Deductions
          </p>
        </div>

        {/* Bottom bar: Trust Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            paddingTop: '32px',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <span style={{ color: '#cbd5e1', fontSize: '18px', fontWeight: 600 }}>Multi-Tenant Data Isolation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <span style={{ color: '#cbd5e1', fontSize: '18px', fontWeight: 600 }}>Zero Spreadsheet Chaos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📱</span>
            <span style={{ color: '#cbd5e1', fontSize: '18px', fontWeight: 600 }}>Site Camera OCR & Muster Roll</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

