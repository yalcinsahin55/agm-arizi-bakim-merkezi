export type Role = 'yonetici' | 'teknisyen' | 'operator' | 'goruntuleyici';
export type BreakdownStatus = 'acik' | 'atandi' | 'devam_ediyor' | 'onay_bekliyor' | 'revizyon' | 'onaylandi' | 'iptal';
export type Priority = 'kritik' | 'yuksek' | 'orta' | 'dusuk';
export type BreakdownPart = string;
export interface User {
    _id: string;
    name: string;
    email: string;
    role: Role;
    active: boolean;
}
export interface Motor {
    _id: string;
    name: string;
    active: boolean;
    hours?: number;
    load?: number;
    [key: string]: unknown;
}
export interface Category {
    _id: string;
    name: string;
    active: boolean;
    parentId?: string | null;
}
export interface Breakdown {
    _id: string;
    code: string;
    motorId: string;
    motorName: string;
    categoryId: string;
    categoryName: string;
    subcategoryId?: string;
    subcategoryName?: string;
    priority: Priority;
    title: string;
    description: string;
    status: BreakdownStatus;
    createdBy: string;
    createdByName: string;
    assignedTechnicianId?: string;
    assignedTechnicianName?: string;
    motorHours?: number | null;
    downtimeStartedAt?: string | null;
    assignedAt?: string | null;
    seenAt?: string | null;
    acknowledgedAt?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    submittedAt?: string | null;
    closedAt?: string | null;
    cancelledAt?: string | null;
    cancelledBy?: string | null;
    archivedAt?: string | null;
    archivedBy?: string | null;
    archived?: boolean;
    revisionNote?: string;
    report?: string;
    rootCause?: string;
    correctiveAction?: string;
    parts?: BreakdownPart[];
    materials?: BreakdownPart[];
    createdAt: string;
    updatedAt?: string;
    escalationLevel?: number;
}
export interface BreakdownEvent {
    _id?: string;
    eventId: string;
    breakdownId: string;
    type: string;
    actorId: string;
    actorName: string;
    note?: string;
    technicianId?: string;
    technicianName?: string;
    previousTechnicianId?: string | null;
    fieldChanges?: Record<string, {
        from: unknown;
        to: unknown;
    }>;
    createdAt: string;
}
export interface Notification {
    _id: string;
    recipientId: string;
    breakdownId?: string;
    eventId: string;
    title: string;
    body: string;
    href?: string;
    status: 'unread' | 'seen';
    createdAt: string;
    seenAt?: string;
}
export interface Attachment {
    _id: string;
    breakdownId: string;
    fileName: string;
    contentType: string;
    size: number;
    url: string;
    pathname?: string;
    uploadedBy: string;
    uploadedByName: string;
    createdAt: string;
}

