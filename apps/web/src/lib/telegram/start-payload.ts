export function startPayload(text?: string) {
  return text?.trim().match(/^\/start(?:\s+([^\s]+))?$/i)?.[1] ?? null;
}

export function startsProviderOnboarding(text?: string) {
  return /^\/(start\s+provider|provider)\b/i.test(text?.trim() ?? '');
}

export function reportProviderId(text?: string) {
  const match = text?.trim().match(/^\/start\s+report_([0-9a-f-]{36})$/i);
  return match?.[1] ?? null;
}

export function performerProviderId(text?: string) {
  const match = text?.trim().match(/^\/start\s+performer_([0-9a-f-]{36})$/i);
  return match?.[1] ?? null;
}

export function startsSupport(text?: string) {
  return /^\/start\s+support$/i.test(text?.trim() ?? '');
}
