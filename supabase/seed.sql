-- Development / soft-launch seed data. Replace provider names, photos and reviews with consented, moderated data before production.
insert into public.categories (id, slug, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'limpieza', 1),
  ('10000000-0000-0000-0000-000000000002', 'reparaciones', 2),
  ('10000000-0000-0000-0000-000000000003', 'mascotas', 3),
  ('10000000-0000-0000-0000-000000000004', 'mudanzas', 4),
  ('10000000-0000-0000-0000-000000000005', 'clases', 5),
  ('10000000-0000-0000-0000-000000000006', 'mensajeria', 6),
  ('10000000-0000-0000-0000-000000000007', 'taxi-traslados', 7)
on conflict (slug) do nothing;

insert into public.barrios (id, slug, name_es, name_ru, name_en) values
  ('20000000-0000-0000-0000-000000000001', 'palermo', 'Palermo', 'Палермо', 'Palermo'),
  ('20000000-0000-0000-0000-000000000002', 'recoleta', 'Recoleta', 'Реколета', 'Recoleta'),
  ('20000000-0000-0000-0000-000000000003', 'belgrano', 'Belgrano', 'Бельграно', 'Belgrano'),
  ('20000000-0000-0000-0000-000000000004', 'caballito', 'Caballito', 'Кабальито', 'Caballito')
on conflict (slug) do nothing;

-- Note: seed profiles are intentionally omitted. Provider creation must go through
-- the moderated Telegram onboarding flow once it is enabled.
