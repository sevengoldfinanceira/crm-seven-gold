const { supabase } = require('../supabase');
const { getAuthorizedCrmUser, normalizeRole } = require('../crm-authorization');
const { mapCargoToCommissionLevelId, parseCommissionRate } = require('./commission-rules');

const MASTER_COMMISSION_ROLES = new Set([
  'diretor-ceo',
  'dono',
  'admin',
  'administrador',
]);

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(body));
};

const getRequestParams = (req) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  return {
    targetLevelId: String(url.searchParams.get('target_level_id') || '').trim(),
    targetUserId: String(url.searchParams.get('target_user_id') || '').trim(),
  };
};

const normalizeRule = (rule) => {
  const order = Number(rule.table_index) + 1;
  const rate = parseCommissionRate(rule.commission_value);
  return {
    id: rule.id,
    name: `Tabela ${order}`,
    order,
    active: true,
    percentage: Number((rate * 100).toFixed(4)),
  };
};

const getMasterOptions = async () => {
  const [{ data: rules, error: rulesError }, { data: users, error: usersError }] = await Promise.all([
    supabase
      .from('commission_rules')
      .select('level_id,level_name,category,level_sort')
      .order('category', { ascending: true })
      .order('level_sort', { ascending: true }),
    supabase
      .from('crm_users')
      .select('id,nome,email,cargo')
      .eq('ativo', true)
      .order('nome', { ascending: true }),
  ]);

  if (rulesError) throw rulesError;
  if (usersError) throw usersError;

  const levelsById = new Map();
  (rules || []).forEach((rule) => {
    if (!levelsById.has(rule.level_id)) {
      levelsById.set(rule.level_id, {
        id: rule.level_id,
        name: rule.level_name || rule.level_id,
        category: rule.category || 'commercial',
        sort: Number(rule.level_sort || 0),
      });
    }
  });

  const levels = Array.from(levelsById.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category === 'commercial' ? -1 : 1;
    return a.sort - b.sort || a.name.localeCompare(b.name, 'pt-BR');
  });

  const sellers = (users || [])
    .map((user) => {
      const levelId = mapCargoToCommissionLevelId(user.cargo);
      const level = levelsById.get(levelId);
      if (!level) return null;
      return {
        id: user.id,
        name: user.nome || user.email,
        cargo: user.cargo || '',
        levelId,
        levelName: level.name,
      };
    })
    .filter(Boolean);

  return { levels, sellers, levelsById };
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Method not allowed' });

  const auth = await getAuthorizedCrmUser(req);
  if (auth.error) return send(res, auth.status || 401, { ok: false, error: auth.error });

  try {
    const isMaster = MASTER_COMMISSION_ROLES.has(normalizeRole(auth.user?.cargo));
    const { targetLevelId, targetUserId } = getRequestParams(req);
    let masterOptions = null;
    let levelId = mapCargoToCommissionLevelId(auth.user?.cargo);
    let selection = {
      kind: 'self',
      id: auth.user.id,
      label: auth.user.nome || auth.user.email,
    };

    if (isMaster) {
      masterOptions = await getMasterOptions();

      if (targetUserId) {
        const seller = masterOptions.sellers.find((item) => item.id === targetUserId);
        if (!seller) {
          return send(res, 404, {
            ok: false,
            error: 'Vendedor não encontrado ou sem matriz de comissão configurada.',
          });
        }
        levelId = seller.levelId;
        selection = {
          kind: 'user',
          id: seller.id,
          value: `user:${seller.id}`,
          label: seller.name,
        };
      } else if (targetLevelId) {
        const level = masterOptions.levelsById.get(targetLevelId);
        if (!level) {
          return send(res, 400, { ok: false, error: 'Cargo de comissão inválido.' });
        }
        levelId = level.id;
        selection = {
          kind: 'level',
          id: level.id,
          value: `level:${level.id}`,
          label: level.name,
        };
      } else {
        const defaultLevel = masterOptions.levelsById.get(levelId)
          || masterOptions.levelsById.get('consultor-vendas')
          || masterOptions.levels[0];
        levelId = defaultLevel?.id || null;
        selection = defaultLevel ? {
          kind: 'level',
          id: defaultLevel.id,
          value: `level:${defaultLevel.id}`,
          label: defaultLevel.name,
        } : null;
      }
    }

    if (!levelId) {
      return send(res, 400, {
        ok: false,
        error: 'Seu cargo não possui uma matriz de comissão configurada.',
      });
    }

    const { data, error } = await supabase
      .from('commission_rules')
      .select('id,level_id,level_name,table_index,table_label,commission_value')
      .eq('level_id', levelId)
      .order('table_index', { ascending: true });

    if (error) return send(res, 500, { ok: false, error: error.message });

    const tablesByOrder = new Map();
    (data || []).forEach((rule) => {
      const tableIndex = Number(rule.table_index);
      if (!Number.isInteger(tableIndex) || tableIndex < 0 || tableIndex > 6) return;
      const normalized = normalizeRule(rule);
      if (!tablesByOrder.has(normalized.order)) tablesByOrder.set(normalized.order, normalized);
    });
    const tables = Array.from(tablesByOrder.values()).sort((a, b) => a.order - b.order);

    if (!tables.length) {
      return send(res, 404, {
        ok: false,
        error: 'Nenhuma tabela de comissão ativa foi encontrada para seu cargo.',
      });
    }

    return send(res, 200, {
      ok: true,
      level: {
        id: levelId,
        name: data?.[0]?.level_name || levelId,
      },
      selection,
      canChooseProfile: isMaster,
      options: isMaster ? {
        levels: masterOptions.levels.map(({ id, name, category }) => ({ id, name, category })),
        sellers: masterOptions.sellers,
      } : null,
      tables,
    });
  } catch (error) {
    return send(res, 500, { ok: false, error: error.message || 'Erro ao carregar tabelas de comissão.' });
  }
};
