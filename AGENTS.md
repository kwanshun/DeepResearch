# Project Agents & Instructions

This file provides behavioral guidance and coding conventions for AI agents working on the **Iterative Research Agent** project.

## 📁 Development Context

For the physical folder structure, detailed tech stack, and authentication flow, refer to **`ARCHITECTURE.md`**. All changes must respect the architectural boundaries and physical layout defined there.

## 🛠 Development Conventions

All development must align with the architectural specifications in `ARCHITECTURE.md`. The following conventions must be followed by all agents and developers:

### AI & SDK Usage
- **SDK:** Always use `@google/genai` (v2.0+). Never use legacy libraries.
- **Models:**
  - Use `gemini-3-flash-preview` for general chat, UI updates, and most code generation.
  - Use `gemini-3-pro-preview` only for complex reasoning tasks.
  - Use `deep-research-pro-preview-12-2025` strictly for the agentic research interaction flow.
- **Thinking Level:** Use `thinking_level: "high"` for complex document merges or edits; use `low` for quick chat questions to minimize latency.

### Database & State Management
- **Supabase Clients:**
  - Use `src/lib/supabase.ts` for browser-side client components.
  - Use `src/lib/supabase-server.ts` for server-side components, API routes, or server actions.
- **Migrations:** All database schema changes (DDL) MUST be recorded in `/supabase/migrations/`. Even if SQL is applied manually via the Supabase Dashboard, it must be backported to a migration file to ensure traceability.
- **Realtime:** Always use Supabase Realtime for syncing `report_markdown` and `chat_history` between background processes and the frontend.

### UI/UX & Rendering
- **Markdown Hydration:** To prevent hydration errors, ensure no nested `<pre>` tags exist inside `<p>` tags during markdown rendering. Use `span` or `div` wrappers with `display: block` for custom code block components.
- **Layout:** Use the provided `ResizablePanelGroup`, `ResizablePanel`, and `ResizableHandle` components from `@/components/ui/resizable` for split-panel views.

## 🤖 Agent Behaviors
- **Code Generation:** Strictly follow guidelines in `Reference_Doc/codegen_instructions.md`.
- **Deep Research API:** For implementation details regarding the agentic research interaction (Interactions API), refer to **`Reference_Doc/Gemini_deep_research.md`**.
- **Document Architect Role:** When editing research reports, wrap the updated markdown sections in `<updated_report>` tags.
- **Safety Protocol:** NEVER hardcode API keys or secrets. Always use `process.env`.
- **Zero-Guessing:** If a model parameter, API version, or convention is unclear, consult the relevant files in `Reference_Doc/` before proceeding.
