# OpenClaw Mission Control

Local-first mission dashboard for teams operating an OpenClaw bot.

## Overview

OpenClaw Mission Control centralizes project execution, bot memory, documentation, people, and recurring operations in a single workspace.  
It is designed for fast local workflows with file-based persistence, so you can run everything without external databases.

## Core Capabilities

- Multi-project command center with project cards and metadata.
- Kanban execution board per project with drag-and-drop, status lanes, and ordering.
- Recurring lane support (`recurring`) for tasks that are part of ongoing bot operations.
- Task detail workflows: priority, assignee, comments, timeline metadata, and file attachments.
- Team directory (`People`) with create/edit/delete and assignment-ready developer profiles.
- Documentation hub with:
  - Nested folders
  - Drag-and-drop move for folders/documents
  - Markdown import/export
  - Rich editing (Tiptap) with autosave
  - Dedicated editor page with edit/preview modes
- Bot memory workspace with:
  - Calendar-based navigation
  - Conversation search
  - Favorite dates
  - Message timeline rendering from Markdown logs
- Scheduled operations dashboard:
  - Weekly and Today views
  - “Next up” behavior derived from day/time
  - CRUD for recurring routine blocks
- Global cross-module search (`Cmd/Ctrl + K`) across Projects, Tasks, Docs, People, and Memory.
- In-project task quick search (`/`) for fast drill-down.
- Top navigation context chips (AI model, Madrid date/time, gateway status placeholder) prepared for production wiring.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- dnd-kit (drag and drop)
- Tiptap + Markdown tooling (`marked`, `turndown`, `react-markdown`)
- Local file-system storage (`.json` + `.md`)
- Vitest + Testing Library
- Cypress (E2E)

## Architecture

The app is local-first and file-backed:

- API routes in `app/api/**` expose CRUD/search operations.
- Storage adapters in `lib/storage/**` read/write local files.
- UI routes in `app/(dashboard)/**` consume APIs with client-side fetch patterns.
- Shared domain contracts are defined in `types/index.ts`.

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm

### Install

```bash
git clone https://github.com/ivanurra/openclaw_mission_control.git
cd openclaw_mission_control
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build production bundle
- `npm run start`: Run production server
- `npm run lint`: Run ESLint
- `npm run test`: Run Vitest test suite
- `npm run test:watch`: Run Vitest in watch mode
- `npm run cy:open`: Open Cypress UI
- `npm run cy:run`: Run Cypress headless
- `npm run e2e`: Start app + run Cypress
- `npm run test:all`: Run unit + E2E suites

## Configuration

### Data Directory Override

By default, data is stored under `./data`.  
You can override this with:

```bash
ENDUR_DATA_DIR=/absolute/path/to/data
```

This is useful for testing and isolated environments.

## Data Layout

```text
data/
├── developers/
│   └── developers.json
├── documents/
│   ├── index.json
│   └── *.md
├── memory/
│   ├── favorites.json
│   └── YYYY/MM/DD.md
├── projects/
│   └── <project-slug>/
│       ├── project.json
│       ├── tasks/
│       │   └── <task-id>.md
│       └── attachments/
│           └── <task-id>/*
└── scheduled/
    └── tasks.json
```

## Memory Log Format (Markdown)

Conversation files are parsed from headings with this pattern:

```markdown
## 09:41 - User
Message body

## 09:42 - OpenClaw Bot
Response body
```

Supported assistant role keywords include `assistant`, `bot`, and `clowdbot`.

## API Surface (High Level)

- `GET/POST /api/projects`
- `GET/PUT/DELETE /api/projects/[projectId]`
- `GET/POST/PATCH /api/projects/[projectId]/tasks`
- `GET/PUT/DELETE /api/projects/[projectId]/tasks/[taskId]`
- `POST /api/projects/[projectId]/tasks/[taskId]/attachments`
- `GET/DELETE /api/projects/[projectId]/tasks/[taskId]/attachments/[attachmentId]`
- `GET/POST /api/developers`
- `GET/PUT/DELETE /api/developers/[developerId]`
- `GET/POST /api/documents`
- `GET/PUT/DELETE /api/documents/[docId]`
- `GET/POST /api/folders`
- `GET/PUT/DELETE /api/folders/[folderId]`
- `GET /api/memory`
- `GET /api/memory/search`
- `GET/POST /api/memory/favorites`
- `GET/POST /api/scheduled`
- `GET/PUT/DELETE /api/scheduled/[taskId]`
- `GET /api/search` (global search endpoint)

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open global search
- `/`: Open in-project task search
- `Cmd/Ctrl + S`: Save in document editors
- `Esc`: Close modals/search overlays

## Production Integration Notes

- Navbar AI model and gateway status are currently mocked for UX scaffolding.
- Gateway health can be wired to your OpenClaw runtime/gateway heartbeat endpoint.
- Model label can be wired to your active provider/model resolution logic.

## License

MIT
