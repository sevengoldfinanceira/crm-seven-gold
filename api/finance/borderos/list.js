const { supabase } = require('../../../lib/server/supabase');
const { getAuthorizedCrmUser } = require('../../../lib/server/crm-authorization');

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(body)); };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Method not allowed' });

  const auth = await getAuthorizedCrmUser(req);
  if (auth.error) return send(res, auth.status || 401, { ok: false, error: auth.error });

  const userRole = auth.user?.cargo ? String(auth.user.cargo).toLowerCase().trim() : '';
  const isAdminOrFinance = ['dono', 'administrador', 'diretor-ceo', 'financeiro'].includes(userRole);

  try {
    const { seller_id, status, start_date, end_date, id } = req.query || {};

    // If ID is specified, return detailed single statement with items, adjustments, and logs!
    if (id) {
      const { data: statement, error: stmtError } = await supabase
        .from('commission_statements')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (stmtError) return send(res, 500, { ok: false, error: stmtError.message });
      if (!statement) return send(res, 404, { ok: false, error: 'Borderô não encontrado.' });

      // Check access permission
      const userEmail = String(auth.user.email || '').trim().toLowerCase();
      const isOwner = String(statement.seller_email || '').trim().toLowerCase() === userEmail;

      if (!isAdminOrFinance && !isOwner) {
        return send(res, 403, { ok: false, error: 'Acesso negado. Você só pode visualizar seus próprios borderôs.' });
      }

      // Fetch items, adjustments, and logs
      const [itemsRes, adjustmentsRes, logsRes] = await Promise.all([
        supabase.from('commission_statement_items').select('*').eq('statement_id', id).order('sale_date', { ascending: true }),
        supabase.from('commission_adjustments').select('*').eq('statement_id', id).order('created_at', { ascending: true }),
        supabase.from('commission_statement_logs').select('*').eq('statement_id', id).order('created_at', { ascending: true })
      ]);

      return send(res, 200, {
        ok: true,
        statement,
        items: itemsRes.data || [],
        adjustments: adjustmentsRes.data || [],
        logs: logsRes.data || []
      });
    }

    // Default: List statements with filters
    let query = supabase
      .from('commission_statements')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by own emails if not admin/financeiro
    if (!isAdminOrFinance) {
      query = query.ilike('seller_email', String(auth.user.email || '').trim().toLowerCase());
    } else if (seller_id) {
      query = query.eq('seller_id', seller_id);
    }

    if (status) {
      query = query.eq('status', status);
    }
    if (start_date) {
      query = query.gte('period_start', start_date);
    }
    if (end_date) {
      query = query.lte('period_end', end_date);
    }

    const { data: statements, error } = await query;
    if (error) return send(res, 500, { ok: false, error: error.message });

    return send(res, 200, { ok: true, statements: statements || [] });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
};
