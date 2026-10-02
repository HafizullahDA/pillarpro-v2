import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to load sample data.' }, { status: 401 })
    }

    // 1. Fetch user profile and organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organization_id, display_name, organizations(id, name)')
      .eq('id', user.id)
      .maybeSingle()

    let orgId: string | null = profile?.organization_id ?? null
    let orgName = (profile?.organizations as { name?: string } | null)?.name || 'My Contracting Firm'
    const displayName = profile?.display_name || user.email?.split('@')[0] || 'Contractor'

    // If user has no organization_id, ensure one exists
    if (!orgId) {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('email', user.email || '')
        .maybeSingle()

      if (existingOrg) {
        orgId = existingOrg.id
        orgName = existingOrg.name
      } else {
        const { data: newOrg, error: newOrgErr } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            legal_name: orgName,
            registration_no: 'Class-A Govt Contractor, PWD / PMGSY',
            email: user.email || null,
          })
          .select('id, name')
          .single()

        if (!newOrgErr && newOrg) {
          orgId = newOrg.id
          orgName = newOrg.name
        }
      }

      if (orgId) {
        await supabase
          .from('user_profiles')
          .upsert(
            {
              id: user.id,
              email: user.email,
              display_name: displayName,
              organization_id: orgId,
              status: 'active',
            },
            { onConflict: 'id' }
          )
      }
    }

    // Ensure user has 'owner' role in public.roles
    await supabase
      .from('roles')
      .upsert(
        {
          user_id: user.id,
          role: 'owner',
          project_id: null,
        },
        { onConflict: 'user_id' }
      )

    // 2. Attempt onboard_contractor RPC
    try {
      await supabase.rpc('onboard_contractor', {
        p_firm_name: orgName,
        p_display_name: displayName,
        p_seed_starter: true,
      })
    } catch (rpcEx) {
      console.warn('onboard_contractor RPC notice:', rpcEx)
    }

    // 3. Verify if user now has any project visible
    const { data: verifyProjects } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (verifyProjects && verifyProjects.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Sample Highway Project & RA Bill loaded successfully',
        project_id: verifyProjects[0].id,
      })
    }

    // 4. Guaranteed Direct Seeding Fallback (if RPC failed or rolled back silently)
    const seededProjectId = await seedStarterDataDirectly(supabase, user.id, orgId, orgName)

    return NextResponse.json({
      success: true,
      message: 'Sample Highway Project & RA Bill loaded successfully',
      project_id: seededProjectId,
    })
  } catch (err) {
    console.error('Exception while seeding starter project:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      { status: 500 }
    )
  }
}

