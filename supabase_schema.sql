-- ─────────────────────────────────────────────────────────────
-- FINANZAS MICHITI — Schema completo
-- Correr en: Supabase → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────

-- USER PROFILES
create table if not exists public.user_profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text,
  role       text not null default 'usuario' check (role in ('usuario', 'admin')),
  currency   text not null default 'ARS',
  nombre     text,
  apodo      text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.user_profiles enable row level security;

-- TRANSACCIONES
create table if not exists public.transacciones (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  monto       numeric(12,2) not null,
  tipo        text not null check (tipo in ('ingreso', 'gasto')),
  categoria   text not null,
  descripcion text,
  fecha       date not null default current_date,
  created_at  timestamptz default now()
);
alter table public.transacciones enable row level security;

-- PRESUPUESTOS
create table if not exists public.presupuestos (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  categoria  text not null,
  limite     numeric(12,2) not null,
  created_at timestamptz default now(),
  unique (user_id, categoria)
);
alter table public.presupuestos enable row level security;

-- DEUDAS
create table if not exists public.deudas (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  descripcion text not null,
  monto       numeric(12,2) not null,
  tipo        text not null check (tipo in ('debo', 'me_deben')),
  vencimiento date,
  icono       text,
  pagado      boolean not null default false,
  created_at  timestamptz default now()
);
alter table public.deudas enable row level security;

-- SERVICIOS
create table if not exists public.servicios (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  nombre          text not null,
  monto           numeric(12,2) not null,
  icono           text,
  categoria       text,
  dia_vencimiento int check (dia_vencimiento between 1 and 31),
  activo          boolean not null default true,
  ultimo_pago     date,
  created_at      timestamptz default now()
);
alter table public.servicios enable row level security;

-- METAS
create table if not exists public.metas (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  nombre         text not null,
  icono          text,
  monto_objetivo numeric(12,2) not null,
  monto_actual   numeric(12,2) not null default 0,
  fecha_limite   date,
  created_at     timestamptz default now()
);
alter table public.metas enable row level security;

-- ─────────────────────────────────────────────────────────────
-- FUNCIÓN is_admin() — SECURITY DEFINER evita recursión
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────
create policy "own_profile"       on public.user_profiles  for all using (auth.uid() = id);
create policy "admin_profiles"    on public.user_profiles  for all using (public.is_admin());
create policy "own_transacciones" on public.transacciones  for all using (auth.uid() = user_id);
create policy "own_presupuestos"  on public.presupuestos   for all using (auth.uid() = user_id);
create policy "own_deudas"        on public.deudas         for all using (auth.uid() = user_id);
create policy "own_servicios"     on public.servicios      for all using (auth.uid() = user_id);
create policy "own_metas"         on public.metas          for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- AUTO-CREAR PERFIL AL REGISTRARSE
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, email, role, currency)
  values (
    new.id,
    new.email,
    'usuario',
    coalesce(new.raw_user_meta_data->>'currency', 'ARS')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- STORAGE — bucket para avatares
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

create policy "avatars_read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_insert" on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars_update" on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars_delete" on storage.objects for delete using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
