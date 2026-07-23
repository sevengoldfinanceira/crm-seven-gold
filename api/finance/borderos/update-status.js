const { supabase } = require('../../../lib/server/supabase');
const { getAuthorizedCrmUser } = require('../../../lib/server/crm-authorization');

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

  try {
    const { id, status, cancellation_reason } = req.body || {};
    if (!id || !status) {
      return send(res, 400, { ok: false, error: 'ID do borderô e novo status são obrigatórios.' });
    }

    const { data: statement, error: fetchError } = await supabase
      .from('commission_statements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) return send(res, 500, { ok: false, error: fetchError.message });
    if (!statement) return send(res, 404, { ok: false, error: 'Borderô não encontrado.' });

    // Validate permission for changes
    const isOwner = String(statement.seller_email || '').trim().toLowerCase() === String(auth.user.email || '').trim().toLowerCase();

    // Check permissions
    if (status === 'signed') {
      // Allow only the seller to sign or admin
      if (!isOwner && !isAdminOrFinance) {
        return send(res, 403, { ok: false, error: 'Apenas o colaborador proprietário pode assinar este borderô.' });
      }
    } else {
      // For all other status updates (conferir, aprovar, pagar, cancelar), only admin/financeiro
      if (!isAdminOrFinance) {
        return send(res, 403, { ok: false, error: 'Acesso negado. Apenas o setor financeiro ou administradores podem mudar o status deste borderô.' });
      }
    }

    // Prepare fields update
    const updateFields = {
      status,
      updated_at: new Date().toISOString()
    };

    let logAction = status;
    let logDetails = `Status alterado de "${statement.status}" para "${status}".`;

    if (status === 'paid') {
      updateFields.paid_at = new Date().toISOString();
      logAction = 'pago';
      logDetails = 'Borderô marcado como pago pelo setor financeiro.';
    } else if (status === 'approved') {
      logAction = 'aprovado';
      logDetails = 'Borderô aprovado pelo setor financeiro e enviado para assinatura do colaborador.';
    } else if (status === 'cancelled') {
      if (!cancellation_reason) {
        return send(res, 400, { ok: false, error: 'Informe o motivo do cancelamento.' });
      }
      updateFields.cancelled_at = new Date().toISOString();
      updateFields.cancellation_reason = cancellation_reason;
      logAction = 'cancelado';
      logDetails = `Borderô cancelado. Motivo: ${cancellation_reason}`;
    }

    const { data: updatedStatement, error: updateError } = await supabase
      .from('commission_statements')
      .update(updateFields)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) return send(res, 500, { ok: false, error: updateError.message });

    // Write audit log
    await supabase.from('commission_statement_logs').insert({
      statement_id: id,
      user_email: auth.user.email,
      user_name: auth.user.nome || auth.user.email,
      action: logAction,
      details: logDetails
    });

    return send(res, 200, { ok: true, statement: updatedStatement });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
};
