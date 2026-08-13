export const MINI_APP_LEAD_ACTIONS = ['provider_opened', 'provider_replied', 'customer_replied', 'provider_service_completed', 'customer_completion_confirmed', 'cancelled'] as const;
export type MiniAppLeadAction = (typeof MINI_APP_LEAD_ACTIONS)[number];
export type LeadActor = 'customer' | 'provider';

/** Client-visible actions are intentionally narrower than the lifecycle RPC. */
export function actorForLeadAction(action: MiniAppLeadAction, isCustomer: boolean, isProvider: boolean): LeadActor | null {
  if (action === 'cancelled' || action === 'customer_replied' || action === 'customer_completion_confirmed') return isCustomer ? 'customer' : null;
  if (action === 'provider_opened' || action === 'provider_replied' || action === 'provider_service_completed') return isProvider ? 'provider' : null;
  return isProvider ? 'provider' : isCustomer ? 'customer' : null;
}

export function isMiniAppLeadAction(value: unknown): value is MiniAppLeadAction {
  return typeof value === 'string' && (MINI_APP_LEAD_ACTIONS as readonly string[]).includes(value);
}
