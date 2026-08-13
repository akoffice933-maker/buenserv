import {describe, expect, it} from 'vitest';
import {actorForLeadAction, isMiniAppLeadAction} from './lead-actions';

describe('Mini App lead action policy', () => {
  it('does not allow a customer to impersonate a provider', () => {
    expect(actorForLeadAction('provider_replied', true, false)).toBeNull();
    expect(actorForLeadAction('provider_opened', true, false)).toBeNull();
    expect(actorForLeadAction('provider_service_completed', true, false)).toBeNull();
  });
  it('allows only the owning participant action set', () => {
    expect(actorForLeadAction('cancelled', true, false)).toBe('customer');
    expect(actorForLeadAction('customer_replied', false, true)).toBeNull();
    expect(actorForLeadAction('customer_completion_confirmed', false, true)).toBeNull();
    expect(actorForLeadAction('provider_service_completed', false, true)).toBe('provider');
    expect(actorForLeadAction('customer_completion_confirmed', true, false)).toBe('customer');
  });
  it('has a closed action vocabulary', () => {
    expect(isMiniAppLeadAction('provider_service_completed')).toBe(true);
    expect(isMiniAppLeadAction('customer_completion_confirmed')).toBe(true);
    expect(isMiniAppLeadAction('set_status')).toBe(false);
  });
});
