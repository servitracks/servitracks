<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:supabase-management-rules -->
# Supabase Management Rules

- **Database Restrictions**: You are strictly PROHIBITED from creating new tables or columns in the Supabase database without explicit user confirmation.
- **Project Connection**:
  - For new projects, you MUST request the user's access token to link the project.
  - Before starting any work related to Supabase, you MUST ask for user authorization.
  - You MUST list the currently connected Supabase projects before performing any operations.
<!-- END:supabase-management-rules -->
