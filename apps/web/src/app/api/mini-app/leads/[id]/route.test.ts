import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {GET} from './route';
import {POST} from './action/route';
import {createAdminClient} from '@/lib/supabase/admin';
import {resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

vi.mock('@/lib/telegram/mini-app-auth', () => ({
  getMiniAppInitData: () => 'test-init-data',
  resolveMiniAppIdentity: vi.fn()
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn()
}));

vi.mock('@/lib/telegram/lead-actions', () => ({
  actorForLeadAction: vi.fn(() => 'provider'),
  isMiniAppLeadAction: vi.fn(() => true)
}));

const createAdminClientMock = vi.mocked(createAdminClient);
const resolveMiniAppIdentityMock = vi.mocked(resolveMiniAppIdentity);

function buildSupabaseMock(lead: any, events: any[], messages: any[] = []) {
  const leadQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({data: lead, error: null})
  };

  const eventsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({data: events, error: null})
  };

  const messagesQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({data: messages, error: null})
  };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'leads') return leadQuery;
      if (table === 'lead_events') return eventsQuery;
      if (table === 'lead_messages') return messagesQuery;
      return leadQuery;
    }),
    rpc: vi.fn().mockResolvedValue({data: 'event-id', error: null})
  };

  createAdminClientMock.mockReturnValue(supabase as any);
  return {leadQuery, eventsQuery, messagesQuery, supabase};
}

describe('Mini App lead detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for owning provider and honors 3600s read-only freshness', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', telegramUser: {id: 123}} as any);
    buildSupabaseMock(
      {
        id: 'lead-1',
        customer_profile_id: 'customer-1',
        status: 'contacted',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        categories: {slug: 'limpieza'},
        barrios: {name_es: 'Palermo', name_ru: 'Палермо', name_en: 'Palermo'},
        providers: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          profile_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          slug: 'mariana-lopez',
          status: 'approved',
          profiles: [{display_name: 'Mariana López'}]
        }]
      },
      [{event_type: 'provider_notified', actor_type: 'system', created_at: '2026-01-01T00:00:00Z', metadata: {}}],
      [{id: 'message-1', body: 'Hola', sender_role: 'provider', sender_profile_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', created_at: '2026-01-01T00:01:00Z', sender_profile: {display_name: 'Mariana López'}}]
    );

    const response = await GET(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000001', {
      headers: {'x-telegram-init-data': 'test-init-data'}
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000001'})} as any);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.lead).toBeDefined();
    expect(payload.lead.isProvider).toBe(true);
    expect(payload.lead.allowedActions).toEqual(['provider_opened']);
    expect(payload.lead.messages).toHaveLength(1);
    expect(resolveMiniAppIdentityMock).toHaveBeenCalledWith('test-init-data', 3600);
  });

  it('does not allow provider_opened when no prior event exists', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', telegramUser: {id: 123}} as any);
    buildSupabaseMock(
      {
        id: 'lead-6',
        customer_profile_id: 'customer-1',
        status: 'created',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        categories: {slug: 'limpieza'},
        barrios: {name_es: 'Palermo', name_ru: 'Палермо', name_en: 'Palermo'},
        providers: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          profile_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          slug: 'mariana-lopez',
          status: 'approved',
          profiles: [{display_name: 'Mariana López'}]
        }]
      },
      [],
      []
    );

    const response = await GET(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000006', {
      headers: {'x-telegram-init-data': 'test-init-data'}
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000006'})} as any);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.lead.allowedActions).toEqual([]);
  });

  it('returns 403 for a non-owning provider', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'other-provider', telegramUser: {id: 123}} as any);
    buildSupabaseMock(
      {
        id: 'lead-2',
        customer_profile_id: 'customer-1',
        status: 'contacted',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        categories: {slug: 'limpieza'},
        barrios: {name_es: 'Palermo', name_ru: 'Палермо', name_en: 'Palermo'},
        providers: {
          id: 'provider-1',
          profile_id: 'provider-1',
          slug: 'mariana-lopez',
          status: 'approved',
          profiles: {display_name: 'Mariana López'}
        }
      },
      [],
      []
    );

    const response = await GET(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000002', {
      headers: {'x-telegram-init-data': 'test-init-data'}
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000002'})} as any);

    expect(response.status).toBe(403);
  });

  it('returns 200 for owning customer and does not allow provider actions', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'customer-1', telegramUser: {id: 123}} as any);
    buildSupabaseMock(
      {
        id: 'lead-3',
        customer_profile_id: 'customer-1',
        status: 'provider_replied',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        categories: {slug: 'limpieza'},
        barrios: {name_es: 'Palermo', name_ru: 'Палермо', name_en: 'Palermo'},
        providers: {
          id: 'provider-1',
          profile_id: 'provider-1',
          slug: 'mariana-lopez',
          status: 'approved',
          profiles: {display_name: 'Mariana López'}
        }
      },
      [{event_type: 'provider_replied', actor_type: 'provider', created_at: '2026-01-01T00:00:00Z', metadata: {}}],
      []
    );

    const response = await GET(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000003', {
      headers: {'x-telegram-init-data': 'test-init-data'}
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000003'})} as any);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.lead.isCustomer).toBe(true);
    expect(payload.lead.allowedActions).toEqual(['customer_replied', 'cancelled']);
  });

  it('does not present destructive actions after completed', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'provider-1', telegramUser: {id: 123}} as any);
    buildSupabaseMock(
      {
        id: 'lead-4',
        customer_profile_id: 'customer-1',
        status: 'success',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        categories: {slug: 'limpieza'},
        barrios: {name_es: 'Palermo', name_ru: 'Палермо', name_en: 'Palermo'},
        providers: {
          id: 'provider-1',
          profile_id: 'provider-1',
          slug: 'mariana-lopez',
          status: 'approved',
          profiles: {display_name: 'Mariana López'}
        }
      },
      [{event_type: 'customer_completion_confirmed', actor_type: 'customer', created_at: '2026-01-01T00:00:00Z', metadata: {}}],
      []
    );

    const response = await GET(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000004', {
      headers: {'x-telegram-init-data': 'test-init-data'}
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000004'})} as any);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.lead.allowedActions).toEqual([]);
  });

  it('keeps the write action route at the default initData freshness window', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'provider-1', telegramUser: {id: 123}} as any);
    const lead = {
      id: 'lead-5',
      customer_profile_id: 'customer-1',
      provider_id: 'provider-1',
      providers: {profile_id: 'provider-1'}
    };
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({data: lead, error: null})
    };
    createAdminClientMock.mockReturnValue({from: vi.fn(() => query), rpc: vi.fn().mockResolvedValue({data: 'event-id', error: null})} as any);

    const response = await POST(new Request('http://localhost/api/mini-app/leads/00000000-0000-4000-8000-000000000005/action', {
      method: 'POST',
      headers: {'x-telegram-init-data': 'test-init-data', 'content-type': 'application/json'},
      body: JSON.stringify({action: 'provider_opened', idempotencyKey: '00000000-0000-0000-0000-000000000000'})
    }) as any, {params: Promise.resolve({id: '00000000-0000-4000-8000-000000000005'})} as any);

    expect(response.status).toBe(200);
    expect(resolveMiniAppIdentityMock.mock.calls[resolveMiniAppIdentityMock.mock.calls.length - 1][1]).toBe(600);
  });
});
