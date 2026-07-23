const { supabase } = require('../supabase');
const { getAuthorizedCrmUser } = require('../crm-authorization');

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(body)); };

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
    return send(res, 403, { ok: false, error: 'Acesso negado. Apenas o financeiro ou administradores podem adicionar ajustes.' });
  }

  try {
    const { statement_id, type, amount, reason } = req.body || {};
    
    if (!statement_id || !type || !amount || !reason) {
      return send(res, 400, { ok: false, error: 'Código do borderô, tipo, valor e justificativa são obrigatórios.' });
    }

    const numericAmount = Number(parseFloat(amount).toFixed(2));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return send(res, 400, { ok: false, error: 'O valor do ajuste deve ser maior que zero.' });
    }

    const { data: statement, error: fetchError } = await supabase
      .from('commission_statements')
      .select('*')
      .eq('id', statement_id)
      .maybeSingle();

    if (fetchError) return send(res, 500, { ok: false, error: fetchError.message });
    if (!statement) return send(res, 404, { ok: false, error: 'Borderô não encontrado.' });

    // Validate status: cannot change if approved, signed, paid or cancelled!
    if (!['draft', 'pending_check'].includes(statement.status)) {
      return send(res, 400, { ok: false, error: 'Não é possível alterar os valores de um borderô já aprovado, assinado, pago ou cancelado.' });
    }

    // 1. Insert adjustment
    const { data: adjustment, error: insertError } = await supabase
      .from('commission_adjustments')
      .insert({
        statement_id,
        type,
        amount: numericAmount,
        reason,
        created_by_email: auth.user.email,
        created_by_name: auth.user.nome || auth.user.email
      })
      .select('*')
      .single();

    if (insertError) return send(res, 500, { ok: false, error: insertError.message });

    // 2. Fetch all adjustments for this statement to recalculate totals
    const { data: allAdjusts, error: fetchAdjustsError } = await supabase
      .from('commission_adjustments')
      .select('*')
      .eq('statement_id', statement_id);

    if (fetchAdjustsError) return send(res, 500, { ok: false, error: fetchAdjustsError.message });

    let bonus_amount = 0;
    let advance_amount = 0;
    let discount_amount = 0;
    let chargeback_amount = 0;
    let positive_adjustments = 0;
    let negative_adjustments = 0;

    (allAdjusts || []).forEach(adj => {
      const val = Number(adj.amount);
      if (adj.type === 'bonus') bonus_amount += val;
      else if (adj.type === 'advance') advance_amount += val;
      else if (adj.type === 'discount') discount_amount += val;
      else if (adj.type === 'chargeback') chargeback_amount += val;
      else if (adj.type === 'positive') positive_adjustments += val;
      else if (adj.type === 'negative') negative_adjustments += val;
    });

    // Net formula: net_amount = approved_commission + bonus_amount + positive_adjustments - discount_amount - advance_amount - chargeback_amount - negative_adjustments
    const net_amount = Number((
      Number(statement.approved_commission) + 
      bonus_amount + 
      positive_adjustments - 
      discount_amount - 
      advance_amount - 
      chargeback_amount - 
      negative_adjustments
    ).toFixed(2));

    // 3. Update statement totals
    const { data: updatedStatement, error: updateError } = await supabase
      .from('commission_statements')
      .update({
        bonus_amount: Number(bonus_amount.toFixed(2)),
        advance_amount: Number(advance_amount.toFixed(2)),
        discount_amount: Number(discount_amount.toFixed(2)),
        chargeback_amount: Number(chargeback_amount.toFixed(2)),
        positive_adjustments: Number(positive_adjustments.toFixed(2)),
        negative_adjustments: Number(negative_adjustments.toFixed(2)),
        net_amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', statement_id)
      .select('*')
      .single();

    if (updateError) return send(res, 500, { ok: false, error: updateError.message });

    // Write audit log
    const typeLabels = {
      bonus: 'Bônus',
      advance: 'Adiantamento',
      discount: 'Desconto',
      chargeback: 'Estorno',
      positive: 'Ajuste Positivo',
      negative: 'Ajuste Negativo'
    };

    await supabase.from('commission_statement_logs').insert({
      statement_id,
      user_email: auth.user.email,
      user_name: auth.user.nome || auth.user.email,
      action: 'ajustado',
      details: `Adicionado ajuste de ${typeLabels[type]} no valor de R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Motivo: ${reason}`
    });

    return send(res, 200, { ok: true, statement: updatedStatement, adjustment });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
};
