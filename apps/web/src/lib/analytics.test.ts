import {describe, expect, it} from 'vitest';
import {aggregatePayloads} from './analytics';

describe('Telegram attribution aggregation', () => {
  it('counts and sorts deep-link payloads', () => {
    expect(aggregatePayloads([{payload: 'provider'}, {payload: 'support'}, {payload: 'provider'}])).toEqual([{payload: 'provider', count: 2}, {payload: 'support', count: 1}]);
  });
});
