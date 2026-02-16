# Project Agents & Structure

This file provides guidance for AI agents working on the **Iterative Research Agent** project.

## 📁 Folder Structure

All development must strictly adhere to the following structure:

- `/src/app`: Next.js App Router. Contains pages, layouts, and API routes.
  - `/src/app/deep_research`: Main Deep Research application.
  - `/src/app/api/deep_research`: API routes for Deep Research.
- `/src/components`: React components.
  - `/src/components/ui`: Shadcn/ui atomic components.
  - `/src/components/deep_research`: Components for the Deep Research app.
- `/src/lib`: Shared utility instances and core SDK initializations.
  - `gemini.ts`: `@google/genai` client setup.
  - `supabase.ts`: `@supabase/supabase-js` client setup.
- `/src/hooks`: Custom React hooks (e.g., `useSupabaseRealtime`).
- `/src/types`: TypeScript definitions and Supabase table interfaces.
- `/supabase/migrations`: SQL migration files for version control and database schema management.
- `/docs`: Project documentation, reference APIs, and coding guidelines.

## 🛠 Tech Stack Conventions

### AI & SDKs
- **SDK:** Always use `@google/genai`. Never use legacy libraries.
- **Initialization:** Use `const ai = new GoogleGenAI({})` in `src/lib/gemini.ts`.
- **Models:**
  - `gemini-3-flash-preview` for general chat and UI updates.
  - `gemini-3-pro-preview` for complex reasoning.
  - `deep-research-pro-preview-12-2025` for the agentic research workflow.
- **Thinking:** Use `thinking_level: "high"` for complex document merges/edits.

### Database (Supabase)
- **Schema:** `deep_research` (Used to isolate this project from other tables in the `public` schema).
- **Table:** `research_sessions`
- **Migrations & Traceability:**
  - All database schema changes (DDL) MUST be recorded in `/supabase/migrations/`.
  - Even if SQL is applied manually in the Supabase Dashboard, it must be backported to a migration file to ensure the entire database build process is traceable and reproducible.
  - This includes `CREATE SCHEMA`, `CREATE TABLE`, `GRANT` permissions, and `ALTER PUBLICATION` for Realtime.
- **Realtime:** Always use Supabase Realtime for syncing the `report_markdown` and `chat_history` between the background research worker and the frontend.
- **Client:** Configured in `src/lib/supabase.ts` to use `deep_research` by default. Use the `anon` key for client-side subscriptions; never expose the `service_role` key.

### UI/UX
- **Styling:** Tailwind CSS + shadcn/ui.
- **Markdown:** Use `react-markdown` for rendering the living document.
- **Layout:** Maintain a split-panel view (Chat on left, Document on right).

## 🤖 Agent Behaviors
- **Code Generation:** All code generation and implementation tasks MUST strictly follow the guidelines in `Reference_Doc/codegen_instructions.md`.
- **Document Architect:** When editing the report, wrap updated sections in `<updated_report>` tags.
- **Safety:** Never hardcode API keys. Always use `process.env`.
- **Zero-Guessing:** If a model version or API parameter is unclear, check `Reference_Doc/codegen_instructions.md`.
