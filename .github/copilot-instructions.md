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
- **Custom Calendar Component** built with React and Tailwind CSS - no external calendar libraries
- Simple week/day views for lesson scheduling
- Native drag-and-drop with HTML5 API
- Minimal, fast calendar implementation focused on lesson planning

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
Uses NextAuth v5 + Prisma + PostgreSQL. Presence feature uses Socket.io with Redis adapter for real-time status updates.

### Database Management & Type Generation

**Connecting to Database (local PostgreSQL):** use `DATABASE_URL` in environment and Prisma CLI (`prisma migrate dev`, `prisma studio`).

**Database Schema Notes:**
- Table `teacher_student_relations` has status constraint: `'pending' | 'active' | 'rejected' | 'blocked'`
- Use `RelationStatus` type in `src/lib/api.ts` for type safety
- RPC functions automatically filter `status = 'active'` AND `deleted_at IS NULL`
- For soft delete: set `status = 'blocked'` AND `deleted_at = timestamp`
- **Reactivation logic**: When accepting invites for existing relations, custom names and user data are reset

**Key RPC Functions:**
- `get_teacher_students(teacher_user_id)` - Returns teacher's students with user info
- `get_student_teachers(student_user_id)` - Returns student's teachers with user info  
- `create_invite_link(p_invite_type, p_message?, p_expires_in_hours?)` - Creates invitation
- `accept_invite_link(p_invite_code)` - Accepts invitation and creates/reactivates relation with data reset

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
  - Database client (`database.ts`) - Prisma setup
  - Auth configuration (`auth.ts`) - NextAuth v5
  - Utility functions (`utils.ts`)

## Authentication Flow

Authentication via NextAuth (email magic link provider to be re-enabled soon). Session data accessed with `useSession` and wrapped by custom `AuthProvider`.

## Development Guidelines

- Use TypeScript for all components and utilities
- Follow shadcn/ui patterns for component structure
- Implement form validation with Zod 4 schemas
- Use Framer Motion 12 for page transitions and micro-interactions
- Follow Next.js 15.4 App Router conventions
- Implement responsive design with Tailwind CSS 4 utilities
- Leverage React 19 features including Server Components
- Use TanStack Query 5 for efficient data fetching and caching

### Icon Usage Guidelines

**ALWAYS use the unified Icon component instead of direct Lucide icons:**

```tsx
// ✅ CORRECT - Use unified Icon component
import { Icon } from '@/components/ui/icon'
import { Plus, Mail, Trash2 } from 'lucide-react'

<Icon icon={Plus} size="sm" />
<Icon icon={Mail} size="md" />
<Icon icon={Trash2} size="lg" />
```

```tsx
// ❌ INCORRECT - Don't use direct Lucide icons with className
<Plus className="w-4 h-4" />
<Mail className="!w-4 !h-4" />
<Trash2 className="w-6 h-6" />
```

**Icon sizes available:** `xs`, `sm`, `md`, `lg`, `xl` - use these instead of manual className sizing.

## File Management System

The project includes a complete file management system in the "Мои материалы" section:

### File Storage
- **Local Development:** Files stored in `uploads/{userId}/` directory
- **Production Ready:** Configured for Selectel Object Storage (S3-compatible)
- **Security:** Private file access with user authorization
- **File Types:** Images, PDF, Office documents, text files, archives (max 10MB)

### Database Schema
- **Files table** with metadata: name, size, type, path, user relations
- **File types:** `DOCUMENT`, `IMAGE`, `VIDEO`, `AUDIO`, `ARCHIVE`, `OTHER`
- **Relations:** Files can be linked to teacher-student relationships

### API Endpoints
- `POST /api/files` - Upload files with validation
- `GET /api/files` - List files with filtering
- `GET /api/files/[id]` - Download files (authorized access only)
- `DELETE /api/files/[id]` - Delete files

### UI Components
- **FileManager component** with grid/list views
- **File upload** via native file input (no drag-and-drop zone)
- **File filtering** by type using shadcn/ui Select component
- **File actions:** download, delete with confirmation
- **File type icons** and metadata display

### Database Migrations
- Use `prisma migrate dev --name change_description` for schema changes
- Never use `prisma db push` in production
- Mark manual schema changes with `prisma migrate resolve --applied migration_name`

---

## Apple Human Interface Guidelines

- For all UI/UX and design decisions, refer to Apple's official Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
- Prioritize clarity, deference, and depth in interface design
- Use native-like navigation, spacing, and accessibility best practices
- Favor minimalism, legibility, and intuitive interactions
- Ensure all components and layouts are visually consistent and easy to use
