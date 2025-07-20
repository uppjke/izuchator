import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const createSupabaseServerClient = async() => {
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll().map((cookie) => ({ 
        name: cookie.name, 
        value: cookie.value 
      })),
      setAll: (cookieList) => {
        cookieList.forEach(({ name, value, options }) => {
          if (value) {
            cookieStore.set({ name, value, ...options })
          } else {
            cookieStore.delete({ name })
          }
        })
      },
    },
  })
}

export const createSupabaseBrowserClient = () => createClient(url, key)