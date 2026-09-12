export type Role = 'yonetici' | 'teknisyen' | 'operator' | 'goruntuleyici';
export type BreakdownStatus = 'acik' | 'atandi' | 'devam_ediyor' | 'onay_bekliyor' | 'revizyon' | 'onaylandi' | 'iptal';
export type Priority = 'kritik' | 'yuksek' | 'orta' | 'dusuk';
export type BreakdownPart = string;
export type EquipmentType =
  | 'motor'
  | 'booster'
  | 'pompa'
  | 'kompresor'
  | 'jenerator'
  | 'alternator'
  | 'diger';
export type TechnicianType = 'elektromekanik' | 'normal';
export interface User {
    _id: string;
    name: string;
    email: string;
    role: Role;
    active: boolean;
    phoneNumber?: string;
    whatsappEnabled?: boolean;
    passwordHash?: string;
    /** Yalnızca role === 'teknisyen' için anlamlıdır; nöbet ataması bu alana göre yapılır. */
    technicianType?: TechnicianType;
    /**
     * Yalnızca teknisyenler için: nöbetçi olduğunda (evden yola çıkma vb.)
     * yol/ulaşma süresi nedeniyle yanıt/işe başlama süresi hesaplamalarına
     * dahil edilmeyecek dakika sayısı. Yönetici kullanıcı eklerken/düzenlerken belirler.
     */
    dutyTravelBufferMinutes?: number;
}
export interface Motor {
    _id: string;
    name: string;
    active: boolean;
    equipmentType?: EquipmentType;
    location?: string;
    description?: string;
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
    /**
     * Sadece ana (kök) kategorilerde anlamlıdır: gece nöbeti penceresinde
     * (20:00-06:00) bu kategoride açılan arızanın hangi tip nöbetçi
     * teknisyene otomatik gideceğini belirler. Alt kategoriler üst
     * kategorisinden miras alır. Belirtilmemişse 'normal' kabul edilir.
     */
    nightRouteType?: TechnicianType;
}
export interface DutyWeekEntry {
    id: string;
    name: string;
}
export interface DutyWeek {
    weekStart: string;
    elektromekanik: DutyWeekEntry | null;
    normal: DutyWeekEntry | null;
}
export interface Breakdown {
    _id: string;
    code: string;
    motorId: string;
    motorName: string;
    equipmentType?: EquipmentType;
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
    /** Arıza mesai dışı (hafta içi 20:00-06:00, veya Cmt/Paz tamamı) mı açıldı. */
    openedOffHours?: boolean;
    /**
     * Mesai dışı açılırken arızayı açan kişinin işaretlediği "kritik, üretim
     * kaybı yaşanabilir" seçeneği. true ise nöbetçi teknisyene anında
     * otomatik atama denenir; false/undefined ise kayıt yönetici gündüz
     * manuel atayana kadar bekler.
     */
    criticalDispatch?: boolean;
    /**
     * Otomatik nöbet ataması yapıldıysa, atanan teknisyenin o andaki
     * dutyTravelBufferMinutes değerinin anlık görüntüsü. Yanıt/işe başlama
     * süresi hesaplamalarında bu kadar dakika mahsup edilir.
     */
    assignedTravelBufferMinutes?: number;
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


export interface ReportTiming {
  count: number;
  avgMttr: number | null;
  avgResponse: number | null;
  avgIntervention: number | null;
}
export interface ReportStats {
  total: number;
  critical: number;
  closed: number;
  waiting: number;
  active: number;
  /** Normal mesai saatlerinde açılan kayıtlara göre (mesai dışı hariç). */
  avgMttr: number | null;
  avgResponse: number | null;
  avgIntervention: number | null;
  /** Mesai dışı (hafta içi 20:00-06:00 veya Cmt/Paz) açılıp nöbetçiye giden kayıtlar; ulaşım süresi mahsup edilmiştir. */
  offHours: ReportTiming;
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
  openedOffHours?: boolean;
  assignedTravelBufferMinutes?: number;
}

export interface CategorySla extends ReportGroup {
  avgResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export interface ReportPayload {
  stats: ReportStats;
  monthly: ReportGroup[];
  priority: ReportGroup[];
  rootCauses: ReportGroup[];
  byMotor: ReportGroup[];
  byCategory: ReportGroup[];
  categorySla: CategorySla[];
  byTechnician: ReportGroup[];
  predictive: PredictiveReport[];
  rows: ReportRow[];
}
