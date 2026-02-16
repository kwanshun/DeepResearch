import { createBrowserClient } from '@supabase/ssr'

export function createClient(schema: string = 'deep_research') {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema,
      },
    }
  )
}

// Export a singleton for simpler usage in client components
export const supabase = createClient();
