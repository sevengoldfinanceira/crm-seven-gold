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

  const renderDashboard = () => {
    const lmsTab = document.querySelector('[data-tab="faculdade"]');
    if (!lmsTab) return;

    // Calculate totals
    let totalModules = 0;
    let completedModules = 0;
    let unlockedCertificates = 0;

    Object.keys(COURSES_DATA).forEach(cId => {
      const course = COURSES_DATA[cId];
      totalModules += course.modules.length;
      
      let courseCompleted = true;
      course.modules.forEach(m => {
        if (userProgress[m.id]) {
          completedModules++;
        } else {
          courseCompleted = false;
        }
      });
      if (courseCompleted && course.modules.length > 0) {
        unlockedCertificates++;
      }
    });

    lmsTab.innerHTML = `
      <div class="faculdade-container">
        <!-- Header -->
        <header class="faculdade-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div class="eq-header-left">
            <div class="eq-header-icon-box" style="background: rgba(212, 175, 55, 0.1); color: #d4af37; border-color: rgba(212, 175, 55, 0.28); flex-shrink: 0;">
              <i data-lucide="graduation-cap"></i>
            </div>
            <div class="eq-header-title">
              <h1 style="color:#fff; font-size:1.5rem; margin:0;">Faculdade Seven Gold</h1>
              <p style="color:#94a3b8; font-size:0.84rem; margin:2px 0 0;">Plataforma de capacitação, onboarding e certificação de colaboradores.</p>
            </div>
          </div>
          <a href="painel.html" class="bordero-btn-secondary" style="height: fit-content; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="home"></i> Voltar ao Painel</a>
        </header>

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

        <!-- Courses Section -->
        <h2 class="faculdade-courses-title"><i data-lucide="library" style="color:#d4af37; width:20px;"></i> Cursos Disponíveis</h2>
        
        <section class="faculdade-courses-grid">
          ${Object.keys(COURSES_DATA).map(cId => {
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
      </div>
    `;

    // Add event listeners to card buttons
    document.querySelectorAll('[data-action-course]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.dataset.actionCourse;
        openCourse(cId);
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
            <!-- Mock Player -->
            <div class="video-mock-player" id="lms-video-container">
              <div class="video-thumbnail" id="lms-video-thumb">
                <button type="button" class="video-play-btn" id="lms-video-play-trigger"><i data-lucide="play" fill="#000"></i></button>
                <div style="margin-top:16px; font-size:0.9rem; font-weight:700; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.5); text-align:center;">
                  ${module.videoText}
                </div>
                <span class="video-duration-badge">${module.duration}</span>
              </div>
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

    // Play video simulation
    const playTrigger = document.getElementById('lms-video-play-trigger');
    playTrigger?.addEventListener('click', () => {
      const container = document.getElementById('lms-video-container');
      container.innerHTML = `
        <div class="video-playing-state">
          <div class="video-playing-watermark">SEVEN GOLD ACADEMY</div>
          <div class="video-playing-gif">
            <div class="video-bar"></div>
            <div class="video-bar"></div>
            <div class="video-bar"></div>
            <div class="video-bar"></div>
          </div>
          <div class="video-playing-text">Assistindo aula em vídeo...</div>
          <div class="video-playing-mock-controls">
            <span><i data-lucide="pause" style="width:12px; height:12px; margin-right:4px;"></i> Pausar vídeo</span>
            <span>00:15 / ${module.duration}</span>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    });

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
