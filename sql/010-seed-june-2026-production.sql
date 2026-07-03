-- Registra a produção histórica imediatamente anterior à implantação do módulo.
-- Os leads existentes começaram em julho/2026, portanto junho permanece vazio.
insert into public.commercial_productions (
  name,
  month,
  year,
  starts_at,
  ends_at,
  status,
  closed_at
)
values (
  'Junho/2026',
  6,
  2026,
  '2026-06-01',
  '2026-06-30',
  'closed',
  '2026-07-01T02:59:59.999Z'
)
on conflict (year, month) do nothing;
