-- Roles enum
create type public.app_role as enum ('admin');

-- user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "user can read own role"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

-- has_role security definer function
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Cards table
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  side text not null check (side in ('P','AI')),
  position text not null check (position in ('GOL','LD','ZAD','ZAE','LE','VOL','M8','M10','PD','PE','ATA')),
  tier smallint not null check (tier between 0 and 2),
  name text not null,
  ovr smallint not null check (ovr between 1 and 99),
  attrs jsonb not null default '{}'::jsonb,
  quote text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_side_position_tier_idx on public.cards (side, position, tier);

grant select on public.cards to anon, authenticated;
grant insert, update, delete on public.cards to authenticated;
grant all on public.cards to service_role;

alter table public.cards enable row level security;

create policy "cards are publicly readable"
  on public.cards for select
  to anon, authenticated
  using (true);

create policy "admins can insert cards"
  on public.cards for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins can update cards"
  on public.cards for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins can delete cards"
  on public.cards for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_set_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

-- Bootstrap admin: grant 'admin' to the fixed bootstrap email on user creation.
create or replace function public.grant_admin_for_bootstrap_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'glmpenna@hotmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_grant_admin
after insert on auth.users
for each row execute function public.grant_admin_for_bootstrap_email();

-- Seed 66 cartas iniciais
insert into public.cards (legacy_id, side, position, tier, name, ovr, attrs, quote) values
  ('P-GOL-0', 'P', 'GOL', 0, 'Tafferalho', 87, '{"passe":86,"defesa":83,"fisico":92}'::jsonb, 'Pega até bola de canhão.'),
  ('P-GOL-1', 'P', 'GOL', 1, 'Dida Boladão', 85, '{"passe":76,"defesa":88,"fisico":90}'::jsonb, 'Voa mais que pipa em julho.'),
  ('P-GOL-2', 'P', 'GOL', 2, 'Marcosvaldo', 68, '{"passe":64,"defesa":73,"fisico":66}'::jsonb, 'Só toma gol de bicicleta.'),
  ('P-LD-0', 'P', 'LD', 0, 'Cafuzinho', 91, '{"passe":88,"defesa":90,"fisico":96}'::jsonb, 'Sobe e desce a lateral o jogo todo.'),
  ('P-LD-1', 'P', 'LD', 1, 'Maiconel', 76, '{"passe":78,"defesa":76,"fisico":75}'::jsonb, 'Cruza de olhos fechados.'),
  ('P-LD-2', 'P', 'LD', 2, 'Zé Roberval', 66, '{"passe":67,"defesa":57,"fisico":73}'::jsonb, 'Marca até a sombra.'),
  ('P-ZAD-0', 'P', 'ZAD', 0, 'Roberto Larcos', 90, '{"passe":90,"defesa":97,"fisico":83}'::jsonb, 'Não passa nem o vento.'),
  ('P-ZAD-1', 'P', 'ZAD', 1, 'Lucinho', 81, '{"passe":80,"defesa":84,"fisico":80}'::jsonb, 'Cabeceio de touro premiado.'),
  ('P-ZAD-2', 'P', 'ZAD', 2, 'Aldair Jr', 73, '{"passe":70,"defesa":68,"fisico":80}'::jsonb, 'Corta tudo, até papo.'),
  ('P-ZAE-0', 'P', 'ZAE', 0, 'Juninho Baiano', 89, '{"passe":92,"defesa":87,"fisico":88}'::jsonb, 'Divide até com poste.'),
  ('P-ZAE-1', 'P', 'ZAE', 1, 'Émersão', 80, '{"passe":83,"defesa":71,"fisico":85}'::jsonb, 'Cabeça de martelo.'),
  ('P-ZAE-2', 'P', 'ZAE', 2, 'Zaguinho', 70, '{"passe":73,"defesa":78,"fisico":59}'::jsonb, 'Xerife da área.'),
  ('P-LE-0', 'P', 'LE', 0, 'Roberto Carlinhos', 93, '{"passe":94,"defesa":93,"fisico":92}'::jsonb, 'Chute forte igual bomba.'),
  ('P-LE-1', 'P', 'LE', 1, 'Junior Boy', 85, '{"passe":85,"defesa":79,"fisico":90}'::jsonb, 'Cruza no bico do chuteiro.'),
  ('P-LE-2', 'P', 'LE', 2, 'Branco 2000', 68, '{"passe":76,"defesa":62,"fisico":66}'::jsonb, 'Corre o jogo inteiro.'),
  ('P-VOL-0', 'P', 'VOL', 0, 'Dunguinha', 92, '{"passe":96,"criacao":83,"defesa":96}'::jsonb, 'Rouba bola até em treino.'),
  ('P-VOL-1', 'P', 'VOL', 1, 'Emerson Frita', 83, '{"passe":87,"criacao":87,"defesa":75}'::jsonb, 'Sola de ferro fundido.'),
  ('P-VOL-2', 'P', 'VOL', 2, 'Gilbertinho', 75, '{"passe":79,"criacao":73,"defesa":73}'::jsonb, 'Marca dois de uma vez.'),
  ('P-M8-0', 'P', 'M8', 0, 'Kaká Bolada', 90, '{"passe":98,"criacao":90,"defesa":83}'::jsonb, 'Toca de primeira sem olhar.'),
  ('P-M8-1', 'P', 'M8', 1, 'Zé Elias', 81, '{"passe":89,"criacao":75,"defesa":80}'::jsonb, 'Passe milimétrico.'),
  ('P-M8-2', 'P', 'M8', 2, 'Rivardo', 64, '{"passe":55,"criacao":56,"defesa":80}'::jsonb, 'Motor do time.'),
  ('P-M10-0', 'P', 'M10', 0, 'Dinho', 89, '{"passe":83,"criacao":96,"defesa":88}'::jsonb, 'Faz o time jogar bonito.'),
  ('P-M10-1', 'P', 'M10', 1, 'Zinedinho', 80, '{"passe":72,"criacao":83,"defesa":85}'::jsonb, 'Drible desconcertante.'),
  ('P-M10-2', 'P', 'M10', 2, 'Riquelmar', 61, '{"passe":58,"criacao":67,"defesa":59}'::jsonb, 'Cabeça pensante do time.'),
  ('P-PD-0', 'P', 'PD', 0, 'Ronieldo', 88, '{"finalizacao":85,"velocidade":86,"drible":92}'::jsonb, 'Elástico, pedalada, gol.'),
  ('P-PD-1', 'P', 'PD', 1, 'Robinhoso', 78, '{"finalizacao":74,"velocidade":71,"drible":90}'::jsonb, 'Rápido igual moto.'),
  ('P-PD-2', 'P', 'PD', 2, 'Gárrinchinha', 68, '{"finalizacao":61,"velocidade":78,"drible":66}'::jsonb, 'Chute com veneno.'),
  ('P-PE-0', 'P', 'PE', 0, 'Reymar', 92, '{"finalizacao":87,"velocidade":93,"drible":96}'::jsonb, 'Drible curto e chute torto.'),
  ('P-PE-1', 'P', 'PE', 1, 'Denilsãozinho', 77, '{"finalizacao":76,"velocidade":79,"drible":75}'::jsonb, 'Faz o zagueiro chorar.'),
  ('P-PE-2', 'P', 'PE', 2, 'Overmarso', 66, '{"finalizacao":64,"velocidade":61,"drible":73}'::jsonb, 'Perna de borracha.'),
  ('P-ATA-0', 'P', 'ATA', 0, 'Romarinho', 85, '{"finalizacao":88,"velocidade":83,"drible":83}'::jsonb, 'Faz gol até dormindo.'),
  ('P-ATA-1', 'P', 'ATA', 1, 'Adrianoel', 82, '{"finalizacao":78,"velocidade":87,"drible":80}'::jsonb, 'Cheirador de área nato.'),
  ('P-ATA-2', 'P', 'ATA', 2, 'Gabiol', 73, '{"finalizacao":67,"velocidade":72,"drible":80}'::jsonb, 'Chuta de qualquer ângulo.'),
  ('AI-GOL-0', 'AI', 'GOL', 0, 'Buffonildo', 91, '{"passe":95,"defesa":91,"fisico":87}'::jsonb, 'Pega até bola de canhão.'),
  ('AI-GOL-1', 'AI', 'GOL', 1, 'Chilaverto', 82, '{"passe":86,"defesa":77,"fisico":84}'::jsonb, 'Voa mais que pipa em julho.'),
  ('AI-GOL-2', 'AI', 'GOL', 2, 'Casillinhas', 65, '{"passe":77,"defesa":59,"fisico":58}'::jsonb, 'Só toma gol de bicicleta.'),
  ('AI-LD-0', 'AI', 'LD', 0, 'Cafuringa', 95, '{"passe":97,"defesa":98,"fisico":91}'::jsonb, 'Sobe e desce a lateral o jogo todo.'),
  ('AI-LD-1', 'AI', 'LD', 1, 'Serginhão', 87, '{"passe":88,"defesa":85,"fisico":89}'::jsonb, 'Cruza de olhos fechados.'),
  ('AI-LD-2', 'AI', 'LD', 2, 'Daniel Alvim', 72, '{"passe":80,"defesa":70,"fisico":65}'::jsonb, 'Marca até a sombra.'),
  ('AI-ZAD-0', 'AI', 'ZAD', 0, 'Nestinho', 94, '{"passe":99,"defesa":88,"fisico":95}'::jsonb, 'Não passa nem o vento.'),
  ('AI-ZAD-1', 'AI', 'ZAD', 1, 'Kanavaro', 72, '{"passe":70,"defesa":73,"fisico":74}'::jsonb, 'Cabeceio de touro premiado.'),
  ('AI-ZAD-2', 'AI', 'ZAD', 2, 'Puyolinho', 69, '{"passe":56,"defesa":80,"fisico":71}'::jsonb, 'Corta tudo, até papo.'),
  ('AI-ZAE-0', 'AI', 'ZAE', 0, 'Ramoslândia', 87, '{"passe":84,"defesa":94,"fisico":82}'::jsonb, 'Divide até com poste.'),
  ('AI-ZAE-1', 'AI', 'ZAE', 1, 'Pikê', 78, '{"passe":73,"defesa":81,"fisico":79}'::jsonb, 'Cabeça de martelo.'),
  ('AI-ZAE-2', 'AI', 'ZAE', 2, 'Terry Boladão', 67, '{"passe":60,"defesa":64,"fisico":78}'::jsonb, 'Xerife da área.'),
  ('AI-LE-0', 'AI', 'LE', 0, 'Zambrottinho', 85, '{"passe":85,"defesa":84,"fisico":87}'::jsonb, 'Chute forte igual bomba.'),
  ('AI-LE-1', 'AI', 'LE', 1, 'Cole Frio', 83, '{"passe":75,"defesa":89,"fisico":84}'::jsonb, 'Cruza no bico do chuteiro.'),
  ('AI-LE-2', 'AI', 'LE', 2, 'Evrada', 65, '{"passe":63,"defesa":75,"fisico":58}'::jsonb, 'Corre o jogo inteiro.'),
  ('AI-VOL-0', 'AI', 'VOL', 0, 'Vieirão', 90, '{"passe":87,"criacao":91,"defesa":91}'::jsonb, 'Rouba bola até em treino.'),
  ('AI-VOL-1', 'AI', 'VOL', 1, 'Kanteca', 81, '{"passe":77,"criacao":76,"defesa":89}'::jsonb, 'Sola de ferro fundido.'),
  ('AI-VOL-2', 'AI', 'VOL', 2, 'Makelelê Jr', 63, '{"passe":66,"criacao":58,"defesa":65}'::jsonb, 'Marca dois de uma vez.'),
  ('AI-M8-0', 'AI', 'M8', 0, 'Xavizinho', 94, '{"passe":89,"criacao":98,"defesa":95}'::jsonb, 'Toca de primeira sem olhar.'),
  ('AI-M8-1', 'AI', 'M8', 1, 'Iniestol', 79, '{"passe":79,"criacao":84,"defesa":74}'::jsonb, 'Passe milimétrico.'),
  ('AI-M8-2', 'AI', 'M8', 2, 'Pirlinho', 70, '{"passe":69,"criacao":69,"defesa":71}'::jsonb, 'Motor do time.'),
  ('AI-M10-0', 'AI', 'M10', 0, 'Zizuca', 87, '{"passe":91,"criacao":87,"defesa":82}'::jsonb, 'Faz o time jogar bonito.'),
  ('AI-M10-1', 'AI', 'M10', 1, 'Totônio', 78, '{"passe":82,"criacao":72,"defesa":79}'::jsonb, 'Drible desconcertante.'),
  ('AI-M10-2', 'AI', 'M10', 2, 'Maradonildo', 77, '{"passe":72,"criacao":80,"defesa":78}'::jsonb, 'Cabeça pensante do time.'),
  ('AI-PD-0', 'AI', 'PD', 0, 'Beckhamzão', 91, '{"finalizacao":93,"velocidade":94,"drible":87}'::jsonb, 'Elástico, pedalada, gol.'),
  ('AI-PD-1', 'AI', 'PD', 1, 'Figueiroa', 83, '{"finalizacao":84,"velocidade":80,"drible":84}'::jsonb, 'Rápido igual moto.'),
  ('AI-PD-2', 'AI', 'PD', 2, 'Salahzinho', 65, '{"finalizacao":75,"velocidade":63,"drible":58}'::jsonb, 'Chute com veneno.'),
  ('AI-PE-0', 'AI', 'PE', 0, 'Ribéryco', 90, '{"finalizacao":95,"velocidade":84,"drible":91}'::jsonb, 'Drible curto e chute torto.'),
  ('AI-PE-1', 'AI', 'PE', 1, 'Mbappinho', 88, '{"finalizacao":86,"velocidade":88,"drible":89}'::jsonb, 'Faz o zagueiro chorar.'),
  ('AI-PE-2', 'AI', 'PE', 2, 'Bale Boladão', 72, '{"finalizacao":78,"velocidade":74,"drible":65}'::jsonb, 'Perna de borracha.'),
  ('AI-ATA-0', 'AI', 'ATA', 0, 'Batistuta Jr', 94, '{"finalizacao":97,"velocidade":90,"drible":95}'::jsonb, 'Faz gol até dormindo.'),
  ('AI-ATA-1', 'AI', 'ATA', 1, 'Allejo', 79, '{"finalizacao":88,"velocidade":76,"drible":74}'::jsonb, 'Cheirador de área nato.'),
  ('AI-ATA-2', 'AI', 'ATA', 2, 'Van Nistelbão', 70, '{"finalizacao":81,"velocidade":58,"drible":71}'::jsonb, 'Chuta de qualquer ângulo.')
;