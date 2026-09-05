import { createClient } from '@/lib/supabase/server'
import { ProjectsClient, ProjectRow } from './ProjectsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = createClient()
  
  const [{ data: userRole }, { data: projects }] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  return (
    <ProjectsClient
      projects={(projects as ProjectRow[]) ?? []}
      userRole={(userRole as string) ?? ''}
    />
  )
}
