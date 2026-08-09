export type AttributionMetric = {payload: string; count: number};

export function aggregatePayloads(rows: Array<{payload: string}>): AttributionMetric[] {
  const counts = new Map<string, number>();
  rows.forEach(({payload}) => counts.set(payload, (counts.get(payload) ?? 0) + 1));
  return [...counts.entries()].map(([payload, count]) => ({payload, count})).sort((a, b) => b.count - a.count);
}
