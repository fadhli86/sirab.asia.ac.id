-- Sistem RAB Hibah — skema awal untuk login wajib, RAB tersinkron ke akun,
-- Pencairan Dana, dan Pengeluaran. Tempel & jalankan file ini di
-- Supabase SQL Editor pada project baru sebelum aplikasi bisa dipakai.

create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ================= penelitian =================
-- Satu baris = satu draft RAB milik satu akun. UNIQUE(owner_id) menegakkan
-- "satu proyek per akun" untuk sekarang; melepas constraint ini nanti adalah
-- SATU-SATUNYA perubahan yang dibutuhkan untuk dukungan multi-proyek.
create table penelitian (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  judul text not null default 'RAB Penelitian',
  skema_id text not null default 'pfr',
  program_studi text not null default '',
  nama_ketua text not null default '',
  jumlah_tahun int not null default 1 check (jumlah_tahun between 1 and 5),
  pagu_kustom boolean not null default false,
  pagu_min_kustom numeric,
  pagu_max_kustom numeric,
  status text not null default 'draft' check (status in ('draft','berjalan','selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);
create index penelitian_owner_id_idx on penelitian(owner_id);
create trigger trg_penelitian_updated_at before update on penelitian
  for each row execute function set_updated_at();

-- ================= rab_items =================
create table rab_items (
  id uuid primary key default gen_random_uuid(),
  penelitian_id uuid not null references penelitian(id) on delete cascade,
  tahun_ke int not null check (tahun_ke between 1 and 5),
  kategori text not null check (kategori in ('honor','bahan','data','perjalanan','sewa','peralatan','lain')),
  label text not null default '',
  vol numeric not null default 1,
  sat text not null default '',
  vol2 numeric not null default 1,
  sat2 text not null default '-',
  harga numeric not null default 0,
  urutan int not null default 0,
  created_at timestamptz not null default now()
);
create index rab_items_penelitian_id_idx on rab_items(penelitian_id);
create index rab_items_penelitian_tahun_idx on rab_items(penelitian_id, tahun_ke);

-- Ganti seluruh isi rab_items untuk satu penelitian dalam SATU transaksi
-- (delete+reinsert atomik). SECURITY INVOKER -> RLS pemanggil tetap berlaku,
-- jadi tidak perlu cek kepemilikan manual di dalam fungsi ini.
create or replace function save_rab_items(p_penelitian_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  delete from rab_items where penelitian_id = p_penelitian_id;
  insert into rab_items (penelitian_id, tahun_ke, kategori, label, vol, sat, vol2, sat2, harga, urutan)
  select p_penelitian_id,
         (item->>'tahun_ke')::int,
         item->>'kategori',
         item->>'label',
         (item->>'vol')::numeric,
         item->>'sat',
         (item->>'vol2')::numeric,
         item->>'sat2',
         (item->>'harga')::numeric,
         (item->>'urutan')::int
  from jsonb_array_elements(p_items) as item;
end;
$$;

-- ================= pencairan_dana =================
create table pencairan_dana (
  id uuid primary key default gen_random_uuid(),
  penelitian_id uuid not null references penelitian(id) on delete cascade,
  termin text not null,
  persen numeric,
  nominal numeric not null check (nominal >= 0),
  tanggal date,
  status text not null default 'menunggu' check (status in ('menunggu','diterima')),
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pencairan_dana_penelitian_id_idx on pencairan_dana(penelitian_id);
create trigger trg_pencairan_updated_at before update on pencairan_dana
  for each row execute function set_updated_at();

-- ================= pengeluaran =================
create table pengeluaran (
  id uuid primary key default gen_random_uuid(),
  penelitian_id uuid not null references penelitian(id) on delete cascade,
  kategori text not null check (kategori in ('honor','bahan','data','perjalanan','sewa','peralatan','lain')),
  uraian text not null,
  nominal numeric not null check (nominal >= 0),
  tanggal date not null default current_date,
  catatan text,
  dicatat_oleh uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pengeluaran_penelitian_id_idx on pengeluaran(penelitian_id);
create index pengeluaran_penelitian_kategori_idx on pengeluaran(penelitian_id, kategori);
create trigger trg_pengeluaran_updated_at before update on pengeluaran
  for each row execute function set_updated_at();

-- ================= RLS =================
alter table penelitian enable row level security;
alter table rab_items enable row level security;
alter table pencairan_dana enable row level security;
alter table pengeluaran enable row level security;

create policy "own penelitian" on penelitian for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own rab_items via penelitian" on rab_items for all
  using (exists (select 1 from penelitian p where p.id = rab_items.penelitian_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from penelitian p where p.id = rab_items.penelitian_id and p.owner_id = (select auth.uid())));

create policy "own pencairan via penelitian" on pencairan_dana for all
  using (exists (select 1 from penelitian p where p.id = pencairan_dana.penelitian_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from penelitian p where p.id = pencairan_dana.penelitian_id and p.owner_id = (select auth.uid())));

create policy "own pengeluaran via penelitian" on pengeluaran for all
  using (exists (select 1 from penelitian p where p.id = pengeluaran.penelitian_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from penelitian p where p.id = pengeluaran.penelitian_id and p.owner_id = (select auth.uid())));

grant usage on schema public to authenticated;
grant select, insert, update, delete on penelitian, rab_items, pencairan_dana, pengeluaran to authenticated;
