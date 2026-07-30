-- Remove calendar appointments automatically when their lead is deleted.
-- lead_history already references leads with ON DELETE CASCADE.

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.appointments'::regclass
      and c.contype = 'f'
      and exists (
        select 1
        from unnest(c.conkey) as key_column(attnum)
        join pg_attribute a
          on a.attrelid = c.conrelid
         and a.attnum = key_column.attnum
        where a.attname = 'lead_id'
      )
  loop
    execute format(
      'alter table public.appointments drop constraint %I',
      v_constraint.conname
    );
  end loop;

  alter table public.appointments
    add constraint appointments_lead_id_fkey
    foreign key (lead_id)
    references public.leads(id)
    on delete cascade;
end
$$;
