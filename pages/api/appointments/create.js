const { supabase } = require('../../../api/_shared/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { lead_id, nome_cliente, data_agendamento, hora_agendamento, observacao } = req.body;

    if (!lead_id || !nome_cliente || !data_agendamento || !hora_agendamento) {
      return res.status(400).json({ ok: false, error: 'Campos obrigatórios ausentes' });
    }

    // Buscar informações do responsável do lead
    const { data: lead } = await supabase
      .from('leads')
      .select('assigned_to_email, assigned_to_name')
      .eq('id', lead_id)
      .maybeSingle();

    const assigned_to_email = lead?.assigned_to_email || req.body.assigned_to_email || null;
    const assigned_to_name = lead?.assigned_to_name || req.body.assigned_to_name || null;

    // Resolver usuario_id a partir do email do responsável
    let usuario_id = req.body.usuario_id || null;
    if (!usuario_id && assigned_to_email) {
      const { data: crmUser } = await supabase
        .from('crm_users')
        .select('id')
        .eq('email', assigned_to_email)
        .eq('ativo', true)
        .maybeSingle();
      usuario_id = crmUser?.id || null;
    }

    // Inserir no Supabase usando service role (bypassa RLS)
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        lead_id,
        nome_cliente,
        telefone_cliente: req.body.telefone_cliente || null,
        usuario_id,
        nome_usuario: assigned_to_name || req.body.nome_usuario || 'Extensão WhatsApp',
        data_agendamento,
        hora_agendamento,
        observacao: observacao || null,
        status: 'agendado',
        assigned_to_email,
        assigned_to_name
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting appointment (pages):', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, appointment: data });
  } catch (err) {
    console.error('Internal server error in pages create appointment handler:', err);
    return res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
};
