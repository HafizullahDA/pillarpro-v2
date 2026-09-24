import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  const assetlinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.pillarprojk.twa',
        sha256_cert_fingerprints: [
          '09:A6:BC:63:CB:2F:AD:2F:F5:62:86:41:30:69:8B:A9:3D:CF:2C:EB:E1:F5:AD:95:00:78:04:F0:8D:14:B5:8B',
        ],
      },
    },
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.pillarprojk.app',
        sha256_cert_fingerprints: [
          '09:A6:BC:63:CB:2F:AD:2F:F5:62:86:41:30:69:8B:A9:3D:CF:2C:EB:E1:F5:AD:95:00:78:04:F0:8D:14:B5:8B',
          '14:6D:E9:7D:0F:52:AB:E6:51:76:F8:78:A8:10:97:5B:3D:23:CE:F5:F4:02:64:1C:87:C5:1B:32:0C:5D:F2:18',
        ],
      },
    },
  ]

  return NextResponse.json(assetlinks, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

