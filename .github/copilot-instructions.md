<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Izuchator Landing Page Project

This is a Next.js 15 project with App Router using TypeScript. The project uses:
- Tailwind CSS 4 for styling
- shadcn/ui for UI components
- Framer Motion for animations
- Supabase for authentication (OTP)

## Project Structure

- `app/` - Next.js App Router files
- `components/` - React components including shadcn/ui components
- `lib/` - Utility functions and Supabase client setup

## Authentication Flow

The authentication flow uses Supabase's OTP (One-Time Password) method with:
- LoginDialog and RegisterDialog components
- @supabase/supabase-js v2 for client-side auth
- @supabase/ssr for cookie handling
