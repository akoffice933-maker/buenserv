import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const migration030 = readFileSync(new URL('../../../../../supabase/migrations/030_lead_messages.sql', import.meta.url), 'utf8');
const migration031 = readFileSync(new URL('../../../../../supabase/migrations/031_lead_message_immutability.sql', import.meta.url), 'utf8');

describe('lead message SQL contract', () => {
  it('keeps message body out of lead event metadata', () => {
    expect(migration030).not.toContain("jsonb_build_object('message_body'");
  });

  it('uses a 2000 character ceiling in table and RPC', () => {
    expect(migration030).toContain("char_length(btrim(body)) > 0 and char_length(body) <= 2000");
    expect(migration030).toContain("char_length(v_body) > 2000");
  });

  it('makes lead_messages immutable at the database level', () => {
    expect(migration031).toContain('lead_messages are immutable');
    expect(migration031).toContain('before update or delete on public.lead_messages');
  });
});