async function seedStarterDataDirectly(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  orgId: string | null,
  orgName: string
): Promise<string> {
  const startDate = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]
  const endDate = new Date(Date.now() + 300 * 86400000).toISOString().split('T')[0]

  // Step 1: Create Project in public.projects
  let projectId: string | null = null
  const projectPayload: Record<string, any> = {
    name: 'PMGSY Highway Widening & Culverts (Pkg-02)',
    agency_name: 'PWD (R&B) National Highway Division',
    advertised_cost: 18500000.0,
    awarded_amount: 17800000.0,
    start_date: startDate,
    end_date: endDate,
    status: 'active',
    created_by: userId,
  }
  if (orgId) {
    projectPayload.organization_id = orgId
  }

  const { data: projData, error: projErr } = await supabase
    .from('projects')
    .insert(projectPayload)
    .select('id')
    .single()

  if (!projErr && projData?.id) {
    projectId = projData.id
  } else {
    // Fallback to create_project SECURITY DEFINER RPC
    const { data: rpcProjId, error: rpcErr } = await supabase.rpc('create_project', {
      p_name: projectPayload.name,
      p_agency_name: projectPayload.agency_name,
      p_advertised_cost: projectPayload.advertised_cost,
      p_awarded_amount: projectPayload.awarded_amount,
      p_start_date: projectPayload.start_date,
      p_end_date: projectPayload.end_date,
      p_status: projectPayload.status,
    })

    if (!rpcErr && rpcProjId) {
      projectId = rpcProjId as string
    } else {
      throw new Error(projErr?.message || rpcErr?.message || 'Could not insert sample highway project.')
    }
  }

  // Step 2: Project Membership
  try {
    await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: userId,
      role: 'owner',
    })
  } catch (e) {
    console.warn('project_members insert notice:', e)
  }

  // Step 3: BOQ Schedule of Quantities
  try {
    const boqItems = [
      {
        project_id: projectId,
        ...(orgId ? { organization_id: orgId } : {}),
        item_number: 'Item 2.1',
        description: 'Earthwork excavation in all kinds of soil, lead up to 50m and lift up to 1.5m, including dressing of sides and ramming of bottoms',
        unit: 'Cum',
        tender_quantity: 5400.0,
        awarded_rate: 185.0,
      },
      {
        project_id: projectId,
        ...(orgId ? { organization_id: orgId } : {}),
        item_number: 'Item 3.4',
        description: 'Providing and laying Granular Sub-base (GSB) Grading-I material conforming to Table 400-1 of MoRTH specifications',
        unit: 'Cum',
        tender_quantity: 1850.0,
        awarded_rate: 840.0,
      },
      {
        project_id: projectId,
        ...(orgId ? { organization_id: orgId } : {}),
        item_number: 'Item 4.2',
        description: 'Providing, laying, spreading and compacting Wet Mix Macadam (WMM) mechanically to required grade, camber and density',
        unit: 'Cum',
        tender_quantity: 1200.0,
        awarded_rate: 1450.0,
      },
      {
        project_id: projectId,
        ...(orgId ? { organization_id: orgId } : {}),
        item_number: 'Item 5.1',
        description: 'Design mix cement concrete M-25 grade for 2x2m R.C.C. box culverts and return walls complete as per approved drawing',
        unit: 'Cum',
        tender_quantity: 240.0,
        awarded_rate: 6800.0,
      },
    ]
    await supabase.from('boq_items').insert(boqItems)
  } catch (e) {
    console.warn('BOQ items insert notice:', e)
  }

  // Step 4: Sample RA Bill 01
  try {
    const billDate = new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0]
    const recDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    await supabase.from('ra_bills').insert({
      project_id: projectId,
      ...(orgId ? { organization_id: orgId } : {}),
      bill_number: 'RA Bill 01',
      submission_date: billDate,
      work_certified_amount: 3250000.0,
      retention_percentage: 5.0,
      amount_received: 3003000.0,
      tds_deducted: 65000.0,
      gst_tds_deducted: 65000.0,
      labour_cess_deducted: 32500.0,
      other_deductions: 84500.0,
      total_deductions: 247000.0,
      net_bank_received: 3003000.0,
      date_received: recDate,
      status: 'submitted',
      billing_mode: 'standalone',
      remarks: 'First running account bill for earthwork Ch 0+000 to 2+500 & Culvert 1/1 foundation',
      created_by: userId,
    })
  } catch (e) {
    console.warn('ra_bills insert notice:', e)
  }

  // Step 5: Performance Security Deposit
  try {
    const issueDate = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]
    const expiryDate = new Date(Date.now() + 540 * 86400000).toISOString().split('T')[0]
    await supabase.from('security_deposits').insert({
      project_id: projectId,
      ...(orgId ? { organization_id: orgId } : {}),
      deposit_type: 'performance_bank_guarantee',
      reference_number: 'PBG/SBI/2025/CA-02',
      issuing_bank: 'State Bank of India (Commercial Branch)',
      amount: 890000.0,
      issue_date: issueDate,
      expiry_date: expiryDate,
      status: 'active',
      notes: 'Contract performance guarantee (5% of awarded amount)',
      created_by: userId,
    })
  } catch (e) {
    console.warn('security_deposits insert notice:', e)
  }

  // Step 6: Suppliers
  try {
    if (orgId) {
      await supabase.from('suppliers').insert([
        {
          organization_id: orgId,
          name: 'JK Cements & Aggregate Traders',
          contact_person: 'Altaf Ahmad',
          phone: '+91 94190 12345',
          created_by: userId,
        },
        {
          organization_id: orgId,
          name: 'Jhelum Stone Crushers & Quarry',
          contact_person: 'Farooq Ahmad',
          phone: '+91 94191 23456',
          created_by: userId,
        },
      ])
    }
  } catch (e) {
    console.warn('suppliers insert notice:', e)
  }

  // Step 7: Machinery
  try {
    if (orgId) {
      await supabase.from('machinery_assets').insert([
        {
          organization_id: orgId,
          project_id: projectId,
          asset_name: 'Tata Hitachi EX-200 LC Hydraulic Excavator',
          asset_type: 'excavator',
          registration_number: 'JK-01-AB-4412',
          ownership: 'owned',
          current_meter: 1420.0,
          status: 'active',
          notes: 'Heavy cutting and embankment excavation on Package-02',
        },
        {
          organization_id: orgId,
          project_id: projectId,
          asset_name: 'JCB 3DX Super Eco Backhoe Loader',
          asset_type: 'loader',
          registration_number: 'JK-04-E-8819',
          ownership: 'hired',
          hourly_rate: 1450.0,
          current_meter: 640.0,
          status: 'active',
          notes: 'Hired @ ₹1,450/hr for box culvert backfilling & GSB spreading',
        },
      ])
    }
  } catch (e) {
    console.warn('machinery_assets insert notice:', e)
  }

  // Step 8: Store Inventory
  try {
    if (orgId) {
      await supabase.from('inventory_items').insert([
        {
          organization_id: orgId,
          project_id: projectId,
          item_name: 'OPC 43 Grade Cement (Khyber / Saifco)',
          category: 'raw_material',
          unit: 'Bags',
          current_stock: 450.0,
          minimum_stock: 100.0,
          unit_rate: 410.0,
          location: 'Site Store Camp Km 2+200',
        },
        {
          organization_id: orgId,
          project_id: projectId,
          item_name: 'Fe 500D TMT Steel 16mm (Kamdhenu)',
          category: 'raw_material',
          unit: 'MT',
          current_stock: 8.5,
          minimum_stock: 2.0,
          unit_rate: 64500.0,
          location: 'Steel Yard Ch 2+100',
        },
      ])
    }
  } catch (e) {
    console.warn('inventory_items insert notice:', e)
  }

  // Step 9: Site Expense
  try {
    const expDate = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
    await supabase.from('expenses').insert({
      project_id: projectId,
      category: 'fuel',
      amount: 12500.0,
      date: expDate,
      description: 'Emergency 140L diesel drum for vibrator and water pump at Ch 2+100',
      created_by: userId,
    })
  } catch (e) {
    console.warn('expenses insert notice:', e)
  }

  // Step 10: Contract Master
  try {
    if (orgId) {
      await supabase.from('contracts').insert({
        organization_id: orgId,
        project_id: projectId,
        agreement_number: 'CA-02 of 2025-26',
        contract_number: 'EE/PMGSY/DIV-II/2025/CA-02',
        work_name: 'PMGSY Highway Widening & Culverts (Pkg-02)',
        contract_title: 'Widening & Strengthening of PMGSY Road Pkg-02',
        authority_name: 'Executive Engineer, PWD (R&B) PMGSY Division',
        contractor_legal_name: orgName,
        contract_type: 'item_rate',
        awarded_amount: 17800000.0,
        contract_value: 17800000.0,
        stipulated_start_date: startDate,
        stipulated_completion_date: endDate,
        original_completion_date: endDate,
        current_completion_date: endDate,
        dlp_months: 24,
        performance_security_amount: 890000.0,
        security_deposit_amount: 445000.0,
        eot_clause: 'Clause 5',
        variation_clause: 'Clause 12',
        escalation_clause: 'Clause 10CC',
        status: 'active',
        created_by: userId,
      })
    }
  } catch (e) {
    console.warn('contracts insert notice:', e)
  }

  return projectId
}
