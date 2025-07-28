import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types/database.generated'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const createSupabaseBrowserClient = () => createBrowserClient<Database>(url, key)
