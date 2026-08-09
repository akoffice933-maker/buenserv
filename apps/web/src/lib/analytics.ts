export type AttributionMetric = {payload: string; count: number};

export function attributionBucket(payload: string) {
  return payload.startsWith('report_') ? 'report' : payload;
}

export function aggregatePayloads(rows: Array<{payload: string}>): AttributionMetric[] {
  const counts = new Map<string, number>();
  rows.forEach(({payload}) => {
    const bucket = attributionBucket(payload);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });
  return [...counts.entries()].map(([payload, count]) => ({payload, count})).sort((a, b) => b.count - a.count);
}
