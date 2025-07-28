<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Izuchator Dashboard Project

This is a Next.js 15 project with App Router using TypeScript. The project is designed as a comprehensive educational platform with dashboard functionality including statistics, calendar planning, user management, file sharing, and real-time communication.

## Core Stack
- **Next.js 15.4** with App Router and Turbopack for development
- **React 19** for UI components with React Server Components
- **TypeScript 5** for type safety
- **Tailwind CSS 4** for styling with PostCSS

## Data Management & State
- **TanStack Query 5** for client-side caching and server state synchronization
- **TanStack Table 8** for advanced data tables with sorting, filtering, and virtualization
- **TanStack Virtual 3** for performance optimization with large datasets
- Compatible with React 19 RSC Hydration

## Dashboard Components

### Calendar & Planning
- **FullCalendar 7 RC** with core plugins for calendar interface
- **@fullcalendar/daygrid** for month view
- **@fullcalendar/timegrid** for week/day views  
- **@fullcalendar/list** for agenda/list view
- **@fullcalendar/interaction** for drag-and-drop scheduling

### Data Visualization & Analytics
- **Recharts 3** for charts, graphs, and statistical dashboards
- Supports line charts, bar charts, pie charts, and area charts

### Notifications & Feedback  
- **Sonner 2** for toast notifications (Radix-compatible)
- Clean API for success, error, and info messages

### Animations
- **Framer Motion 12** for smooth page transitions and micro-interactions

## UI & Components
- **shadcn/ui** for reusable UI components built on Radix UI primitives
- **Radix UI** primitives:
  - `@radix-ui/react-dialog` for modals
  - `@radix-ui/react-dropdown-menu` for dropdown menus
  - `@radix-ui/react-popover` for popovers
  - `@radix-ui/react-select` for select components
  - `@radix-ui/react-sheet` for slide-out panels
- **Lucide React** for icons
- **class-variance-authority** for component variants
- **clsx** and **tailwind-merge** for conditional styling

## Authentication & Database
- **Supabase SDK** for authentication, database, storage, and real-time features
- **@supabase/ssr** helper for server-side rendering support
- Email-based authentication with OTP verification

## Form Handling & Validation
- **React Hook Form 7** for form state management
- **Zod 4** for schema validation and type safety
- Email validation before OTP calls

## Testing & Development Tools
- **Playwright** for end-to-end testing (devDependencies)
- **TanStack Query Devtools** for development debugging (devDependencies)
- **ESLint** with Next.js configuration

## Styling Extensions
- **@tailwindcss/typography** for markdown content styling
- **@tailwindcss/forms** for enhanced form styling
- **tw-animate-css** for additional animations

## Additional Utilities
- **nanoid** for generating short invitation codes and unique IDs
- **date-fns** for date formatting and localization (Russian locale support)
- **react-dropzone** for drag-and-drop file uploads (if needed)

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components including shadcn/ui components
  - `src/components/ui/` - shadcn/ui base components
  - `src/components/auth/` - Authentication components
  - `src/components/dashboard/` - Dashboard-specific components
- `src/lib/` - Utility functions and configurations
  - Supabase client setup (browser, server, SSR)
  - Utility functions (`utils.ts`)

## Authentication Flow

The authentication uses Supabase's magic link OTP method:
- Email-based authentication with OTP verification
- Server-side rendering support with `@supabase/ssr`
- Client-side auth with `@supabase/supabase-js` v2
- LoginDialog and RegisterDialog components implemented

## Development Guidelines

- Use TypeScript for all components and utilities
- Follow shadcn/ui patterns for component structure
- Implement form validation with Zod 4 schemas
- Use Framer Motion 12 for page transitions and micro-interactions
- Follow Next.js 15.4 App Router conventions
- Implement responsive design with Tailwind CSS 4 utilities
- Leverage React 19 features including Server Components
- Use TanStack Query 5 for efficient data fetching and caching

---

## Apple Human Interface Guidelines

- For all UI/UX and design decisions, refer to Apple's official Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
- Prioritize clarity, deference, and depth in interface design
- Use native-like navigation, spacing, and accessibility best practices
- Favor minimalism, legibility, and intuitive interactions
- Ensure all components and layouts are visually consistent and easy to use
