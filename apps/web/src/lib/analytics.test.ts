import {describe, expect, it} from 'vitest';
import {aggregatePayloads, attributionBucket} from './analytics';

const first = '550e8400-e29b-41d4-a716-446655440000';
const second = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('Telegram attribution aggregation', () => {
  it('counts and sorts stable payloads', () => {
    expect(aggregatePayloads([{payload: 'provider'}, {payload: 'support'}, {payload: 'provider'}])).toEqual([{payload: 'provider', count: 2}, {payload: 'support', count: 1}]);
  });

  it('groups report payloads across provider UUIDs', () => {
    expect(attributionBucket(`report_${first}`)).toBe('report');
    expect(aggregatePayloads([{payload: `report_${first}`}, {payload: `report_${second}`}, {payload: 'provider'}])).toEqual([{payload: 'report', count: 2}, {payload: 'provider', count: 1}]);
  });
});
