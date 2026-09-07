export type Role='yonetici'|'teknisyen'|'operator'|'goruntuleyici';
export type BreakdownStatus='acik'|'atandi'|'devam_ediyor'|'onay_bekliyor'|'revizyon'|'onaylandi'|'iptal';
export type Priority='kritik'|'yuksek'|'orta'|'dusuk';
export interface User{_id:string;name:string;email:string;role:Role;active:boolean}
export interface Breakdown{_id:string;code:string;motorId:string;motorName:string;categoryId:string;categoryName:string;subcategoryId?:string;subcategoryName?:string;priority:Priority;title:string;description:string;status:BreakdownStatus;createdBy:string;createdByName:string;assignedTechnicianId?:string;assignedTechnicianName?:string;createdAt:string;seenAt?:string;acknowledgedAt?:string;startedAt?:string;completedAt?:string;submittedAt?:string;closedAt?:string}
