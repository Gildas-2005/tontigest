-- TontiGest — RLS additions for member self-service actions
drop policy if exists cotisations_insert_member on public.cotisations;
create policy cotisations_insert_member on public.cotisations for insert
  with check (owns_member(club_id, payload ->> 'membreId'));

drop policy if exists encheres_bid on public.encheres;
create policy encheres_bid on public.encheres for update
  using (is_member_of(club_id)) with check (is_member_of(club_id));

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert
  with check (
    has_role(club_id, array['President','Secretaire','Tresorier'])
    or owns_member(club_id, payload ->> 'pour')
  );