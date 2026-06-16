# CRM Seven Gold - Sistema de Gestão Interna & CRM comercial

Este repositório contém o código-fonte do **CRM Seven Gold**, um aplicativo web unificado para o controle comercial e administrativo da **Seven Gold Financeira**.

---

## 🚀 Arquitetura & Tecnologias
O projeto foi desenvolvido prezando por alto desempenho, leveza e facilidade de deploy:
* **Frontend**: HTML5 semântico, CSS3 customizado (`home.css`, `painel.css`) e JavaScript Moderno (Vanilla JS).
* **PWA (Progressive Web App)**: Instalável em dispositivos móveis e desktops, suportado por um Manifesto de Web App (`manifest.json`) e um Service Worker (`service-worker.js`) para cache local de arquivos estáticos.
* **Backend & Banco de Dados**: Integração direta via cliente JS com o **Supabase** (Autenticação, Banco de Dados PostgreSQL e Storage de arquivos).
* **Ícones**: Biblioteca Lucide Icons carregada via CDN.
* **Hospedagem & Deploy**: Hospedado na plataforma **Vercel** (`crm-seven-gold-nu.vercel.app`).

---

## 📢 Diretrizes Críticas para Desenvolvedores e IAs (Instruções de Edição)

> [!IMPORTANT]  
> Se você for uma Inteligência Artificial (como Antigravity, Codex ou outras) ou um desenvolvedor editando este código, siga rigorosamente as instruções abaixo para evitar problemas de cache e garantir que o deploy funcione corretamente.

### 1. Sistema de Deploy Automático
* Qualquer alteração commitada e enviada para o branch **`main`** (`git push origin main`) é compilada e implantada automaticamente na Vercel em poucos segundos.
* Sempre finalize as tarefas e faça o push das alterações para que as atualizações fiquem imediatamente disponíveis em produção.

### 2. Controle de Cache (Evitando Cache Persistente do PWA)
Por ser um PWA com Service Worker, o navegador do cliente salva localmente os arquivos de folha de estilo (`home.css`) e o motor administrativo (`admin-shell.js`). Se você alterar o conteúdo desses arquivos e não atualizar as versões nas referências, **o usuário final não verá as alterações**.

Sempre que alterar arquivos CSS ou JS comuns, você **DEVE**:
1. **Incrementar a versão do Cache** no arquivo [service-worker.js](file:///c:/Users/Jhow/Documents/GitHub/crm-seven-gold/service-worker.js):
   * Mude o valor da constante `CACHE_VERSION` (ex: de `"seven-gold-v4"` para `"seven-gold-v5"`). Isso avisa ao navegador dos usuários que há um novo cache a ser instalado.
2. **Atualizar a query de versão (Cache Busting)** em todos os arquivos HTML que referenciam o arquivo alterado:
   * Incremente a query de versão nos links de carregamento (ex: mudar `home.css?v=31` para `home.css?v=32` e `admin-shell.js?v=31` para `admin-shell.js?v=32`).

### 3. Organização de Arquivos do Painel Administrativo
* A estrutura visual de navegação do painel é injetada dinamicamente pelo script [admin-shell.js](file:///c:/Users/Jhow/Documents/GitHub/crm-seven-gold/admin-shell.js) em todas as páginas que possuam o atributo `data-unified-admin` na tag `<body>`.
* **Arrastar e Soltar (Drag & Drop)**: O menu lateral permite reordenação arrastando os itens, tanto na mesma categoria quanto entre categorias. A ordem é salva no `localStorage` do navegador do usuário. Se introduzir novos itens de menu, faça-o na estrutura `categories` do [admin-shell.js](file:///c:/Users/Jhow/Documents/GitHub/crm-seven-gold/admin-shell.js).

---

## 📂 Principais Telas e Arquivos Controladores

* **Painel de Entrada (`painel.html`)**: Tela inicial de boas-vindas para seleção entre o CRM e o Painel Empresa.
* **Painel da Empresa (`empresa.html`)**: Central de resumo administrativo (Vendas, Metas, Equipe, Módulos).
* **Documentos (`documentos.html` e `documentos.js`)**: Tela para upload de arquivos em buckets do Supabase Storage por setor e com assinaturas temporárias e seguras de acesso.
* **Financeiro (`financeiro.html` e `financeiro.js`)**: Gerenciamento de fluxo de caixa e lançamentos de repasses.
* **Comissões (`comissoes.html` e `comissoes.js`)**: Tabelas de acompanhamento de ganhos dos colaboradores.
* **História do Dono (`historia-dono.html` e `historia-dono.js`)**: Controle de vendas históricas e metas anuais.
