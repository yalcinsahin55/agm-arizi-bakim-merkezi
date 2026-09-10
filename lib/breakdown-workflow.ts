import type { BreakdownStatus, Role } from '@/types';

export type TechnicianAction = 'seen' | 'accept' | 'start' | 'submit';
export type ManagerAction = 'approve' | 'revision';
export type BreakdownAction = TechnicianAction | ManagerAction;

const technicianStates: Record<TechnicianAction, BreakdownStatus[]> = {
  seen: ['atandi', 'revizyon'],
  accept: ['atandi', 'revizyon'],
  start: ['atandi', 'revizyon'],
  submit: ['devam_ediyor'],
};

const managerStates: Record<ManagerAction, BreakdownStatus[]> = {
  approve: ['onay_bekliyor'],
  revision: ['onay_bekliyor'],
};

export function isTechnicianAction(action: BreakdownAction): action is TechnicianAction {
  return action in technicianStates;
}

export function isManagerAction(action: BreakdownAction): action is ManagerAction {
  return action in managerStates;
}

export function canPerformBreakdownAction(
  action: BreakdownAction,
  role: Role,
  breakdown: Pick<
    {
      status: BreakdownStatus;
      assignedTechnicianId?: string;
      archived?: boolean;
    },
    'status' | 'assignedTechnicianId' | 'archived'
  >,
  userId: string,
): boolean {
  if (breakdown.archived) return false;
  if (isManagerAction(action)) {
    return role === 'yonetici' && managerStates[action].includes(breakdown.status);
  }
  return (
    role === 'teknisyen' &&
    breakdown.assignedTechnicianId === userId &&
    technicianStates[action].includes(breakdown.status)
  );
}

export function isActionAllowedForStatus(
  action: BreakdownAction,
  status: BreakdownStatus,
): boolean {
  const states = isManagerAction(action) ? managerStates[action] : technicianStates[action];
  return states.includes(status);
}

export const ACTIVE_BREAKDOWN_STATUSES: BreakdownStatus[] = [
  'acik',
  'atandi',
  'devam_ediyor',
  'revizyon',
];

export const TERMINAL_BREAKDOWN_STATUSES: BreakdownStatus[] = ['onaylandi', 'iptal'];
