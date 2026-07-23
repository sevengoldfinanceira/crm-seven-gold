const { supabase } = require('../../../lib/server/supabase');
const { getAuthorizedCrmUser } = require('../../../lib/server/crm-authorization');

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(body)); };

const mapCargoToLevelId = (cargo) => {
  if (!cargo) return 'consultor-vendas';
  const clean = cargo.toLowerCase().trim().replace(/[-_]+/g, ' ');
  if (clean.includes('home') || clean.includes('office')) return 'home-office';
  if (clean.includes('assistente')) return 'assistente-vendas';
  if (clean.includes('supervisor')) return 'supervisor';
  if (clean.includes('coordenador')) return 'coordenador';
  if (clean.includes('junior')) return 'representante-junior';
  if (clean.includes('pleno')) return 'representante-pleno';
  if (clean.includes('submaster')) return 'submaster';
  return 'consultor-vendas';
};

const parseCommissionValue = (valStr) => {
  if (!valStr) return 0;
  const clean = valStr.replace('%', '').replace(',', '.').trim();
  return parseFloat(clean) / 100;
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });

  const auth = await getAuthorizedCrmUser(req);
  if (auth.error) return send(res, auth.status || 401, { ok: false, error: auth.error });

  const userRole = auth.user?.cargo ? String(auth.user.cargo).toLowerCase().trim() : '';
  const isAdminOrFinance = ['dono', 'administrador', 'diretor-ceo', 'financeiro'].includes(userRole);

  if (!isAdminOrFinance) {
    return send(res, 403, { ok: false, error: 'Acesso negado. Apenas o financeiro e administradores podem gerar borderôs.' });
  }

  try {
    const { seller_id, period_start, period_end } = req.body || {};
    if (!seller_id || !period_start || !period_end) {
      return send(res, 400, { ok: false, error: 'Selecione o colaborador, a data de início e de fim.' });
    }

    // 1. Fetch seller profile details
    const { data: seller, error: sellerError } = await supabase
      .from('crm_users')
      .select('id, nome, email, cargo, ativo')
      .eq('id', seller_id)
      .maybeSingle();

    if (sellerError) return send(res, 500, { ok: false, error: sellerError.message });
    if (!seller) return send(res, 404, { ok: false, error: 'Colaborador não encontrado.' });

    // 2. Fetch checked or pending_check sales in the period
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('seller_id', seller_id)
      .gte('closed_at', period_start)
      .lte('closed_at', period_end)
      .neq('status', 'cancelled'); // ignore cancelled sales

    if (salesError) return send(res, 500, { ok: false, error: salesError.message });

    if (!sales || sales.length === 0) {
      return send(res, 400, { ok: false, error: 'Nenhuma venda encontrada para este colaborador no período informado.' });
    }

    // 3. Check for existing statement for this seller in this overlapping period (to prevent double commission)
    const { data: existingStatements, error: checkStatementsError } = await supabase
      .from('commission_statements')
      .select('id, period_start, period_end, status')
      .eq('seller_id', seller_id)
      .neq('status', 'cancelled');

    if (checkStatementsError) return send(res, 500, { ok: false, error: checkStatementsError.message });

    if (existingStatements && existingStatements.length > 0) {
      // Check for overlap
      const start = new Date(period_start);
      const end = new Date(period_end);
      const overlap = existingStatements.some(s => {
        const sStart = new Date(s.period_start);
        const sEnd = new Date(s.period_end);
        return (start <= sEnd && end >= sStart);
      });

      if (overlap) {
        return send(res, 409, { ok: false, error: 'Já existe um borderô gerado ou em andamento para este colaborador no período informado.' });
      }
    }

    // 4. Fetch all commission rules
    const { data: rules, error: rulesError } = await supabase
      .from('commission_rules')
      .select('*');

    if (rulesError) return send(res, 500, { ok: false, error: rulesError.message });

    // 5. Build items and calculate totals
    const levelId = mapCargoToLevelId(seller.cargo);
    const items = [];
    
    let totalSalesCount = sales.length;
    let totalCreditAmount = 0;
    let grossCommission = 0;
    let pendingCommission = 0;
    let approvedCommission = 0;

    for (const sale of sales) {
      const tableIdx = sale.table_number - 1; // 0-indexed
      // Find rules matching levelId and table index
      const rule = (rules || []).find(r => r.level_id === levelId && r.table_index === tableIdx);
      const valueStr = rule ? rule.commission_value : '0,00%';
      const percentage = parseCommissionValue(valueStr);
      
      const commAmount = Number((Number(sale.credit_amount) * percentage).toFixed(2));
      totalCreditAmount += Number(sale.credit_amount);
      grossCommission += commAmount;

      if (sale.status === 'checked') {
        approvedCommission += commAmount;
      } else {
        pendingCommission += commAmount;
      }

      items.push({
        sale_id: sale.id,
        sale_date: sale.closed_at,
        client_name: sale.client_name,
        seller_name: seller.nome || seller.email,
        credit_amount: Number(sale.credit_amount),
        table_number: sale.table_number,
        seller_cargo: seller.cargo || 'Vendedor',
        rule_applied: `${rule?.level_name || 'Vendedor'} - ${rule?.table_label || ('Tab 0' + sale.table_number)} (${valueStr})`,
        commission_percentage: percentage,
        commission_amount: commAmount,
        status: sale.status
      });
    }

    // Prepare header insert
    const { data: newStatement, error: insertStatementError } = await supabase
      .from('commission_statements')
      .insert({
        seller_id: seller.id,
        seller_name: seller.nome || seller.email,
        seller_email: seller.email,
        seller_cargo: seller.cargo || 'Vendedor',
        period_start,
        period_end,
        status: 'draft',
        total_sales_count: totalSalesCount,
        total_credit_amount: Number(totalCreditAmount.toFixed(2)),
        gross_commission: Number(grossCommission.toFixed(2)),
        pending_commission: Number(pendingCommission.toFixed(2)),
        approved_commission: Number(approvedCommission.toFixed(2)),
        net_amount: Number(approvedCommission.toFixed(2)), // Net amount is initially approved commission
        created_by: auth.user.id
      })
      .select('*')
      .single();

    if (insertStatementError) return send(res, 500, { ok: false, error: insertStatementError.message });

    // Insert statement items with photographic copy
    const itemsWithStmtId = items.map(item => ({
      ...item,
      statement_id: newStatement.id
    }));

    const { error: insertItemsError } = await supabase
      .from('commission_statement_items')
      .insert(itemsWithStmtId);

    if (insertItemsError) {
      // rollback header
      await supabase.from('commission_statements').delete().eq('id', newStatement.id);
      return send(res, 500, { ok: false, error: insertItemsError.message });
    }

    // Write audit log
    await supabase.from('commission_statement_logs').insert({
      statement_id: newStatement.id,
      user_email: auth.user.email,
      user_name: auth.user.nome || auth.user.email,
      action: 'gerado',
      details: `Borderô gerado no status rascunho (Elaboração) para o colaborador ${seller.nome} com ${totalSalesCount} vendas no período de ${period_start} a ${period_end}.`
    });

    return send(res, 200, { ok: true, statement: newStatement, items: itemsWithStmtId });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
};
