export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'admin' | 'member';
    createdAt: any; // Firestore Timestamp
    lastLogin: any; // Firestore Timestamp
}

export interface Client {
    id: string;
    name: string;
    createdAt: any;
    createdBy: string;
    updatedAt: any;
}

export interface Project {
    id: string;
    name: string;
    clientId: string;
    boxFolderId?: string;
    description?: string;
    statuses?: ProjectStatus[]; // Columns
    swimlanes?: Swimlane[];     // Rows
    createdAt: any;
    createdBy: string;
    updatedAt: any;
}


// Columns (formerly Swimlane)
export interface ProjectStatus {
    id: string;
    projectId: string; // Parent Project ID
    title: string;
    order: number;
    color?: string;
}

// Rows (New)
export interface Swimlane {
    id: string;
    projectId: string;
    title: string;
    order: number;
    color?: string; // Row header color
}

export interface Ticket {
    id: string;
    title: string;
    description: string;
    projectId: string;
    swimlaneId: string;
    statusId: string;
    assigneeId?: string | null; // Legacy single assignee (keeping for backward compatibility)
    assigneeIds?: string[]; // New: Multiple assignees
    dueDate?: any; // Firestore Timestamp or Date
    order: number;
    boxFolderId?: string;
    attachments?: Attachment[];
    comments?: Comment[];
    createdAt: any;
    createdBy: string;
    updatedAt: any;
}

export interface Comment {
    id: string;
    content: string;
    userId: string;
    createdAt: any;
}

export interface Attachment {
    id: string;
    name: string;
    type: 'link' | 'image' | 'video' | 'audio' | 'document' | 'other';
    url?: string;
    boxFileId?: string;
    boxSharedLink?: string;
    uploadedAt: any;
    uploadedBy: string;
}
