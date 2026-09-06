-- TontiGest schema — Supabase
create extension if not exists pgcrypto;

-- ============ Clubs & profiles ============
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  nom text not null default 'Ma tontine',
  ville text not null default '',
  type text not null default 'Rotative',
  devise text not null default 'XAF',
  montant_cotisation numeric not null default 0,
  statut text not null default 'Preparation',
  created_by uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  role text not null default 'Membre',
  nom text not null default '',
  telephone text default '',
  photo text,
  two_fa boolean not null default false,
  two_fa_code text,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id text primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists members_club_idx on public.members (club_id);
create index if not exists members_user_idx on public.members (user_id);

-- ============ Business collections (id text, payload jsonb) ============
create table if not exists public.cotisations (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists cotisations_club_idx on public.cotisations (club_id);
create table if not exists public.mouvements (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists mouvements_club_idx on public.mouvements (club_id);
create table if not exists public.penalites (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists penalites_club_idx on public.penalites (club_id);
create table if not exists public.epargne (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists epargne_club_idx on public.epargne (club_id);
create table if not exists public.groupes_epargne (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists groupes_epargne_club_idx on public.groupes_epargne (club_id);
create table if not exists public.prets (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists prets_club_idx on public.prets (club_id);
create table if not exists public.redistributions (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists redistributions_club_idx on public.redistributions (club_id);
create table if not exists public.aides (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists aides_club_idx on public.aides (club_id);
create table if not exists public.encheres (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists encheres_club_idx on public.encheres (club_id);
create table if not exists public.seances (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists seances_club_idx on public.seances (club_id);
create table if not exists public.parrainages (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists parrainages_club_idx on public.parrainages (club_id);
create table if not exists public.reclamations (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists reclamations_club_idx on public.reclamations (club_id);
create table if not exists public.sanctions (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists sanctions_club_idx on public.sanctions (club_id);
create table if not exists public.rapports (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists rapports_club_idx on public.rapports (club_id);
create table if not exists public.alertes (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists alertes_club_idx on public.alertes (club_id);
create table if not exists public.annonces (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists annonces_club_idx on public.annonces (club_id);
create table if not exists public.audits (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists audits_club_idx on public.audits (club_id);
create table if not exists public.notifications (id text primary key, club_id uuid not null references public.clubs(id) on delete cascade, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists notifications_club_idx on public.notifications (club_id);

-- ============ Helper functions (security definer, bypass RLS) ============
create or replace function public.current_club_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select club_id from public.profiles where id = auth.uid() $$;

create or replace function public.is_member_of(p_club uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and club_id = p_club) $$;

create or replace function public.has_role(p_club uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and club_id = p_club and role = any (p_roles)) $$;

create or replace function public.owns_member(p_club uuid, p_member text)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.members where id = p_member and club_id = p_club and user_id = auth.uid()) $$;

-- ============ New user trigger ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nom, telephone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nom', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'telephone', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS enable ============
alter table public.clubs enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.notifications enable row level security;
alter table public.cotisations enable row level security;
alter table public.mouvements enable row level security;
alter table public.penalites enable row level security;
alter table public.epargne enable row level security;
alter table public.groupes_epargne enable row level security;
alter table public.prets enable row level security;
alter table public.redistributions enable row level security;
alter table public.aides enable row level security;
alter table public.encheres enable row level security;
alter table public.seances enable row level security;
alter table public.parrainages enable row level security;
alter table public.reclamations enable row level security;
alter table public.sanctions enable row level security;
alter table public.rapports enable row level security;
alter table public.alertes enable row level security;
alter table public.annonces enable row level security;
alter table public.audits enable row level security;

-- ============ Policies: clubs ============
drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs for select
  using (is_member_of(id) or current_club_id() is null);
drop policy if exists clubs_insert on public.clubs;
create policy clubs_insert on public.clubs for insert
  with check (auth.uid() is not null);
drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update
  using (has_role(id, array['President']) or created_by = auth.uid());

-- ============ Policies: profiles ============
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or (club_id is not null and is_member_of(club_id)));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or has_role(club_id, array['President']));

-- ============ Policies: members ============
drop policy if exists members_select on public.members;
create policy members_select on public.members for select
  using (is_member_of(club_id));
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert
  with check (has_role(club_id, array['President','Secretaire','Tresorier']) or owns_member(club_id, id));
drop policy if exists members_update on public.members;
create policy members_update on public.members for update
  using (has_role(club_id, array['President','Secretaire']) or owns_member(club_id, id));
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete
  using (has_role(club_id, array['President']));

-- ============ Policies: finance (tresorier/president) ============
drop policy if exists cotisations_select on public.cotisations;
create policy cotisations_select on public.cotisations for select using (is_member_of(club_id));
drop policy if exists cotisations_write on public.cotisations;
create policy cotisations_write on public.cotisations for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));
drop policy if exists mouvements_select on public.mouvements;
create policy mouvements_select on public.mouvements for select using (is_member_of(club_id));
drop policy if exists mouvements_write on public.mouvements;
create policy mouvements_write on public.mouvements for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));
drop policy if exists penalites_select on public.penalites;
create policy penalites_select on public.penalites for select using (is_member_of(club_id));
drop policy if exists penalites_write on public.penalites;
create policy penalites_write on public.penalites for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));
drop policy if exists epargne_select on public.epargne;
create policy epargne_select on public.epargne for select using (is_member_of(club_id));
drop policy if exists epargne_write on public.epargne;
create policy epargne_write on public.epargne for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));
drop policy if exists groupes_epargne_select on public.groupes_epargne;
create policy groupes_epargne_select on public.groupes_epargne for select using (is_member_of(club_id));
drop policy if exists groupes_epargne_write on public.groupes_epargne;
create policy groupes_epargne_write on public.groupes_epargne for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));
drop policy if exists redistributions_select on public.redistributions;
create policy redistributions_select on public.redistributions for select using (is_member_of(club_id));
drop policy if exists redistributions_write on public.redistributions;
create policy redistributions_write on public.redistributions for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));
drop policy if exists annonces_select on public.annonces;
create policy annonces_select on public.annonces for select using (is_member_of(club_id));
drop policy if exists annonces_write on public.annonces;
create policy annonces_write on public.annonces for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));

-- ============ Policies: prets / aides (demande membre, gestion tresorier) ============
drop policy if exists prets_select on public.prets;
create policy prets_select on public.prets for select using (is_member_of(club_id));
drop policy if exists prets_insert on public.prets;
create policy prets_insert on public.prets for insert with check (is_member_of(club_id));
drop policy if exists prets_manage on public.prets;
create policy prets_manage on public.prets for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));
drop policy if exists aides_select on public.aides;
create policy aides_select on public.aides for select using (is_member_of(club_id));
drop policy if exists aides_insert on public.aides;
create policy aides_insert on public.aides for insert with check (is_member_of(club_id));
drop policy if exists aides_manage on public.aides;
create policy aides_manage on public.aides for all using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));

