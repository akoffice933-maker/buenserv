import {describe, expect, it} from 'vitest';
import {reportProviderId, startPayload, startsProviderOnboarding, startsSupport} from './start-payload';

const id = '550e8400-e29b-41d4-a716-446655440000';

describe('Telegram start payload parsing', () => {
  it('extracts valid start payloads without accepting arbitrary text', () => {
    expect(startPayload('/start provider')).toBe('provider');
    expect(startPayload('/start report_abc')).toBe('report_abc');
    expect(startPayload('/start')).toBeNull();
    expect(startPayload('hello /start provider')).toBeNull();
  });

  it('recognizes supported product flows', () => {
    expect(startsProviderOnboarding('/start provider')).toBe(true);
    expect(startsProviderOnboarding('/provider')).toBe(true);
    expect(startsSupport('/start support')).toBe(true);
    expect(reportProviderId(`/start report_${id}`)).toBe(id);
    expect(reportProviderId('/start report_invalid')).toBeNull();
  });
});
