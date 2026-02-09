// Project Types
export type TaskStatus = 'recurring' | 'backlog' | 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
  storageName?: string;
  source?: 'upload' | 'docs';
  documentId?: string;
}

export interface TaskComment {
  id: string;
  authorName: string;
  authorId?: string;
  content: string;
  createdAt: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  developerIds: string[];
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  developerIds?: string[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  recurring: boolean;
  priority: TaskPriority;
  assignedDeveloperId?: string;
  linkedDocumentIds: string[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  recurring?: boolean;
  priority?: TaskPriority;
  assignedDeveloperId?: string;
  linkedDocumentIds?: string[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
}

// Developer Types
export interface Developer {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  color: string;
  role?: string;
  projectIds: string[];
  createdAt: string;
}

export interface CreateDeveloperInput {
  name: string;
  description?: string;
  role?: string;
  color?: string;
}

// Document Types
export interface Document {
  id: string;
  slug: string;
  title: string;
  content: string;
  folderId: string | null;
  linkedTaskIds: string[];
  linkedProjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  content?: string;
  folderId?: string | null;
}

export interface Folder {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: string;
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
}

export interface FolderIndex {
  folders: Folder[];
  rootFolderIds: string[];
}

// Memory Types
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface DayConversation {
  date: string;
  messages: ConversationMessage[];
  summary?: string;
}

export interface MemoryFavorites {
  dates: string[];
}

// Scheduled Tasks
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  time: string;
  dayOfWeek: DayOfWeek;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledTaskInput {
  title: string;
  description?: string;
  time: string;
  dayOfWeek: DayOfWeek;
  color: string;
}

// UI Types
export interface NavItem {
  label: string;
  href: string;
  icon: string;
}
