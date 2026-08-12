import {describe, expect, it, vi, beforeEach} from 'vitest';
import {POST} from './route';
import {createAdminClient} from '@/lib/supabase/admin';
import {resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

vi.mock('@/lib/telegram/mini-app-auth', () => ({
  getMiniAppInitData: () => 'test-init-data',
  resolveMiniAppIdentity: vi.fn()
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn()
}));

const createAdminClientMock = vi.mocked(createAdminClient);
const resolveMiniAppIdentityMock = vi.mocked(resolveMiniAppIdentity);

function buildSupabaseMock(lead: any) {
  const leadQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({data: lead, error: null})
  };

  const rpc = vi.fn().mockResolvedValue({data: 'message-id', error: null});
  const supabase = {
    from: vi.fn(() => leadQuery),
    rpc
  };

  createAdminClientMock.mockReturnValue(supabase as any);
  return {leadQuery, rpc, supabase};
}

describe('Mini App lead message route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the owning provider to send a lead message', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'provider-1', telegramUser: {id: 123}} as any);
    const {rpc} = buildSupabaseMock({
      id: 'lead-1',
      customer_profile_id: 'customer-1',
      status: 'contacted',
      providers: {profile_id: 'provider-1'}
    });

    const response = await POST(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000001/message', {
      method: 'POST',
      headers: {'x-telegram-init-data': 'test-init-data', 'content-type': 'application/json'},
      body: JSON.stringify({body: 'Hola, ya te respondo', idempotencyKey: '00000000-0000-0000-0000-000000000111'})
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000001'})} as any);

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('send_lead_message', expect.objectContaining({
      p_lead_id: 'lead-1',
      p_actor_profile_id: 'provider-1',
      p_body: 'Hola, ya te respondo',
      p_external_source: 'mini_app_message'
    }));
  });

  it('rejects a non-participant', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'other-profile', telegramUser: {id: 123}} as any);
    buildSupabaseMock({
      id: 'lead-2',
      customer_profile_id: 'customer-1',
      status: 'contacted',
      providers: {profile_id: 'provider-1'}
    });

    const response = await POST(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000002/message', {
      method: 'POST',
      headers: {'x-telegram-init-data': 'test-init-data', 'content-type': 'application/json'},
      body: JSON.stringify({body: 'Nope', idempotencyKey: '00000000-0000-0000-0000-000000000222'})
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000002'})} as any);

    expect(response.status).toBe(403);
  });

  it('rejects empty or whitespace-only messages', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'provider-1', telegramUser: {id: 123}} as any);
    buildSupabaseMock({
      id: 'lead-3',
      customer_profile_id: 'customer-1',
      status: 'contacted',
      providers: {profile_id: 'provider-1'}
    });

    const response = await POST(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000003/message', {
      method: 'POST',
      headers: {'x-telegram-init-data': 'test-init-data', 'content-type': 'application/json'},
      body: JSON.stringify({body: '   ', idempotencyKey: '00000000-0000-0000-0000-000000000333'})
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000003'})} as any);

    expect(response.status).toBe(400);
  });

  it('maps closed-lead RPC errors to a conflict response', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'provider-1', telegramUser: {id: 123}} as any);
    const {rpc} = buildSupabaseMock({
      id: 'lead-4',
      customer_profile_id: 'customer-1',
      status: 'cancelled',
      providers: {profile_id: 'provider-1'}
    });
    rpc.mockResolvedValueOnce({data: null, error: {message: 'lead_closed'}});

    const response = await POST(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000004/message', {
      method: 'POST',
      headers: {'x-telegram-init-data': 'test-init-data', 'content-type': 'application/json'},
      body: JSON.stringify({body: 'Already closed', idempotencyKey: '00000000-0000-0000-0000-000000000444'})
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000004'})} as any);

    expect(response.status).toBe(409);
  });

  it('rejects bodies longer than 2000 characters before hitting the RPC', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'provider-1', telegramUser: {id: 123}} as any);
    buildSupabaseMock({
      id: 'lead-5',
      customer_profile_id: 'customer-1',
      status: 'contacted',
      providers: {profile_id: 'provider-1'}
    });

    const response = await POST(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000005/message', {
      method: 'POST',
      headers: {'x-telegram-init-data': 'test-init-data', 'content-type': 'application/json'},
      body: JSON.stringify({body: 'x'.repeat(2001), idempotencyKey: '00000000-0000-0000-0000-000000000555'})
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000005'})} as any);

    expect(response.status).toBe(400);
  });
});