-- ============ Policies: encheres ============
drop policy if exists encheres_select on public.encheres;
create policy encheres_select on public.encheres for select using (is_member_of(club_id));
drop policy if exists encheres_insert on public.encheres;
create policy encheres_insert on public.encheres for insert with check (is_member_of(club_id));
drop policy if exists encheres_manage on public.encheres;
create policy encheres_manage on public.encheres for all
  using (has_role(club_id, array['President','Tresorier'])) with check (has_role(club_id, array['President','Tresorier']));

-- ============ Policies: seances / parrainages (secretariat) ============
drop policy if exists seances_select on public.seances;
create policy seances_select on public.seances for select using (is_member_of(club_id));
drop policy if exists seances_write on public.seances;
create policy seances_write on public.seances for all
  using (has_role(club_id, array['President','Secretaire','Tresorier'])) with check (has_role(club_id, array['President','Secretaire','Tresorier']));
drop policy if exists parrainages_select on public.parrainages;
create policy parrainages_select on public.parrainages for select using (is_member_of(club_id));
drop policy if exists parrainages_write on public.parrainages;
create policy parrainages_write on public.parrainages for all
  using (has_role(club_id, array['President','Secretaire','Tresorier'])) with check (has_role(club_id, array['President','Secretaire','Tresorier']));

-- ============ Policies: reclamations ============
drop policy if exists reclamations_select on public.reclamations;
create policy reclamations_select on public.reclamations for select using (is_member_of(club_id));
drop policy if exists reclamations_insert on public.reclamations;
create policy reclamations_insert on public.reclamations for insert
  with check (is_member_of(club_id) and (owns_member(club_id, payload ->> 'membreId') or has_role(club_id, array['President','Secretaire'])));
drop policy if exists reclamations_manage on public.reclamations;
create policy reclamations_manage on public.reclamations for all
  using (has_role(club_id, array['President','Secretaire'])) with check (has_role(club_id, array['President','Secretaire']));

-- ============ Policies: sanctions (president) ============
drop policy if exists sanctions_select on public.sanctions;
create policy sanctions_select on public.sanctions for select using (is_member_of(club_id));
drop policy if exists sanctions_write on public.sanctions;
create policy sanctions_write on public.sanctions for all
  using (has_role(club_id, array['President'])) with check (has_role(club_id, array['President']));

-- ============ Policies: rapports ============
drop policy if exists rapports_select on public.rapports;
create policy rapports_select on public.rapports for select using (is_member_of(club_id));
drop policy if exists rapports_insert on public.rapports;
create policy rapports_insert on public.rapports for insert
  with check (has_role(club_id, array['President','Tresorier']));
drop policy if exists rapports_validate on public.rapports;
create policy rapports_validate on public.rapports for update
  using (has_role(club_id, array['President','Tresorier','Commissaire']))
  with check (has_role(club_id, array['President','Tresorier','Commissaire']));

-- ============ Policies: alertes / audits (commissaire) ============
drop policy if exists alertes_select on public.alertes;
create policy alertes_select on public.alertes for select using (is_member_of(club_id));
drop policy if exists alertes_write on public.alertes;
create policy alertes_write on public.alertes for all
  using (has_role(club_id, array['President','Commissaire'])) with check (has_role(club_id, array['President','Commissaire']));
drop policy if exists audits_select on public.audits;
create policy audits_select on public.audits for select using (is_member_of(club_id));
drop policy if exists audits_write on public.audits;
create policy audits_write on public.audits for all
  using (has_role(club_id, array['President','Commissaire'])) with check (has_role(club_id, array['President','Commissaire']));

-- ============ Policies: notifications ============
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select
  using (
    has_role(club_id, array['President','Secretaire','Tresorier'])
    or exists (select 1 from public.members m where m.club_id = notifications.club_id and m.user_id = auth.uid() and m.id = payload ->> 'pour')
  );
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert
  with check (has_role(club_id, array['President','Secretaire','Tresorier']));
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using (
    has_role(club_id, array['President','Secretaire','Tresorier'])
    or exists (select 1 from public.members m where m.club_id = notifications.club_id and m.user_id = auth.uid() and m.id = payload ->> 'pour')
  )
  with check (true);