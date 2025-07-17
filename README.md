# Izuchator Landing Page

A Next.js 15 landing page with Tailwind CSS 4, shadcn/ui components, Framer Motion animations, and Supabase authentication.

## Technologies Used

- **Next.js 15** with App Router for server-side rendering
- **Tailwind CSS 4** for styling
- **shadcn/ui** for consistent UI components
- **Framer Motion** for animations
- **Supabase** for authentication (OTP)

## Development Setup

### Prerequisites

- Node.js (v18.17 or later)
- npm (v9 or later)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Features

- Landing page with light theme
- Animation effects using Framer Motion
- Authentication with Supabase OTP (One-Time Password)
- Responsive design with Tailwind CSS
- UI components from shadcn/ui
