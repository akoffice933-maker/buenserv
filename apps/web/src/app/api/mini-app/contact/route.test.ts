import {describe, expect, it, vi, beforeEach} from 'vitest';
import {POST, GET} from './route';
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

function buildSupabaseMock(provider: any) {
  const providerQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({data: provider, error: null})
  };
  const rpcs: Array<{fn: string; args: any}> = [];
  const rpc = vi.fn((fn: string, args: any) => {
    rpcs.push({fn, args});
    return Promise.resolve({data: fn === 'create_lead' ? 'lead-1' : 'event-id', error: null});
  });
  const supabase = {from: vi.fn(() => providerQuery), rpc};
  createAdminClientMock.mockReturnValue(supabase as any);
  return {providerQuery, rpc, rpcs, supabase};
}

describe('Mini App contact route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a lead only when the customer picks a category/barrio the provider offers', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'customer-1', telegramUser: {id: 123}} as any);
    const provider = {
      id: 'provider-1',
      provider_categories: [{category_id: 'cat-1'}],
      provider_barrios: [{barrio_id: 'bar-1'}]
    };
    const {rpc, rpcs} = buildSupabaseMock(provider);

    const response = await POST(new Request('http://localhost/api/mini-app/contact', {
      method: 'POST',
      headers: {'x-telegram-init-data': 'test-init-data', 'content-type': 'application/json'},
      body: JSON.stringify({providerId: 'provider-1', categoryId: 'cat-1', barrioId: 'bar-1', description: 'necesito limpieza', idempotencyKey: '00000000-0000-0000-0000-000000000111'})
    }) as any);

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('create_contact_lead', expect.objectContaining({
      p_customer_profile_id: 'customer-1',
      p_provider_id: 'provider-1',
      p_category_id: 'cat-1',
      p_barrio_id: 'bar-1',
      p_description: 'necesito limpieza'
    }));
  });

  it('rejects a category/barrio the provider does not offer', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'customer-1', telegramUser: {id: 123}} as any);
    const provider = {
      id: 'provider-1',
      provider_categories: [{category_id: 'cat-1'}],
      provider_barrios: [{barrio_id: 'bar-1'}]
    };
    buildSupabaseMock(provider);

    const response = await POST(new Request('http://localhost/api/mini-app/contact', {
      method: 'POST',
      headers: {'x-telegram-init-data': 'test-init-data', 'content-type': 'application/json'},
      body: JSON.stringify({providerId: 'provider-1', categoryId: 'cat-2', barrioId: 'bar-1', description: '', idempotencyKey: '00000000-0000-0000-0000-000000000112'})
    }) as any);

    expect(response.status).toBe(400);
  });

  it('returns only the provider public available categories and barrios on GET', async () => {
    resolveMiniAppIdentityMock.mockResolvedValue({profileId: 'customer-1', telegramUser: {id: 123}} as any);
    const provider = {
      id: 'provider-1',
      slug: 'mariana-lopez',
      profiles: {display_name: 'Mariana'},
      provider_categories: [{price_from_ars: 18000, categories: {id: 'cat-1', slug: 'limpieza'}}],
      provider_barrios: [{barrios: {id: 'bar-1', slug: 'palermo', name_es: 'Palermo', name_ru: 'Палермо', name_en: 'Palermo'}}]
    };
    const {providerQuery} = buildSupabaseMock(provider);

    const response = await GET(new Request('http://localhost/api/mini-app/contact?providerId=provider-1', {
      headers: {'x-telegram-init-data': 'test-init-data'}
    }) as any);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.provider.categories[0].slug).toBe('limpieza');
    expect(payload.provider.barrios[0].nameEs).toBe('Palermo');
  });
});
