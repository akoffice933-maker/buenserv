import {describe, expect, it} from 'vitest';
import {buildNotificationPayload} from './deliver-outbox';

describe('deliver outbox copy', () => {
  it('uses provider-specific copy for provider notifications', () => {
    const payload = buildNotificationPayload('provider_customer_reply');
    expect(payload.text).toContain('El cliente respondió');
    expect(payload.reply_markup.inline_keyboard[0][0].web_app?.url).toContain('/mini-app');
  });

  it('uses the provider reply copy for customer notifications', () => {
    const payload = buildNotificationPayload('customer_provider_reply');
    expect(payload.text).toContain('Un prestador respondió');
  });

  it('uses completion-specific copy for provider_service_completed', () => {
    const payload = buildNotificationPayload('customer_provider_completed');
    expect(payload.text).toContain('marcó el servicio como realizado');
  });

  it('uses completion-specific copy for customer_completion_confirmed', () => {
    const payload = buildNotificationPayload('provider_customer_confirmed');
    expect(payload.text).toContain('confirmó que el servicio fue realizado');
  });
});
