import {describe, expect, it} from 'vitest';
import {normalizeReportRows} from './reporting';

describe('report relation normalization', () => {
  it('reads provider and reporter as many-to-one objects', () => {
    const [report] = normalizeReportRows([{
      id: 'r1', reason: 'safety', details: 'Test report details', status: 'open', created_at: '2026-08-07T00:00:00Z',
      providers: {slug: 'mariana-lopez', profiles: {display_name: 'Mariana López'}},
      profiles: {display_name: 'Lucía M.', telegram_user_id: 123}
    }]);
    expect(report.provider?.slug).toBe('mariana-lopez');
    expect(report.provider?.displayName).toBe('Mariana López');
    expect(report.reporter?.displayName).toBe('Lucía M.');
    expect(report.reporter?.telegramUserId).toBe(123);
  });
});
