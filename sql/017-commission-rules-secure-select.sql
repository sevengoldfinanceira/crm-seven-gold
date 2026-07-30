-- Restringe leitura direta das regras administrativas de comissão.
-- A calculadora do vendedor usa /api/finance/commission-tables, que retorna apenas
-- id, nome, percentual, ordem e status ativo das 7 tabelas do cargo logado.

DROP POLICY IF EXISTS "commission_rules_select" ON public.commission_rules;
DROP POLICY IF EXISTS "commission_rules_select_admin_finance" ON public.commission_rules;

CREATE POLICY "commission_rules_select_admin_finance"
ON public.commission_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.crm_users
    WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
  )
);
