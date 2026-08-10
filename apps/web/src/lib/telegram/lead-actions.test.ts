import {describe, expect, it} from 'vitest';
import {actorForLeadAction, isMiniAppLeadAction} from './lead-actions';

describe('Mini App lead action policy', () => {
  it('does not allow a customer to impersonate a provider', () => {
    expect(actorForLeadAction('provider_replied', true, false)).toBeNull();
    expect(actorForLeadAction('provider_opened', true, false)).toBeNull();
  });
  it('allows only the owning participant action set', () => {
    expect(actorForLeadAction('cancelled', true, false)).toBe('customer');
    expect(actorForLeadAction('customer_replied', false, true)).toBeNull();
    expect(actorForLeadAction('completed', false, true)).toBe('provider');
  });
  it('has a closed action vocabulary', () => {
    expect(isMiniAppLeadAction('completed')).toBe(true);
    expect(isMiniAppLeadAction('set_status')).toBe(false);
  });
});
