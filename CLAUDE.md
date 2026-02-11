# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run Vitest unit tests (single run)
npm run test:watch # Run Vitest in watch mode
npm run e2e        # Run Cypress E2E tests (headless, uses .cypress-data)
npm run e2e:open   # Open Cypress UI for interactive E2E testing
npm run test:all   # Run unit + E2E tests

# Run a single test file
npx vitest run tests/components/navbar.test.tsx

# Run tests matching a name pattern
npx vitest run -t "renders navbar"
```

## Architecture Overview

Mission Control is a local-first productivity app built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4. It has five main modules:

1. **Projects** - Kanban board with drag-and-drop (dnd-kit), task cards with markdown descriptions and file attachments linked to Docs
2. **Docs** - Markdown editor (`@uiw/react-md-editor`) with folder hierarchy, document CRUD, and sidebar navigation
3. **People (Crew)** - Team member profiles and management
4. **Memory** - Read-only bot conversation viewer organized by date
5. **Scheduled** - Scheduled tasks with date widget, edit/delete modals

### Conventions

- **Path alias**: Use `@/` for imports from project root (e.g., `import { cn } from '@/lib/utils/cn'`).
- **Data directory**: Defaults to `./data`. Override with `MC_DATA_DIR` env var (used by E2E tests with `.cypress-data`).
- **Kanban statuses**: `recurring`, `backlog`, `todo`, `in_progress`, `done` (defined in `types/index.ts` and `lib/constants/kanban.ts`).
- **Task priorities**: `low`, `medium`, `high`, `urgent`.
- **Markdown files**: Tasks and documents use YAML frontmatter parsed with `gray-matter`. Storage helpers in `lib/storage/file-system.ts` handle read/write.
- **Memory logs**: Conversation files use `## HH:MM - RoleName` heading format, parsed into structured messages.

### Data Flow

All data is stored locally in `/data` as `.md` and `.json` files. The app uses Next.js API routes to perform file system operations:

```
Browser → fetch()/SWR → /app/api/* routes → /lib/storage/* utilities → /data/* files
```

### Key Directories

- `/app/(dashboard)/` - Main app pages (projects, docs, people, memory, scheduled)
- `/app/(dashboard)/docs/[docId]/` - Individual document editor page
- `/app/api/` - API routes: projects, documents, folders, members, memory, scheduled, search
- `/lib/storage/` - File system utilities:
  - `projects-storage.ts`, `tasks-storage.ts` - Projects & Kanban tasks
  - `documents-storage.ts` - Docs CRUD
  - `members-storage.ts` - Crew/people management
  - `memory-storage.ts` - Memory log reader
  - `scheduled-storage.ts` - Scheduled tasks
  - `file-system.ts` - Low-level FS helpers
- `/lib/constants/kanban.ts` - Kanban column definitions
- `/lib/utils/` - `cn.ts` (class merging), `date.ts` (date formatting), `id.ts` (ID generation)
- `/components/ui/` - Reusable UI primitives (Button, Modal, Input, Select, Textarea, Badge, Avatar, Skeleton, EmptyState)
- `/components/layout/` - Navbar, Sidebar, Logo, GlobalSearch, TaskSearch, MadridClock
- `/components/projects/` - KanbanColumn, TaskCard
- `/types/index.ts` - All TypeScript interfaces

### Data Storage Structure

```
/data/
├── projects/[slug]/project.json + tasks/[id].md
├── members/members.json
├── documents/index.json + [slug].md   (index.json holds folder tree & doc metadata)
└── memory/ (not persisted in /data, loaded from external path)
```

### Testing

- **Unit tests** (`/tests/`): Vitest + React Testing Library
  - `/tests/components/` - Component tests (navbar, pages, task-card, etc.)
  - `/tests/storage/` - Storage utility tests
- **E2E tests** (`/cypress/e2e/`): Cypress
  - `projects.cy.ts`, `docs.cy.ts`, `people.cy.ts`
  - E2E runs use isolated `.cypress-data` directory via `MC_DATA_DIR` env var

### Styling

Uses CSS custom properties defined in `/app/globals.css` (dark theme only). Access via `var(--bg-primary)`, `var(--text-secondary)`, etc. Use the `cn()` utility from `/lib/utils/cn.ts` for conditional class merging (clsx + tailwind-merge).
