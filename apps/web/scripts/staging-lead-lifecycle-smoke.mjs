import {createClient} from '@supabase/supabase-js';

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'LEAD_SMOKE_CUSTOMER_PROFILE_ID', 'LEAD_SMOKE_PROVIDER_ID', 'LEAD_SMOKE_CATEGORY_ID', 'LEAD_SMOKE_BARRIO_ID', 'LEAD_SMOKE_PROVIDER_PROFILE_ID'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required`);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
const suffix = `smoke-${Date.now()}`;
const {data: leadId, error: leadError} = await supabase.rpc('create_lead', {
  p_customer_profile_id: process.env.LEAD_SMOKE_CUSTOMER_PROFILE_ID,
  p_provider_id: process.env.LEAD_SMOKE_PROVIDER_ID,
  p_category_id: process.env.LEAD_SMOKE_CATEGORY_ID,
  p_barrio_id: process.env.LEAD_SMOKE_BARRIO_ID,
  p_source: 'staging_smoke', p_source_detail: 'manual', p_external_source: 'staging_smoke', p_external_id: `${suffix}-created`, p_metadata: {smoke: true}
});
if (leadError) throw leadError;
const event = async (type, actor, id) => { const {error} = await supabase.rpc('record_lead_event', {p_lead_id: leadId, p_event_type: type, p_actor_type: actor, p_actor_profile_id: actor === 'provider' ? process.env.LEAD_SMOKE_PROVIDER_PROFILE_ID : actor === 'customer' ? process.env.LEAD_SMOKE_CUSTOMER_PROFILE_ID : null, p_external_source: 'staging_smoke', p_external_id: `${suffix}-${id}`, p_metadata: {smoke: true}}); if (error) throw error; };
await event('customer_contacted', 'customer', 'contacted');
await event('provider_notified', 'system', 'notified');
await event('provider_replied', 'provider', 'replied');
await event('completed', 'customer', 'completed');
const {data: lead, error: readError} = await supabase.from('leads').select('status').eq('id', leadId).single();
if (readError) throw readError;
if (lead.status !== 'success') throw new Error(`Expected success, received ${lead.status}`);
console.log(JSON.stringify({leadId, status: lead.status, smoke: 'passed'}, null, 2));
