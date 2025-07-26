<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Izuchator Dashboard Project

This is a Next.js 15 project with App Router using TypeScript. The project is designed as a comprehensive educational platform with dashboard functionality including statistics, calendar planning, user management, file sharing, and real-time communication.

## Core Stack
- **Next.js 15** with App Router and Turbopack for development
- **React 19** for UI components
- **TypeScript 5** for type safety
- **Tailwind CSS 4** for styling with PostCSS
- **Framer Motion** for smooth animations
- **Supabase** for authentication, database, storage, and real-time features

## Data Management & State
- **@tanstack/react-query** (v5) for client-side caching and server state synchronization
- **@tanstack/react-query-devtools** for development debugging
- Compatible with React 19 RSC Hydration

## Dashboard Components

### Calendar & Planning
- **@fullcalendar/react** with core plugins for calendar interface
- **@fullcalendar/daygrid** for month view
- **@fullcalendar/timegrid** for week/day views  
- **@fullcalendar/interaction** for drag-and-drop scheduling
- **date-fns** (v4) for date manipulation and localization

### Data Visualization & Analytics
- **recharts** for charts, graphs, and statistical dashboards
- Supports line charts, bar charts, pie charts, and area charts

### Tables & Data Display
- **@tanstack/react-table** (v8) for advanced data tables
- **@tanstack/react-virtual** for performance with large datasets
- Sorting, filtering, pagination, and virtualization support

### File Management
- **react-dropzone** for drag-and-drop file uploads
- Integration with Supabase Storage for file handling
- Support for signed URLs and file previews

### Notifications & Feedback  
- **sonner** for toast notifications (Radix-compatible)
- Clean API for success, error, and info messages

## UI & Components
- **shadcn/ui** for reusable UI components
- **Radix UI** primitives:
  - `@radix-ui/react-dialog` for modals
  - `@radix-ui/react-dropdown-menu` for dropdown menus
  - `@radix-ui/react-popover` for popovers
- **Lucide React** for icons
- **class-variance-authority** for component variants
- **clsx** and **tailwind-merge** for conditional styling

## Utilities & Helpers
- **nanoid** for generating short invitation codes and unique IDs
- **clsx** and **tailwind-merge** for conditional styling
- **date-fns** for date formatting and localization (Russian locale support)

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
- **@tailwindcss/line-clamp** for text truncation with ellipsis
- **@tailwindcss/aspect-ratio** for responsive aspect ratios
- **tw-animate-css** for additional animations

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
- Planned: LoginDialog and RegisterDialog components

## Development Guidelines

- Use TypeScript for all components and utilities
- Follow shadcn/ui patterns for component structure
- Implement form validation with Zod schemas
- Use Framer Motion for page transitions and micro-interactions
- Follow Next.js 15 App Router conventions
- Implement responsive design with Tailwind CSS utilities

---

## Apple Human Interface Guidelines

- For all UI/UX and design decisions, refer to Apple's official Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
- Prioritize clarity, deference, and depth in interface design
- Use native-like navigation, spacing, and accessibility best practices
- Favor minimalism, legibility, and intuitive interactions
- Ensure all components and layouts are visually consistent and easy to use
