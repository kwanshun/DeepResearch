# Project Architecture

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Icons:** lucide-react
- **Backend/DB:** Supabase (Database, Auth, Realtime)
  - **Schema:** `deep_research`
  - **Tables:** `research_sessions`, `whitelist`
- **AI SDK:** @google/genai SDK (v2.0+)
  - **Core Models:** `gemini-3-flash-preview`, `gemini-3-pro-preview`, `deep-research-pro-preview-12-2025`
- **Markdown Rendering:** react-markdown + remark-gfm + react-syntax-highlighter
- **Layout:** react-resizable-panels

## Authentication & Authorization

### Authentication Method
The application uses **Supabase Auth** with **Google OAuth** as the primary sign-in provider.

- **Client-side:** Handled via `createBrowserClient` from `@supabase/ssr`.
- **Server-side:** Handled via `createServerClient` from `@supabase/ssr` with cookie storage for session persistence across server components and middleware.
- **Login Flow:**
  1. User clicks "Continue with Google" on the `/login` page.
  2. `supabase.auth.signInWithOAuth` is triggered with `prompt: 'select_account'`.
  3. Upon successful OAuth flow, the user is redirected to `/auth/callback`.
  4. The callback route handler (`/src/app/auth/callback/route.ts`) exchanges the code for a session and redirects the user to the application.

### Authorization & Access Control
To ensure only authorized users can access the Deep Research tool, a **Whitelist System** is implemented.

- **Database Table:** `deep_research.whitelist` stores the email addresses of authorized users.
- **Middleware Protection:** The Next.js Middleware (`src/middleware.ts`) intercept requests to protected routes:
  1. It verifies if a valid session exists using `supabase.auth.getUser()`.
  2. If a session exists, it queries the `deep_research.whitelist` table to check if the logged-in user's email is authorized.
  3. Unauthorized users are redirected to `/login?error=not_authorized`.
  4. Authorized users are granted access to the research workspace.
- **Row Level Security (RLS):** Supabase RLS is enabled on the `research_sessions` table to ensure users can only view, insert, or update their own research data (`auth.uid() = user_id`).

## Project Structure

This section describes the physical organization of the codebase. All development must strictly adhere to this structure:

- `/src/app`: Next.js App Router. Contains pages, layouts, and API routes.
  - `/src/app/deep_research`: Main Deep Research application.
  - `/src/app/api/deep_research`: API routes for Deep Research.
- `/src/components`: React components.
  - `/src/components/ui`: Shadcn/ui atomic components.
  - `/src/components/deep_research`: Components for the Deep Research app.
- `/src/lib`: Shared utility instances and core SDK initializations.
  - `gemini.ts`: `@google/genai` client setup.
  - `supabase.ts`: `@supabase/ssr` browser client setup.
  - `supabase-server.ts`: `@supabase/ssr` server client setup.
- `/src/middleware.ts`: Next.js Middleware for auth and whitelist protection.
- `/src/hooks`: Custom React hooks (e.g., `useSupabaseRealtime`).
- `/src/types`: TypeScript definitions and Supabase table interfaces.
- `/supabase/migrations`: SQL migration files for version control and database schema management.
- `/docs`: Project documentation, reference APIs, and coding guidelines.

For detailed developer instructions and AI agent behavioral rules, see `AGENTS.md`.
