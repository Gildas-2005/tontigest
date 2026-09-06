-- TontiGest — RLS fixes: tresorier club updates + self-join insert
drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update
  using (has_role(id, array['President','Tresorier']) or created_by = auth.uid());

drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert
  with check (has_role(club_id, array['President','Secretaire','Tresorier']) or user_id = auth.uid());