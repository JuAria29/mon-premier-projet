-- ============================================================
-- Aria Coach V2 — Seed : modules et rôles par défaut
-- À exécuter APRÈS v2_roles_schema.sql
-- ============================================================

-- 1. Modules
insert into modules (id, label, icon) values
  ('dashboard',    'Dashboard & Coach IA',       'home'),
  ('finances',     'Finances',                   'chart'),
  ('commercial',   'Commercial & Devis',         'briefcase'),
  ('planning',     'Planning & Interventions',   'calendar'),
  ('clients',      'Clients & Contacts',         'users'),
  ('mails',        'Mails & Notes',              'mail'),
  ('objectifs',    'Objectifs',                  'target'),
  ('export',       'Export de données',          'download'),
  ('admin',        'Gestion utilisateurs/rôles', 'gear')
on conflict (id) do nothing;

-- 2. Rôles système
insert into roles (name, slug, description, color, is_system) values
  ('Dirigeant',             'dirigeant',      'Accès total, administration complète',                        '#b5612f', true),
  ('Resp. Commercial',      'resp-commercial','Pilote tout le pipeline commercial de l''équipe',             '#3b82f6', true),
  ('Commercial',            'commercial',     'Accès à ses propres dossiers uniquement',                     '#2563eb', true),
  ('Assistante Technique',  'assist-tech',    'Gestion du planning et des interventions',                    '#0d9488', true),
  ('Technicien',            'technicien',     'Ses interventions et planning uniquement',                    '#16a34a', true),
  ('Comptable',             'comptable',      'Lecture des données financières et export',                   '#7c3aed', true)
on conflict (slug) do nothing;

-- 3. Permissions — Dirigeant (tout en full)
insert into role_permissions (role_id, module_id, level)
select r.id, m.id, 'full'
from roles r, modules m
where r.slug = 'dirigeant'
on conflict (role_id, module_id) do nothing;

-- 4. Permissions — Responsable Commercial
insert into role_permissions (role_id, module_id, level)
select r.id, m.id, p.level
from roles r
join (values
  ('dashboard',  'read'),
  ('finances',   'read'),
  ('commercial', 'full'),
  ('planning',   'read'),
  ('clients',    'full'),
  ('mails',      'none'),
  ('objectifs',  'read'),
  ('export',     'none'),
  ('admin',      'none')
) as p(module_id, level) on true
join modules m on m.id = p.module_id
where r.slug = 'resp-commercial'
on conflict (role_id, module_id) do update set level = excluded.level;

-- 5. Permissions — Commercial
insert into role_permissions (role_id, module_id, level)
select r.id, m.id, p.level
from roles r
join (values
  ('dashboard',  'own'),
  ('finances',   'none'),
  ('commercial', 'own'),
  ('planning',   'none'),
  ('clients',    'own'),
  ('mails',      'none'),
  ('objectifs',  'own'),
  ('export',     'none'),
  ('admin',      'none')
) as p(module_id, level) on true
join modules m on m.id = p.module_id
where r.slug = 'commercial'
on conflict (role_id, module_id) do update set level = excluded.level;

-- 6. Permissions — Assistante Technique
insert into role_permissions (role_id, module_id, level)
select r.id, m.id, p.level
from roles r
join (values
  ('dashboard',  'none'),
  ('finances',   'none'),
  ('commercial', 'write'),
  ('planning',   'write'),
  ('clients',    'read'),
  ('mails',      'none'),
  ('objectifs',  'none'),
  ('export',     'none'),
  ('admin',      'none')
) as p(module_id, level) on true
join modules m on m.id = p.module_id
where r.slug = 'assist-tech'
on conflict (role_id, module_id) do update set level = excluded.level;

-- 7. Permissions — Technicien
insert into role_permissions (role_id, module_id, level)
select r.id, m.id, p.level
from roles r
join (values
  ('dashboard',  'own'),
  ('finances',   'none'),
  ('commercial', 'none'),
  ('planning',   'own'),
  ('clients',    'none'),
  ('mails',      'none'),
  ('objectifs',  'own'),
  ('export',     'none'),
  ('admin',      'none')
) as p(module_id, level) on true
join modules m on m.id = p.module_id
where r.slug = 'technicien'
on conflict (role_id, module_id) do update set level = excluded.level;

-- 8. Permissions — Comptable
insert into role_permissions (role_id, module_id, level)
select r.id, m.id, p.level
from roles r
join (values
  ('dashboard',  'none'),
  ('finances',   'read'),
  ('commercial', 'none'),
  ('planning',   'none'),
  ('clients',    'none'),
  ('mails',      'none'),
  ('objectifs',  'none'),
  ('export',     'read'),
  ('admin',      'none')
) as p(module_id, level) on true
join modules m on m.id = p.module_id
where r.slug = 'comptable'
on conflict (role_id, module_id) do update set level = excluded.level;
