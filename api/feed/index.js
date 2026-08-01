const { supabase } = require('../../lib/server/supabase');

const ADMIN_ROLES = new Set(['diretor-ceo', 'dono', 'admin', 'administrador']);
const normalizeRole = (value) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

const sendJson = (res, statusCode, body) => {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve({}); }
  });
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    let currentUser = null;
    let isAdmin = false;

    if (token && supabase) {
      const { data: userData } = await supabase.auth.getUser(token);
      const userEmail = userData?.user?.email?.trim().toLowerCase();
      if (userEmail) {
        const { data: crmUser } = await supabase.from('crm_users').select('id,email,nome,avatar_url,cargo').ilike('email', userEmail).eq('ativo', true).maybeSingle();
        if (crmUser) {
          currentUser = crmUser;
          isAdmin = ADMIN_ROLES.has(normalizeRole(crmUser.cargo));
        }
      }
    }

    const payload = req.method === 'GET' ? req.query : (req.body && Object.keys(req.body).length ? req.body : await readBody(req));
    const action = payload.action || (req.method === 'GET' ? 'list' : 'list');

    // 1. LIST FEED POSTS
    if (action === 'list') {
      let posts = [];
      let totalPosts = 0;
      let highlights = [];

      if (supabase) {
        const { data: postsData, error: postsError } = await supabase
          .from('feed_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!postsError && Array.isArray(postsData)) {
          posts = postsData;
          totalPosts = posts.length;
        }

        // Fetch comments and reactions for all returned posts
        if (posts.length > 0) {
          const postIds = posts.map(p => p.id);

          const [{ data: commentsData }, { data: reactionsData }] = await Promise.all([
            supabase.from('feed_comments').select('*').in('post_id', postIds).order('created_at', { ascending: true }),
            supabase.from('feed_reactions').select('*').in('post_id', postIds)
          ]);

          const commentsMap = new Map();
          (commentsData || []).forEach(c => {
            if (!commentsMap.has(c.post_id)) commentsMap.set(c.post_id, []);
            commentsMap.get(c.post_id).push(c);
          });

          const reactionsMap = new Map();
          (reactionsData || []).forEach(r => {
            if (!reactionsMap.has(r.post_id)) reactionsMap.set(r.post_id, []);
            reactionsMap.get(r.post_id).push(r);
          });

          posts = posts.map(post => {
            const postReactions = reactionsMap.get(post.id) || [];
            const postComments = commentsMap.get(post.id) || [];
            const userCelebrated = currentUser ? postReactions.some(r => String(r.user_id) === String(currentUser.id)) : false;

            return {
              ...post,
              reactions_count: postReactions.length,
              reactions: postReactions,
              user_celebrated: userCelebrated,
              comments_count: postComments.length,
              comments: postComments
            };
          });

          // Calculate Monthly Highlights (Destaques do Mês)
          const now = new Date();
          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const monthlySellersMap = new Map();

          posts.forEach(post => {
            if (post.created_at && post.created_at.startsWith(currentMonthStr)) {
              const sellerKey = post.seller_name || post.author_name || 'Vendedor';
              if (!monthlySellersMap.has(sellerKey)) {
                monthlySellersMap.set(sellerKey, {
                  name: sellerKey,
                  avatar_url: post.seller_avatar || post.author_avatar || '',
                  sales_count: 0
                });
              }
              monthlySellersMap.get(sellerKey).sales_count += 1;
            }
          });

          highlights = [...monthlySellersMap.values()]
            .sort((a, b) => b.sales_count - a.sales_count)
            .slice(0, 5);
        }
      }

      return sendJson(res, 200, {
        ok: true,
        posts,
        total_posts: totalPosts,
        highlights
      });
    }

    // 2. CREATE POST (FROM CLOSED CONTRACT/SALE)
    if (action === 'create_post') {
      const saleId = String(payload.sale_id || '').trim();
      const caption = String(payload.caption || '').trim();
      const imageUrl = String(payload.image_url || payload.photo_url || '').trim();
      const sellerName = String(payload.seller_name || currentUser?.nome || 'Vendedor Seven Gold').trim();
      const sellerAvatar = payload.seller_avatar || currentUser?.avatar_url || null;
      const creditAmount = Number(payload.credit_amount) || 0;

      if (!saleId) {
        return sendJson(res, 400, { ok: false, error: 'Identificação da venda (sale_id) é obrigatória.' });
      }

      if (!supabase) {
        return sendJson(res, 500, { ok: false, error: 'Conexão com o Supabase indisponível.' });
      }

      // Check uniqueness of sale_id
      const { data: existingPost } = await supabase.from('feed_posts').select('id').eq('sale_id', saleId).maybeSingle();
      if (existingPost) {
        return sendJson(res, 409, { ok: false, error: 'Esta venda já foi publicada no feed.' });
      }

      const insertData = {
        sale_id: saleId,
        author_id: currentUser?.id || null,
        author_name: currentUser?.nome || sellerName,
        author_avatar: currentUser?.avatar_url || sellerAvatar,
        seller_id: currentUser?.id || null,
        seller_name: sellerName,
        seller_avatar: sellerAvatar,
        credit_amount: creditAmount,
        image_url: imageUrl || null,
        caption: caption || 'Mais uma conquista fechada! Parabéns ao nosso cliente por esse grande passo. 🚀',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: post, error } = await supabase.from('feed_posts').insert(insertData).select().single();
      if (error) {
        return sendJson(res, 500, { ok: false, error: error.message });
      }

      return sendJson(res, 200, { ok: true, post });
    }

    // 3. TOGGLE REACTION (CELEBRATE)
    if (action === 'toggle_reaction') {
      const postId = String(payload.post_id || '').trim();
      if (!postId) return sendJson(res, 400, { ok: false, error: 'ID da publicação não informado.' });

      const userId = currentUser ? currentUser.id : String(payload.user_id || 'user-guest');
      const userName = currentUser ? currentUser.nome : String(payload.user_name || 'Vendedor');

      if (!supabase) return sendJson(res, 500, { ok: false, error: 'Conexão com Supabase indisponível.' });

      const { data: existingReaction } = await supabase
        .from('feed_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingReaction) {
        // Remove reaction (un-celebrate)
        await supabase.from('feed_reactions').delete().eq('id', existingReaction.id);
        return sendJson(res, 200, { ok: true, celebrated: false });
      } else {
        // Add reaction (celebrate)
        await supabase.from('feed_reactions').insert({
          post_id: postId,
          user_id: userId,
          user_name: userName,
          reaction_type: 'celebrate',
          created_at: new Date().toISOString()
        });
        return sendJson(res, 200, { ok: true, celebrated: true });
      }
    }

    // 4. CREATE COMMENT
    if (action === 'create_comment') {
      const postId = String(payload.post_id || '').trim();
      const content = String(payload.content || '').trim();
      const parentCommentId = payload.parent_comment_id || null;

      if (!postId || !content) {
        return sendJson(res, 400, { ok: false, error: 'Publicação e conteúdo do comentário são obrigatórios.' });
      }

      if (!supabase) return sendJson(res, 500, { ok: false, error: 'Conexão com Supabase indisponível.' });

      const commentData = {
        post_id: postId,
        author_id: currentUser?.id || null,
        author_name: currentUser?.nome || 'Colaborador Seven Gold',
        author_avatar: currentUser?.avatar_url || null,
        parent_comment_id: parentCommentId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: comment, error } = await supabase.from('feed_comments').insert(commentData).select().single();
      if (error) return sendJson(res, 500, { ok: false, error: error.message });

      return sendJson(res, 200, { ok: true, comment });
    }

    // 5. DELETE COMMENT
    if (action === 'delete_comment') {
      const commentId = String(payload.comment_id || '').trim();
      if (!commentId) return sendJson(res, 400, { ok: false, error: 'Comentário não informado.' });

      if (!supabase) return sendJson(res, 500, { ok: false, error: 'Conexão com Supabase indisponível.' });

      const { data: comment } = await supabase.from('feed_comments').select('author_id').eq('id', commentId).maybeSingle();
      if (!comment) return sendJson(res, 404, { ok: false, error: 'Comentário não encontrado.' });

      if (!isAdmin && currentUser && String(comment.author_id) !== String(currentUser.id)) {
        return sendJson(res, 403, { ok: false, error: 'Você não tem permissão para excluir este comentário.' });
      }

      const { error } = await supabase.from('feed_comments').delete().eq('id', commentId);
      if (error) return sendJson(res, 500, { ok: false, error: error.message });

      return sendJson(res, 200, { ok: true, deleted: true });
    }

    // 6. DELETE POST
    if (action === 'delete_post') {
      const postId = String(payload.post_id || '').trim();
      if (!postId) return sendJson(res, 400, { ok: false, error: 'Publicação não informada.' });

      if (!supabase) return sendJson(res, 500, { ok: false, error: 'Conexão com Supabase indisponível.' });

      const { data: post } = await supabase.from('feed_posts').select('author_id').eq('id', postId).maybeSingle();
      if (!post) return sendJson(res, 404, { ok: false, error: 'Publicação não encontrada.' });

      if (!isAdmin && currentUser && String(post.author_id) !== String(currentUser.id)) {
        return sendJson(res, 403, { ok: false, error: 'Você não tem permissão para excluir esta publicação.' });
      }

      const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
      if (error) return sendJson(res, 500, { ok: false, error: error.message });

      return sendJson(res, 200, { ok: true, deleted: true });
    }

    return sendJson(res, 400, { ok: false, error: 'Ação inválida para o feed.' });
  } catch (err) {
    console.error('[API /api/feed] Internal Error:', err);
    return sendJson(res, 500, { ok: false, error: 'Erro interno no feed de vendas.' });
  }
};
