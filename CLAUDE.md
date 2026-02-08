# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture Overview

Endur is a local-first productivity app built with Next.js 16 (App Router), TypeScript, and Tailwind CSS v4. It has three main modules:

1. **Projects** - Kanban board with drag-and-drop (dnd-kit)
2. **Docs** - Markdown editor with folder hierarchy
3. **Memory** - Read-only bot conversation viewer

### Data Flow

All data is stored locally in `/data` as `.md` and `.json` files. The app uses Next.js API routes to perform file system operations:

```
Browser → fetch() → /app/api/* routes → /lib/storage/* utilities → /data/* files
```

### Key Directories

- `/app/(dashboard)/` - Main app pages (projects, docs, people, memory)
- `/app/api/` - API routes for CRUD operations
- `/lib/storage/` - File system utilities (projects-storage.ts, tasks-storage.ts, etc.)
- `/components/ui/` - Reusable UI primitives (Button, Modal, Input, etc.)
- `/components/layout/` - Navbar, Sidebar, Logo
- `/components/projects/` - Kanban components (KanbanColumn, TaskCard)
- `/types/index.ts` - All TypeScript interfaces

### Data Storage Structure

```
/data/
├── projects/[slug]/project.json + tasks/[id].md
├── developers/developers.json
├── documents/index.json + [slug].md
└── memory/[YYYY]/[MM]/[DD].md
```

Tasks and documents use YAML frontmatter in markdown files (parsed with `gray-matter`).

### Styling

Uses CSS custom properties defined in `/app/globals.css` (dark theme only). Access via `var(--bg-primary)`, `var(--text-secondary)`, etc. Use the `cn()` utility from `/lib/utils/cn.ts` for conditional class merging.
