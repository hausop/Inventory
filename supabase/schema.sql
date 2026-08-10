-- 倉管系統第一版資料庫
-- 在 Supabase Dashboard → SQL Editor 執行。
-- 這版採「公開查看商品、只有管理員可寫入」的架構。

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  subcategory text not null,
  unit text not null default '個',
  stock integer not null default 0 check (stock >= 0),
  tags text[] not null default '{}',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  type text not null check (type in ('IN', 'OUT')),
  quantity integer not null check (quantity > 0),
  note text,
  operator_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin'))
);

create index if not exists products_category_idx on public.products(category);
create index if not exists products_subcategory_idx on public.products(subcategory);
create index if not exists inventory_logs_product_idx on public.inventory_logs(product_id);
create index if not exists inventory_logs_created_at_idx on public.inventory_logs(created_at);

alter table public.products enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
on public.products for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can view logs" on public.inventory_logs;
create policy "Admins can view logs"
on public.inventory_logs for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can insert logs" on public.inventory_logs;
create policy "Admins can insert logs"
on public.inventory_logs for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "Admins can view own profile" on public.profiles;
create policy "Admins can view own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

grant select on public.products to anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert on public.inventory_logs to authenticated;
grant select on public.profiles to authenticated;

-- 建立兩個測試商品。
insert into public.products (name, category, subcategory, unit, stock, tags, image_url)
select '白色資料夾', '輔銷品', '資料夾', '個', 12, array['#白'], null
where not exists (
  select 1 from public.products where name = '白色資料夾'
);

insert into public.products (name, category, subcategory, unit, stock, tags, image_url)
select '藍色資料夾', '輔銷品', '資料夾', '個', 8, array['#藍'], null
where not exists (
  select 1 from public.products where name = '藍色資料夾'
);

-- 注意：
-- 1. 先到 Authentication → Users 建立你的管理員帳號。
-- 2. 複製該使用者的 UUID。
-- 3. 再執行：
--
-- insert into public.profiles (id, role)
-- values ('你的-user-uuid', 'admin');
