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
    phoneNumber?: string;
    whatsappEnabled?: boolean;
}
export interface Motor {
    _id: string;
    name: string;
    active: boolean;
    hours?: number;
    load?: number;
    [key: string]: unknown;
    currentHours?: number;
    currentLoad?: number;
    oil?: { brand?: string; changeHour?: number; maxHours?: number };
    sourceUpdateDate?: string;
    maintenanceSnapshot?: Array<{ key: string; label: string; lastHour: number; period: number }>;
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
    pushStatus?: string;
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


export interface ReportStats {
  total: number;
  critical: number;
  closed: number;
  waiting: number;
  active: number;
  avgMttr: number | null;
  avgResponse: number | null;
  avgIntervention: number | null;
}

export interface ReportGroup {
  id?: string;
  name: string;
  count: number;
}

export interface PredictiveReport extends ReportGroup {
  recent90Days: number;
  observedHours: number | null;
  breakdownsPerHour: number | null;
  averageHoursPerBreakdown: number | null;
  riskScore: number;
  riskLabel: 'yüksek' | 'orta' | 'düşük';
}

export interface ReportRow extends Record<string, unknown> {
  _id: string;
  createdAt: string | Date;
  code?: string;
  motorName?: string;
  categoryName?: string;
  subcategoryName?: string;
  priority?: Priority;
  title?: string;
  status?: BreakdownStatus;
  assignedTechnicianName?: string;
  seenAt?: string | Date | null;
  startedAt?: string | Date | null;
  submittedAt?: string | Date | null;
  closedAt?: string | Date | null;
}

export interface ReportPayload {
  stats: ReportStats;
  monthly: ReportGroup[];
  priority: ReportGroup[];
  rootCauses: ReportGroup[];
  byMotor: ReportGroup[];
  byCategory: ReportGroup[];
  byTechnician: ReportGroup[];
  predictive: PredictiveReport[];
  rows: ReportRow[];
}
