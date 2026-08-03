(function () {
  const COURSES_DATA = {
    onboarding: {
      id: "onboarding",
      title: "Introdução à Empresa (Onboarding)",
      description: "Conheça a história da Seven Gold, nossa cultura, equipe e as ferramentas de trabalho que você utilizará no dia a dia.",
      icon: "graduation-cap",
      badge: "Integração",
      modules: [
        {
          id: "onboarding_m1",
          title: "1. Boas-vindas e Cultura Seven Gold",
          duration: "05:12",
          videoText: "Assista à mensagem de boas-vindas do nosso Diretor CEO.",
          content: `<p>Olá, seja muito bem-vindo(a) à equipe <strong>Seven Gold Financeira</strong>! Estamos entusiasmados em ter você conosco.</p>
                    <p>Nesta aula de introdução, abordamos a cultura da nossa empresa:</p>
                    <ul>
                      <li><strong>Missão:</strong> Viabilizar a conquista de patrimônio de forma inteligente e justa.</li>
                      <li><strong>Visão:</strong> Ser a principal referência em soluções financeiras e consórcios no país.</li>
                      <li><strong>Valores:</strong> Transparência absoluta, foco nas pessoas, excelência no atendimento e ética comercial.</li>
                    </ul>
                    <p>Assista ao vídeo acima completo para entender o posicionamento da marca no mercado financeiro.</p>`
        },
        {
          id: "onboarding_m2",
          title: "2. Nossa História e Trajetória",
          duration: "08:45",
          videoText: "Conheça a linha do tempo e marcos importantes da empresa.",
          content: `<p>A Seven Gold nasceu com o propósito de transformar a assessoria de crédito e consórcios no Brasil.</p>
                    <p>Fundada com a premissa de que o cliente não deve apenas adquirir um produto, mas sim entender o seu planejamento financeiro de longo prazo, a empresa cresceu focando em parcerias sólidas com as maiores administradoras do país.</p>
                    <p>Marcos importantes abordados nesta aula:</p>
                    <ul>
                      <li>Nossa fundação e primeiros escritórios.</li>
                      <li>A expansão para o atendimento digital e nacional.</li>
                      <li>Nossos recordes de faturamento e volumes de crédito contemplado.</li>
                    </ul>`
        },
        {
          id: "onboarding_m3",
          title: "3. Ferramentas e CRM Operacional",
          duration: "06:30",
          videoText: "Tutorial completo de como usar o CRM e as ferramentas de trabalho.",
          content: `<p>Esta aula é um guia prático sobre os recursos que você utilizará diariamente:</p>
                    <ul>
                      <li><strong>CRM Comercial:</strong> Organização do funil de vendas (Leads, Sem Contato, Em Atendimento, Simulação, Proposta, etc.).</li>
                      <li><strong>Painel de Atendimento:</strong> Registro de simulações de parcelas, lance embutido e emissão de propostas.</li>
                      <li><strong>Painel Financeiro:</strong> Onde você acompanha seu Borderô de Comissões, solicita adiantamentos e assina seus demonstrativos de comissão mensal.</li>
                    </ul>
                    <p>Lembre-se: manter o CRM atualizado é fundamental para o comissionamento correto das suas vendas.</p>`
        }
      ]
    },
    consorcio: {
      id: "consorcio",
      title: "Especialista em Consórcio",
      description: "Treinamento essencial de produto. Domine o funcionamento das assembleias, lances, parcelas e técnicas avançadas de fechamento.",
      icon: "wallet",
      badge: "Produto",
      modules: [
        {
          id: "consorcio_m1",
          title: "1. O que é Consórcio? (Básico)",
          duration: "10:15",
          videoText: "Conceitos fundamentais de grupos, cotas e assembleias.",
          content: `<p>Neste módulo inicial sobre produto, estudamos a estrutura técnica do consórcio:</p>
                    <ul>
                      <li><strong>O Grupo:</strong> A união de pessoas físicas ou jurídicas com o mesmo objetivo de poupança comum.</li>
                      <li><strong>A Cota:</strong> A identificação de cada consorciado dentro do grupo.</li>
                      <li><strong>A Contemplação:</strong> A atribuição do crédito ao consorciado por meio de sorteio ou lance.</li>
                      <li><strong>Taxa de Administração:</strong> A remuneração cobrada pela administradora (diluída nas parcelas, sem juros).</li>
                    </ul>`
        },
        {
          id: "consorcio_m2",
          title: "2. Consórcio vs Financiamento",
          duration: "12:20",
          videoText: "Aprenda a fazer o comparativo matemático de custos e taxas.",
          content: `<p>Uma das principais ferramentas de vendas é a comparação financeira real:</p>
                    <ul>
                      <li><strong>Juros Zero:</strong> No consórcio não há cobrança de juros, apenas Taxa de Administração e Fundo de Reserva, o que torna o custo total de 2 a 3 vezes menor que um financiamento bancário comum.</li>
                      <li><strong>Poder de Compra à Vista:</strong> Ao ser contemplada, a carta de crédito equivale a dinheiro em mãos, garantindo descontos na negociação do imóvel ou veículo.</li>
                      <li><strong>Liberdade de Escolha:</strong> O consorciado pode escolher qualquer bem dentro da categoria do grupo (ex: qualquer casa em qualquer lugar do Brasil).</li>
                    </ul>`
        },
        {
          id: "consorcio_m3",
          title: "3. Abordagem Comercial e Prospecção",
          duration: "09:40",
          videoText: "Técnicas de conversão rápida e qualificação de leads frios.",
          content: `<p>Como abordar e prender a atenção do cliente nos primeiros 30 segundos:</p>
                    <ul>
                      <li><strong>Perguntas de Qualificação:</strong> Investigue o objetivo do cliente (investimento, fuga de juros ou compra planejada).</li>
                      <li><strong>Gatilhos Mentais:</strong> Escassez de cotas em grupos de contemplação rápida, autoridade da marca e provas sociais.</li>
                      <li><strong>Script de Atendimento:</strong> Estruturação da conversa desde a abordagem inicial até o agendamento da simulação de lances.</li>
                    </ul>`
        },
        {
          id: "consorcio_m4",
          title: "4. Simulação de Lances e Fechamento",
          duration: "08:15",
          videoText: "Estratégias de lances (fixo, embutido, livre) e preenchimento de proposta.",
          content: `<p>Esta aula aborda as estratégias que definem a contemplação rápida do cliente:</p>
                    <ul>
                      <li><strong>Lance Embutido:</strong> Utilização de até 30% da própria carta de crédito para ofertar o lance (reduzindo o aporte do cliente).</li>
                      <li><strong>Lance Fixo:</strong> Ofertas pré-determinadas (geralmente 20% ou 30% do saldo do grupo).</li>
                      <li><strong>Lance Livre:</strong> Oferta com recursos próprios do cliente.</li>
                      <li><strong>Fechamento:</strong> Como conduzir o cliente a assinar a proposta de adesão e realizar o primeiro pagamento.</li>
                    </ul>`
        }
      ]
    }
  };

  if (window.SEVEN_GOLD_CURRICULUM) {
    Object.assign(COURSES_DATA, window.SEVEN_GOLD_CURRICULUM);
  }

  let userProgress = {};
  let activeCourseId = null;
  let activeModuleId = null;

  const getClient = () => window.sevenGoldAuth;

  const loadProgress = async () => {
    const client = getClient();
    if (!client) return;

    try {
      const session = (await client.auth.getSession()).data.session;
      if (session?.user) {
        const metadata = session.user.user_metadata || {};
        userProgress = metadata.crm_learning_progress || {};
      }
    } catch (e) {
      console.warn("Erro ao obter progresso de aprendizagem:", e);
    }
  };

  const saveProgress = async () => {
    const client = getClient();
    if (!client) return;

    try {
      await client.auth.updateUser({
        data: { crm_learning_progress: userProgress }
      });
      
      // Update session storage copy
      const sessionData = await client.auth.getSession();
      if (sessionData.data.session) {
        sessionData.data.session.user.user_metadata.crm_learning_progress = userProgress;
      }
    } catch (e) {
      console.error("Erro ao salvar progresso no Supabase:", e);
    }
  };

  const calculateCourseProgress = (courseId) => {
    const course = COURSES_DATA[courseId];
    if (!course) return 0;
    
    const total = course.modules.length;
    let completed = 0;
    
    course.modules.forEach(m => {
      if (userProgress[m.id]) completed++;
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const escapeHtml = (value = "") => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const parseYouTubeTime = (value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    if (/^\d+$/.test(normalized)) return Number(normalized);

    const match = normalized.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!match) return 0;
    return (Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3]);
  };

  const getYouTubeVideo = (module = {}) => {
    const configuredUrl = module.youtubeUrl || window.SEVEN_GOLD_YOUTUBE_VIDEOS?.[module.id];
    if (!configuredUrl) return null;

    try {
      const rawUrl = String(configuredUrl).trim();
      const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      let videoId = "";

      if (hostname === "youtu.be") {
        videoId = url.pathname.split("/").filter(Boolean)[0] || "";
      } else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(hostname)) {
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
        if (["embed", "shorts", "live"].includes(pathParts[0])) videoId = pathParts[1] || "";
      }

      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

      const startAt = parseYouTubeTime(url.searchParams.get("start") || url.searchParams.get("t"));
      const embedParams = new URLSearchParams({
        controls: "0",
        disablekb: "1",
        fs: "0",
        iv_load_policy: "3",
        playsinline: "1",
        rel: "0",
      });
      if (startAt > 0) embedParams.set("start", String(startAt));

      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${embedParams.toString()}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}${startAt > 0 ? `&t=${startAt}s` : ""}`,
      };
    } catch (error) {
      console.warn(`Link do YouTube inválido na aula ${module.id}:`, configuredUrl);
      return null;
    }
  };

  const renderYouTubePlayer = (module = {}) => {
    const youtubeVideo = getYouTubeVideo(module);

    if (!youtubeVideo) {
      return `
        <div class="video-youtube-pending" role="status">
          <div class="video-youtube-pending-icon"><i data-lucide="youtube"></i></div>
          <strong>Vídeo pendente</strong>
          <span>${escapeHtml(module.videoText || "O link desta aula será adicionado em breve.")}</span>
        </div>
      `;
    }

    return `
      <iframe
        class="video-youtube-iframe"
        src="${escapeHtml(youtubeVideo.embedUrl)}"
        title="Vídeo da aula: ${escapeHtml(module.title)}"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="autoplay; encrypted-media"
      ></iframe>
      <a class="video-youtube-open-link" href="${escapeHtml(youtubeVideo.watchUrl)}" target="_blank" rel="noopener noreferrer">
        <i data-lucide="external-link"></i> Abrir no YouTube
      </a>
    `;
  };

  const stripHtml = (value = "") => String(value || "").replace(/<[^>]*>/g, " ");

  const normalizeSearchText = (value = "") => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

  const getCourseSearchText = (course = {}) => normalizeSearchText([
    course.id,
    course.title,
    course.description,
    course.badge,
    course.icon,
    ...(course.modules || []).flatMap((module) => [
      module.id,
      module.title,
      module.duration,
      module.videoText,
      stripHtml(module.content),
    ]),
  ].join(" "));

  const getCourseMatchesSearch = (course = {}, query = "") => {
    const normalizedQuery = normalizeSearchText(query);
    return !normalizedQuery || getCourseSearchText(course).includes(normalizedQuery);
  };

  const getPendingModuleMatchesSearch = (item = {}, query = "") => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;
    const course = COURSES_DATA[item.courseId] || {};
    const module = (course.modules || []).find((entry) => entry.id === item.moduleId) || {};
    return normalizeSearchText([
      item.courseId,
      item.courseTitle,
      item.courseBadge,
      item.moduleId,
      item.moduleTitle,
      item.moduleDuration,
      module.videoText,
      stripHtml(module.content),
    ].join(" ")).includes(normalizedQuery);
  };

  let currentLmsSubTab = 'cursos';
  let currentCourseSearchQuery = '';

  const renderDashboard = ({ focusSearch = false, selectionStart = null, selectionEnd = null } = {}) => {
    const lmsTab = document.querySelector('[data-tab="faculdade"]');
    if (!lmsTab) return;

    // Calculate totals
    let totalModules = 0;
    let completedModules = 0;
    let unlockedCertificates = 0;
    let pendingModulesList = [];

    Object.keys(COURSES_DATA).forEach(cId => {
      const course = COURSES_DATA[cId];
      totalModules += course.modules.length;
      
      let courseCompleted = true;
      course.modules.forEach(m => {
        if (userProgress[m.id]) {
          completedModules++;
        } else {
          courseCompleted = false;
          pendingModulesList.push({
            courseId: cId,
            courseTitle: course.title,
            courseBadge: course.badge,
            moduleId: m.id,
            moduleTitle: m.title,
            moduleDuration: m.duration
          });
        }
      });
      if (courseCompleted && course.modules.length > 0) {
        unlockedCertificates++;
      }
    });

    // Filter courses based on search query
    const filteredCourseIds = Object.keys(COURSES_DATA).filter(cId => getCourseMatchesSearch(COURSES_DATA[cId], currentCourseSearchQuery));
    const filteredPendingModulesList = pendingModulesList.filter(item => getPendingModuleMatchesSearch(item, currentCourseSearchQuery));
    const safeSearchQuery = escapeHtml(currentCourseSearchQuery);

    let tabContentHTML = '';

    if (currentLmsSubTab === 'cursos') {
      tabContentHTML = `
        <h2 class="faculdade-courses-title"><i data-lucide="library" style="color:#d4af37; width:20px;"></i> Cursos Disponíveis</h2>
        ${filteredCourseIds.length === 0 ? `
          <div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; text-align: center; color: #94a3b8;">
            <i data-lucide="search-x" style="width:40px; height:40px; color:#d4af37; margin-bottom:12px;"></i>
            <h3 style="margin:0; font-size:1.1rem; color:#fff;">Nenhum curso encontrado para "${safeSearchQuery}"</h3>
            <p style="margin:6px 0 16px; font-size:0.86rem;">Tente pesquisar com outros termos ou limpe o campo de busca.</p>
            <button type="button" id="faculdade-clear-search-btn" class="bordero-btn-secondary" style="padding: 8px 16px;">Limpar Pesquisa</button>
          </div>
        ` : `
          <section class="faculdade-courses-grid">
            ${filteredCourseIds.map(cId => {
              const course = COURSES_DATA[cId];
              const pct = calculateCourseProgress(cId);
              return `
                <article class="course-card">
                  <span class="course-badge">${course.badge}</span>
                  <div class="course-card-banner">
                    <div class="course-card-banner-icon"><i data-lucide="${course.icon}"></i></div>
                  </div>
                  <div class="course-card-content">
                    <h3 class="course-card-title">${course.title}</h3>
                    <p class="course-card-desc">${course.description}</p>
                    
                    <div class="course-meta">
                      <span><i data-lucide="book" style="width:12px; height:12px;"></i> ${course.modules.length} Aulas</span>
                      <span><i data-lucide="clock" style="width:12px; height:12px;"></i> ~${course.modules.length * 8} min</span>
                    </div>

                    <div class="course-progress-container">
                      <div class="course-progress-header">
                        <span>Progresso</span>
                        <span>${pct}%</span>
                      </div>
                      <div class="course-progress-bar-bg">
                        <div class="course-progress-bar-fill" style="width: ${pct}%"></div>
                      </div>
                    </div>

                    <button type="button" class="course-card-btn" data-action-course="${cId}">
                      ${pct === 100 ? "Rever Aulas" : pct > 0 ? "Continuar Curso" : "Iniciar Curso"}
                    </button>
                  </div>
                </article>
              `;
            }).join('')}
          </section>
        `}
      `;
    } else if (currentLmsSubTab === 'certificados') {
      tabContentHTML = `
        <h2 class="faculdade-courses-title"><i data-lucide="award" style="color:#d4af37; width:20px;"></i> Meus Certificados e Conquistas</h2>
        <section class="faculdade-courses-grid">
          ${filteredCourseIds.map(cId => {
            const course = COURSES_DATA[cId];
            const pct = calculateCourseProgress(cId);
            const isCompleted = pct === 100;
            return `
              <article class="course-card" style="${isCompleted ? 'border-color: rgba(212, 175, 55, 0.4); background: rgba(212, 175, 55, 0.03);' : ''}">
                <span class="course-badge" style="${isCompleted ? 'background: rgba(212, 175, 55, 0.2); color: #f4cf5d; border-color: rgba(212, 175, 55, 0.4);' : ''}">${isCompleted ? 'Certificado Liberado' : 'Em Andamento'}</span>
                <div class="course-card-banner">
                  <div class="course-card-banner-icon"><i data-lucide="award" style="${isCompleted ? 'color:#d4af37;' : ''}"></i></div>
                </div>
                <div class="course-card-content">
                  <h3 class="course-card-title">Certificado de ${course.title}</h3>
                  <p class="course-card-desc">${isCompleted ? 'Você concluiu 100% dos módulos. Seu certificado de conclusão oficial está liberado!' : `Progresso atual: ${pct}%. Conclua todas as aulas para liberar seu certificado.`}</p>

                  <div class="course-progress-container" style="margin-top:12px;">
                    <div class="course-progress-header">
                      <span>Status do Certificado</span>
                      <span>${pct}%</span>
                    </div>
                    <div class="course-progress-bar-bg">
                      <div class="course-progress-bar-fill" style="width: ${pct}%; background:${isCompleted ? '#d4af37' : 'linear-gradient(90deg, #d4af37, #f4cf5d)'}"></div>
                    </div>
                  </div>

                  ${isCompleted ? `
                    <button type="button" class="course-card-btn" data-action-view-cert="${cId}" style="background:#d4af37; color:#000; font-weight:800; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                      <i data-lucide="award" style="width:16px; height:16px;"></i> Visualizar Certificado PDF
                    </button>
                  ` : `
                    <button type="button" class="course-card-btn" data-action-course="${cId}">
                      Concluir Aulas Pendentes
                    </button>
                  `}
                </div>
              </article>
            `;
          }).join('')}
        </section>
      `;
    } else if (currentLmsSubTab === 'pendencias') {
      tabContentHTML = `
        <h2 class="faculdade-courses-title"><i data-lucide="clock" style="color:#d4af37; width:20px;"></i> Aulas e Módulos Pendentes (${filteredPendingModulesList.length})</h2>
        ${filteredPendingModulesList.length === 0 ? `
          <div style="background: rgba(212, 175, 55, 0.05); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 16px; padding: 40px; text-align: center; color: #f3f4f6;">
            <i data-lucide="${pendingModulesList.length === 0 ? "check-circle-2" : "search-x"}" style="width: 48px; height: 48px; color: #d4af37; margin-bottom: 12px;"></i>
            <h3 style="margin: 0; font-size: 1.2rem; color: #f4cf5d;">${pendingModulesList.length === 0 ? "Tudo em Dia!" : `Nenhuma pendência encontrada para "${safeSearchQuery}"`}</h3>
            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 0.9rem;">${pendingModulesList.length === 0 ? "Parabéns! Você já concluiu 100% de todas as aulas e módulos da Faculdade Seven Gold." : "Tente pesquisar com outros termos ou limpe o campo de busca."}</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${filteredPendingModulesList.map(item => `
              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <span style="font-size: 0.7rem; font-weight: 800; color: #d4af37; text-transform: uppercase; letter-spacing: 0.05em;">${item.courseBadge} • ${item.courseTitle}</span>
                  <h4 style="margin: 0; font-size: 1rem; color: #fff; font-weight: 700;">${item.moduleTitle}</h4>
                  <span style="font-size: 0.78rem; color: #94a3b8;"><i data-lucide="clock" style="width:12px; height:12px; vertical-align:middle;"></i> Duração: ~${item.moduleDuration}</span>
                </div>
                <button type="button" class="course-card-btn" data-action-play-module="${item.courseId}:${item.moduleId}" style="width: auto; padding: 10px 20px; display: inline-flex; align-items: center; gap: 6px;">
                  <i data-lucide="play-circle" style="width: 16px; height: 16px;"></i> Assistir Aula
                </button>
              </div>
            `).join('')}
          </div>
        `}
      `;
    }

    lmsTab.innerHTML = `
      <div class="faculdade-container">
        <!-- Header -->
        <header class="faculdade-header">
          <div class="faculdade-header-main eq-header-left">
            <div class="eq-header-icon-box" style="background: rgba(212, 175, 55, 0.1); color: #d4af37; border-color: rgba(212, 175, 55, 0.28); flex-shrink: 0;">
              <i data-lucide="graduation-cap"></i>
            </div>
            <div class="eq-header-title">
              <h1 style="color:#fff; font-size:1.5rem; margin:0;">Faculdade Seven Gold</h1>
              <p style="color:#94a3b8; font-size:0.84rem; margin:2px 0 0;">Plataforma de capacitação, onboarding e certificação de colaboradores.</p>
            </div>
          </div>
          <div class="faculdade-header-actions">
            <a href="painel.html" class="faculdade-panel-back-btn">
              <i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i>
              <span>Voltar aos Painéis</span>
            </a>
            <button type="button" data-logout data-logout-redirect="index.html" class="faculdade-logout-btn" style="background: #ffffff !important; background-color: #ffffff !important; color: #b98220 !important; border-color: rgba(212, 175, 55, 0.42) !important;">
              <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
              <span>Sair</span>
            </button>
          </div>
        </header>

        <!-- Top Sub-Tabs Bar & Search Box -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 6px; margin-bottom: 14px; border-bottom: 1.5px solid rgba(255, 255, 255, 0.08); padding-bottom: 14px;">
          <nav class="faculdade-subtabs-nav" style="border: none; padding: 0; margin: 0;">
            <button type="button" class="faculdade-tab-btn ${currentLmsSubTab === 'cursos' ? 'active' : ''}" data-faculdade-tab="cursos">
              <i data-lucide="book-open"></i> Cursos
            </button>
            <button type="button" class="faculdade-tab-btn ${currentLmsSubTab === 'certificados' ? 'active' : ''}" data-faculdade-tab="certificados">
              <i data-lucide="award"></i> Certificados <span class="badge">${unlockedCertificates}</span>
            </button>
            <button type="button" class="faculdade-tab-btn ${currentLmsSubTab === 'pendencias' ? 'active' : ''}" data-faculdade-tab="pendencias">
              <i data-lucide="clock"></i> Pendências <span class="badge">${pendingModulesList.length}</span>
            </button>
          </nav>

          <div class="faculdade-search-box" style="position: relative; min-width: 260px; max-width: 380px; flex: 1;">
            <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; pointer-events: none; z-index: 2;"></i>
            <input type="search" id="faculdade-course-search" placeholder="Pesquisar curso por nome ou tema..." value="${safeSearchQuery}" autocomplete="off" spellcheck="false" aria-label="Pesquisar curso por nome ou tema" style="width: 100%; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; padding: 9px 12px 9px 40px; color: #ffffff; font-size: 0.85rem; font-family: inherit; outline: none; box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);" />
          </div>
        </div>

        <!-- Stats Grid -->
        <section class="faculdade-stats" aria-label="Estatísticas de estudo">
          <div class="faculdade-stats-card">
            <div class="faculdade-stats-info">
              <span>Aulas Concluídas</span>
              <strong>${completedModules} de ${totalModules}</strong>
            </div>
            <div class="faculdade-stats-icon"><i data-lucide="book-open"></i></div>
          </div>
          <div class="faculdade-stats-card">
            <div class="faculdade-stats-info">
              <span>Progresso Total</span>
              <strong>${totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0}%</strong>
            </div>
            <div class="faculdade-stats-icon"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="faculdade-stats-card">
            <div class="faculdade-stats-info">
              <span>Certificados Obtidos</span>
              <strong>${unlockedCertificates} de ${Object.keys(COURSES_DATA).length}</strong>
            </div>
            <div class="faculdade-stats-icon"><i data-lucide="award"></i></div>
          </div>
        </section>

        <!-- Tab Content -->
        ${tabContentHTML}
      </div>
    `;

    // Add event listener for course search input
    const searchInput = document.getElementById('faculdade-course-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentCourseSearchQuery = e.target.value;
        renderDashboard({
          focusSearch: true,
          selectionStart: e.target.selectionStart,
          selectionEnd: e.target.selectionEnd,
        });
      });
      if (focusSearch) {
        searchInput.focus();
        const cursorStart = Number.isInteger(selectionStart) ? selectionStart : searchInput.value.length;
        const cursorEnd = Number.isInteger(selectionEnd) ? selectionEnd : cursorStart;
        searchInput.setSelectionRange(cursorStart, cursorEnd);
      }
    }

    const clearSearchBtn = document.getElementById('faculdade-clear-search-btn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        currentCourseSearchQuery = '';
        renderDashboard();
      });
    }

    // Add event listeners for top sub-tabs
    document.querySelectorAll('[data-faculdade-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLmsSubTab = btn.dataset.faculdadeTab;
        renderDashboard();
      });
    });

    // Add event listeners to course buttons
    document.querySelectorAll('[data-action-course]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.dataset.actionCourse;
        openCourse(cId);
      });
    });

    // Add event listeners to view certificate buttons
    document.querySelectorAll('[data-action-view-cert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.dataset.actionViewCert;
        renderCertificateView(cId);
      });
    });

    // Add event listeners to play pending module buttons
    document.querySelectorAll('[data-action-play-module]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [cId, mId] = btn.dataset.actionPlayModule.split(':');
        renderClassroom(cId, mId);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  };

  const openCourse = (courseId) => {
    activeCourseId = courseId;
    const course = COURSES_DATA[courseId];
    if (!course) return;

    // Load first incomplete module or the first module
    let targetModule = course.modules[0];
    for (const m of course.modules) {
      if (!userProgress[m.id]) {
        targetModule = m;
        break;
      }
    }
    
    renderClassroom(courseId, targetModule.id);
  };

  const renderClassroom = (courseId, moduleId) => {
    activeModuleId = moduleId;
    const course = COURSES_DATA[courseId];
    if (!course) return;
    
    const module = course.modules.find(m => m.id === moduleId);
    if (!module) return;

    const lmsTab = document.querySelector('[data-tab="faculdade"]');
    if (!lmsTab) return;

    const isAllModulesCompleted = course.modules.every(m => userProgress[m.id]);

    lmsTab.innerHTML = `
      <div class="faculdade-container">
        <div class="classroom-layout">
          <!-- Sidebar -->
          <aside class="classroom-sidebar">
            <div class="classroom-sidebar-header">
              <button type="button" id="classroom-back-to-dash">
                <i data-lucide="chevron-left" style="width:14px; height:14px;"></i> Voltar à Faculdade
              </button>
              <h3>${course.title}</h3>
            </div>
            
            <nav class="classroom-sidebar-list" aria-label="Aulas do curso">
              ${course.modules.map((m, idx) => {
                const isCompleted = userProgress[m.id];
                const isActive = m.id === moduleId;
                
                let iconName = "circle";
                if (isCompleted) iconName = "check-circle-2";
                if (isActive) iconName = "play-circle";

                return `
                  <div class="module-nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" data-module-nav-id="${m.id}">
                    <span class="module-nav-title">
                      <i data-lucide="${iconName}" style="width:14px; height:14px; flex-shrink:0;"></i>
                      <span>${m.title}</span>
                    </span>
                    <span style="font-size:0.68rem; opacity:0.7;">${m.duration}</span>
                  </div>
                `;
              }).join('')}

              ${isAllModulesCompleted ? `
                <div class="module-nav-item" id="nav-item-cert" style="border: 1px solid rgba(212, 175, 55, 0.3); background: rgba(212, 175, 55, 0.05); color: #d4af37; margin-top: 12px; font-weight:700;">
                  <span class="module-nav-title">
                    <i data-lucide="award" style="width:14px; height:14px;"></i>
                    <span>Ver Certificado</span>
                  </span>
                </div>
              ` : ''}
            </nav>
          </aside>

          <!-- Main Classroom Area -->
          <main class="classroom-main" id="classroom-content-panel">
            <!-- YouTube Player -->
            <div class="video-youtube-player" id="lms-video-container">
              ${renderYouTubePlayer(module)}
            </div>

            <!-- Header Info -->
            <section class="classroom-header" aria-label="Cabeçalho da aula">
              <h1 class="classroom-title">${module.title}</h1>
              <p class="classroom-subtitle"><i data-lucide="book-open" style="width:12px; height:12px; vertical-align:middle;"></i> Conteúdo didático de estudo individual</p>
            </section>

            <!-- Learning content -->
            <section class="classroom-study-content" aria-label="Conteúdo da aula">
              ${module.content}
            </section>

            <!-- Actions block -->
            <section class="classroom-action-box" aria-label="Ações de conclusão da aula">
              <label class="class-checkbox-label">
                <input type="checkbox" id="lms-mark-complete" ${userProgress[module.id] ? 'checked' : ''} />
                <span>Marcar aula como concluída</span>
              </label>
              
              <div style="display:flex; gap:8px;">
                <button type="button" class="bordero-btn-secondary" id="lms-prev-class-btn"><i data-lucide="arrow-left"></i> Anterior</button>
                <button type="button" class="bordero-btn-primary" id="lms-next-class-btn">Próxima <i data-lucide="arrow-right"></i></button>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;

    // Back to dashboard
    document.getElementById('classroom-back-to-dash').addEventListener('click', renderDashboard);

    // Sidebar navigation items
    document.querySelectorAll('[data-module-nav-id]').forEach(nav => {
      nav.addEventListener('click', () => {
        renderClassroom(courseId, nav.dataset.moduleNavId);
      });
    });

    if (isAllModulesCompleted) {
      document.getElementById('nav-item-cert')?.addEventListener('click', () => {
        renderCertificateView(courseId);
      });
    }

    // Checkbox complete event
    const chk = document.getElementById('lms-mark-complete');
    chk?.addEventListener('change', async () => {
      userProgress[module.id] = chk.checked;
      await saveProgress();
      
      // Dynamic refresh sidebar state without full reload
      const sidebarItem = document.querySelector(`[data-module-nav-id="${module.id}"]`);
      if (sidebarItem) {
        if (chk.checked) {
          sidebarItem.classList.add('completed');
          sidebarItem.querySelector('i')?.setAttribute('data-lucide', 'check-circle-2');
        } else {
          sidebarItem.classList.remove('completed');
          sidebarItem.querySelector('i')?.setAttribute('data-lucide', 'circle');
        }
      }
      
      // Update certificate link visibility if course just completed
      const allDone = course.modules.every(m => userProgress[m.id]);
      if (allDone && !document.getElementById('nav-item-cert')) {
        renderClassroom(courseId, moduleId); // quick redraw to inject certificate tab
      } else if (!allDone && document.getElementById('nav-item-cert')) {
        document.getElementById('nav-item-cert').remove();
      }

      if (window.lucide) window.lucide.createIcons();
    });

    // Navigation buttons
    const mIdx = course.modules.findIndex(m => m.id === moduleId);
    
    const prevBtn = document.getElementById('lms-prev-class-btn');
    if (mIdx === 0) {
      prevBtn.style.opacity = '0.5';
      prevBtn.disabled = true;
    } else {
      prevBtn.addEventListener('click', () => {
        renderClassroom(courseId, course.modules[mIdx - 1].id);
      });
    }

    const nextBtn = document.getElementById('lms-next-class-btn');
    if (mIdx === course.modules.length - 1) {
      if (isAllModulesCompleted) {
        nextBtn.innerHTML = `Ver Certificado <i data-lucide="award"></i>`;
        nextBtn.addEventListener('click', () => renderCertificateView(courseId));
      } else {
        nextBtn.style.opacity = '0.5';
        nextBtn.disabled = true;
      }
    } else {
      nextBtn.addEventListener('click', () => {
        renderClassroom(courseId, course.modules[mIdx + 1].id);
      });
    }

    if (window.lucide) window.lucide.createIcons();
  };

  const renderCertificateView = (courseId) => {
    const course = COURSES_DATA[courseId];
    if (!course) return;

    const lmsTab = document.querySelector('[data-tab="faculdade"]');
    if (!lmsTab) return;

    // Get current logged-in user name
    const userNameEl = document.querySelector('[data-user-name]');
    const userName = userNameEl ? userNameEl.textContent.trim() : 'Colaborador Seven Gold';

    // Current date formatted
    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    lmsTab.innerHTML = `
      <div class="faculdade-container">
        <!-- Toolbar -->
        <section class="bordero-toolbar" aria-label="Toolbar do certificado">
          <button type="button" class="bordero-btn-secondary" id="cert-back-to-course">
            <i data-lucide="arrow-left"></i> Voltar ao Curso
          </button>
          <div style="display:flex; gap:8px;">
            <button type="button" class="bordero-btn-primary" id="cert-pdf-export-btn"><i data-lucide="file-down"></i> Salvar Certificado PDF</button>
          </div>
        </section>

        <!-- Preview panel and sheet -->
        <div class="certificate-preview-panel">
          <div class="certificate-preview-icon"><i data-lucide="award"></i></div>
          <h2 style="color:#fff; font-size:1.25rem; font-weight:800; margin:0;">Parabéns! Curso concluído com sucesso.</h2>
          <p style="color:#9ca3af; font-size:0.82rem; margin:0 0 12px;">Seu certificado de conclusão foi gerado eletronicamente e está pronto para exportação.</p>
        </div>

        <!-- A4 Printable Certificate Area -->
        <div class="certificate-sheet" id="lms-certificate-print-area">
          <div class="certificate-watermark">SEVEN GOLD</div>
          
          <div class="certificate-sheet-content">
            <div class="certificate-logo">SEVEN GOLD ACADEMY</div>
            
            <div class="certificate-certifies">Certificado de Conclusão</div>
            
            <p style="font-size:0.86rem; color:#666; font-style:italic; margin-bottom:8px;">Certificamos para os devidos fins que</p>
            
            <div class="certificate-recipient">${userName}</div>
            
            <p class="certificate-text">
              concluiu com êxito o programa de treinamento profissional e capacitação interna em 
              <strong>${course.title}</strong> ministrado corporativamente, com carga horária avaliada, 
              obtendo aproveitamento pleno no domínio técnico e teórico de todos os módulos.
            </p>

            <!-- Seal -->
            <div style="margin: 24px 0 16px;">
              <svg class="certificate-seal" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <div style="font-size:0.6rem; font-weight:800; letter-spacing:1px; color:#b8860b;">SELO DE EXCELÊNCIA</div>
            </div>

            <!-- Signatures -->
            <div class="certificate-signatures">
              <div class="certificate-sig-block">
                <div class="certificate-sig-line">Diretoria Seven Gold</div>
                <div class="certificate-sig-title">Conselho de Onboarding</div>
              </div>
              <div class="certificate-sig-block">
                <div class="certificate-sig-line">${dateFormatted}</div>
                <div class="certificate-sig-title">Data de Conclusão</div>
              </div>
            </div>

            <div class="certificate-footer-meta">
              Código de Autenticação Digital: SG-ACAD-${courseId.toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('cert-back-to-course').addEventListener('click', () => {
      openCourse(courseId);
    });

    // Export PDF via html2pdf
    document.getElementById('cert-pdf-export-btn').addEventListener('click', () => {
      const element = document.getElementById('lms-certificate-print-area');
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `Certificado_SevenGold_${courseId}_${userName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      if (window.html2pdf) {
        window.html2pdf().from(element).set(opt).save();
      } else {
        alert("Erro: Biblioteca html2pdf não foi carregada no navegador.");
      }
    });

    if (window.lucide) window.lucide.createIcons();
  };

  // Run on startup
  const initLmsModule = async () => {
    // Check if we are running in the standalone page
    const isStandalone = document.body.dataset.page === "faculdade";
    if (isStandalone) {
      await loadProgress();
      renderDashboard();
      return;
    }

    // Otherwise, we are in the CRM SPA: hook tab switches
    const faculdadeLink = document.querySelector('a[href="#faculdade"]');
    if (faculdadeLink) {
      faculdadeLink.addEventListener('click', async () => {
        await loadProgress();
        renderDashboard();
      });
    }

    if (window.location.hash === "#faculdade") {
      await loadProgress();
      renderDashboard();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLmsModule);
  } else {
    initLmsModule();
  }
})();
