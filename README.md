# Endur

A local-first productivity application for project management, documentation, and team collaboration. Named after the legendary ship Endurance.

![Endur_Mac](Endur_Mockup.png)

## Features

### Project Management (Kanban)
- **Kanban boards** with drag-and-drop functionality
- Four columns: Backlog, To Do, In Progress, Done
- Task prioritization (Low, Medium, High, Urgent)
- Developer assignment
- Multiple projects support
- Filter by priority and team member

### Documents
- **Markdown editor** with live preview
- Folder hierarchy with unlimited nesting
- Create, edit, and delete documents
- Import `.md` files
- Link documents to tasks and projects
- Full markdown support (GFM)

### Bot Memory (ClowdBot Integration)
- **Read-only conversation viewer** for ClowdBot
- Calendar-based navigation
- Keyword search across all conversations
- Mark dates as favorites
- Conversations stored as `.md` files

### Team Management
- Add and manage team members
- Assign developers to projects and tasks
- Color-coded avatars

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Drag & Drop:** dnd-kit
- **Markdown:** react-md-editor, react-markdown
- **Data Fetching:** SWR pattern with fetch
- **Storage:** Local file system (`.md` and `.json` files)

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd endur_projects
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Project Managers

This application is designed for **local use**. The person who runs the application has full control and acts as the project manager. They can:

- Create and manage projects
- Add team members (developers)
- Assign tasks to developers
- Create and organize documentation

### Data Storage

All data is stored locally in the `/data` directory:

```
data/
├── projects/           # Project folders with tasks
│   └── [project-slug]/
│       ├── project.json
│       └── tasks/
│           └── [task-id].md
├── developers/
│   └── developers.json
├── documents/
│   ├── index.json      # Folder structure
│   └── [document].md
└── memory/
    ├── favorites.json
    └── [YYYY]/[MM]/[DD].md
```

### Bot Memory Setup

To add ClowdBot conversations:

1. Create the date-based folder structure: `data/memory/YYYY/MM/`
2. Create a markdown file named `DD.md` (e.g., `01.md` for the 1st)
3. Use this format:

```markdown
---
date: "2026-02-01"
messageCount: 4
---

## 09:00 - User
Your message here

## 09:01 - ClowdBot
Bot response here
```

## Project Structure

```
├── app/
│   ├── (dashboard)/    # Main app routes
│   │   ├── projects/   # Project management
│   │   ├── docs/       # Document editor
│   │   ├── people/     # Team management
│   │   └── memory/     # Bot conversations
│   └── api/            # API routes
├── components/
│   ├── ui/             # Reusable UI components
│   ├── layout/         # Layout components
│   └── projects/       # Kanban components
├── lib/
│   ├── storage/        # File system operations
│   ├── utils/          # Utility functions
│   └── constants/      # App constants
├── types/              # TypeScript definitions
└── data/               # Local data storage
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Keyboard Shortcuts

- `Cmd/Ctrl + S` - Save document (in editor)
- `Escape` - Close modals

## Design

- Dark mode only
- Clean, minimal interface inspired by Linear and Obsidian
- Responsive design (desktop-first, mobile-compatible)

## License

MIT

## Acknowledgments

- Named after Sir Ernest Shackleton's ship Endurance
- Built with Next.js by Vercel
