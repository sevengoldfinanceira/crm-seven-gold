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
    const { id, signature_name, signature_cpf, signature_ip, signature_image } = req.body || {};
    
    if (!id || !signature_name || !signature_cpf || !signature_image) {
      return send(res, 400, { ok: false, error: 'Código do borderô, nome completo, CPF e imagem de assinatura são obrigatórios.' });
    }

    const { data: statement, error: fetchError } = await supabase
      .from('commission_statements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) return send(res, 500, { ok: false, error: fetchError.message });
    if (!statement) return send(res, 404, { ok: false, error: 'Borderô não encontrado.' });

    // Validate permission: only the statement owner or admin
    const isOwner = String(statement.seller_email || '').trim().toLowerCase() === String(auth.user.email || '').trim().toLowerCase();

    if (!isOwner && !isAdminOrFinance) {
      return send(res, 403, { ok: false, error: 'Acesso negado. Apenas o colaborador correspondente pode assinar este borderô.' });
    }

    // Validate status: must be approved / pending_signature
    if (!['approved', 'pending_signature'].includes(statement.status)) {
      return send(res, 400, { ok: false, error: 'Este borderô não está aguardando assinatura (status deve ser Aprovado).' });
    }

    // Update statement with signature
    const { data: updatedStatement, error: updateError } = await supabase
      .from('commission_statements')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_name,
        signature_cpf,
        signature_ip: signature_ip || req.socket.remoteAddress || '',
        signature_image,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) return send(res, 500, { ok: false, error: updateError.message });

    // Write audit log
    await supabase.from('commission_statement_logs').insert({
      statement_id: id,
      user_email: auth.user.email,
      user_name: auth.user.nome || auth.user.email,
      action: 'assinado',
      details: `Borderô assinado eletronicamente por ${signature_name} (CPF: ${signature_cpf}) sob o endereço IP: ${signature_ip || req.socket.remoteAddress || 'não identificado'}.`
    });

    return send(res, 200, { ok: true, statement: updatedStatement });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
};
