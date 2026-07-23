const { supabase } = require('../../lib/server/supabase');
const { getAuthorizedCrmUser } = require('../../lib/server/crm-authorization');

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(body)); };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  const auth = await getAuthorizedCrmUser(req);
  if (auth.error) return send(res, auth.status || 401, { ok: false, error: auth.error });

  const userRole = auth.user?.cargo ? String(auth.user.cargo).toLowerCase().trim() : '';
  const isAdminOrFinance = ['dono', 'administrador', 'diretor-ceo', 'financeiro'].includes(userRole);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'seven_gold')
        .maybeSingle();

      if (error) return send(res, 500, { ok: false, error: error.message });
      
      const settings = data || {
        id: 'seven_gold',
        razao_social: 'Seven Gold Negócios e Assessoria Financeira Ltda',
        nome_fantasia: 'Seven Gold Financeira',
        cnpj: '12.345.678/0001-90',
        endereco: 'Av. Paulista, 1000 - São Paulo/SP',
        telefone: '(11) 98765-4321'
      };

      return send(res, 200, { ok: true, settings });
    } catch (e) {
      return send(res, 500, { ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    if (!isAdminOrFinance) {
      return send(res, 403, { ok: false, error: 'Acesso negado. Apenas administradores e financeiro podem editar dados da empresa.' });
    }

    try {
      const { razao_social, nome_fantasia, cnpj, endereco, telefone } = req.body || {};
      
      if (!razao_social || !cnpj) {
        return send(res, 400, { ok: false, error: 'Razão social e CNPJ são obrigatórios.' });
      }

      const { data, error } = await supabase
        .from('company_settings')
        .upsert({
          id: 'seven_gold',
          razao_social,
          nome_fantasia: nome_fantasia || 'Seven Gold Financeira',
          cnpj,
          endereco: endereco || '',
          telefone: telefone || ''
        })
        .select('*')
        .single();

      if (error) return send(res, 500, { ok: false, error: error.message });

      return send(res, 200, { ok: true, settings: data });
    } catch (e) {
      return send(res, 500, { ok: false, error: e.message });
    }
  }

  return send(res, 405, { ok: false, error: 'Method not allowed' });
};
