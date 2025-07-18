<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Izuchator Landing Page Project

This is a Next.js 15 project with App Router using TypeScript. The project uses:

## Core Stack
- **Next.js 15** with App Router and Turbopack for development
- **React 19** for UI components
- **TypeScript 5** for type safety
- **Tailwind CSS 4** for styling with PostCSS
- **Framer Motion** for smooth animations
- **Supabase** for authentication (OTP email verification)

## UI & Components
- **shadcn/ui** for reusable UI components
- **Radix UI** primitives:
  - `@radix-ui/react-dialog` for modals
  - `@radix-ui/react-dropdown-menu` for dropdown menus
  - `@radix-ui/react-popover` for popovers
- **Lucide React** for icons
- **class-variance-authority** for component variants
- **clsx** and **tailwind-merge** for conditional styling

## Form Handling & Validation
- **Zod** for schema validation
- **React Hook Form** for form state management
- Email validation before OTP calls

## Testing & Quality
- **ESLint** with Next.js configuration
- **Playwright** for end-to-end testing
- Planned: smoke tests for landing page and OTP flow

## Styling Extensions
- **@tailwindcss/typography** for markdown content styling
- **@tailwindcss/forms** for enhanced form styling
- **tw-animate-css** for additional animations

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components including shadcn/ui components
  - `src/components/ui/` - shadcn/ui base components
  - `src/components/auth/` - Authentication components
- `src/lib/` - Utility functions and configurations
  - Supabase client setup (browser, server, SSR)
  - Utility functions (`utils.ts`)

## Authentication Flow

The authentication uses Supabase's magic link OTP method:
- Email-based authentication with OTP verification
- Server-side rendering support with `@supabase/ssr`
- Client-side auth with `@supabase/supabase-js` v2
- Planned: LoginDialog and RegisterDialog components

## Development Guidelines

- Use TypeScript for all components and utilities
- Follow shadcn/ui patterns for component structure
- Implement form validation with Zod schemas
- Use Framer Motion for page transitions and micro-interactions
- Follow Next.js 15 App Router conventions
- Implement responsive design with Tailwind CSS utilities
