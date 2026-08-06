const CentralPendenciasAdmin = {
  carregando: false,
  sincronizando: false,
  eventosRegistrados: false,
  dados: [],
  resumo: {},
  paginacao: { pagina: 1, paginas: 1, total: 0, limite: 50 },
  avisosFontes: [],
  detalheAtual: null,
  catalogoRadios: new Map(),

  async iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }
    await this.carregar(true);
  },

  registrarEventos() {
    const ao = (id, evento, fn) => document.getElementById(id)?.addEventListener(evento, fn);
    ao("central-login", "click", () => this.autenticar());
    ao("central-atualizar", "click", () => this.carregar(true));
    ao("central-filtrar", "click", () => { this.paginacao.pagina = 1; this.buscar(); });
    ao("central-limpar", "click", () => this.limparFiltros());
    ao("central-exportar", "click", () => this.exportarCsv());
    ao("central-anterior", "click", () => this.mudarPagina(-1));
    ao("central-proxima", "click", () => this.mudarPagina(1));
    ao("central-detalhe-fechar", "click", () => this.fecharDetalhe());
    ao("central-detalhe-form", "submit", (evento) => this.salvarDetalhe(evento));
    ao("central-detalhe-abrir-origem", "click", () => this.abrirOrigem(this.detalheAtual));

    ["central-status", "central-prioridade", "central-origem", "central-ativas", "central-limite"]
      .forEach((id) => ao(id, "change", () => { this.paginacao.pagina = 1; this.buscar(); }));
    ao("central-busca", "input", debounce(() => { this.paginacao.pagina = 1; this.buscar(); }, 350));

    document.getElementById("central-table-body")?.addEventListener("click", (evento) => {
      const detalhe = evento.target.closest("[data-central-detalhe]");
      if (detalhe) return this.abrirDetalhe(detalhe.dataset.centralDetalhe);
      const rota = evento.target.closest("[data-central-rota]");
      if (rota) {
        const item = this.dados.find((registro) => registro.id === rota.dataset.centralRota);
        return this.abrirOrigem(item);
      }
      const acao = evento.target.closest("[data-central-status-rapido]");
      if (acao) return this.atualizarStatusRapido(acao.dataset.centralId, acao.dataset.centralStatusRapido);
    });
  },

  async autenticar() {
    const chave = prompt("Digite a chave administrativa. Ela será usada apenas para criar uma sessão temporária:");
    if (chave === null || !String(chave).trim()) return;
    const botao = document.getElementById("central-login");
    if (botao) { botao.disabled = true; botao.textContent = "Entrando…"; }
    try {
      await API.loginAdmin(String(chave).trim());
      await this.carregar(true);
      if (typeof carregarDashboard === "function") carregarDashboard(true);
    } catch (erro) {
      API.definirChaveAdmin("");
      alert(erro.message || "Não foi possível iniciar a sessão administrativa.");
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = "🔐 Entrar e carregar"; }
    }
  },

  atualizarSessao() {
    const autenticado = Boolean(API.chaveAdmin());
    document.getElementById("central-login-panel")?.classList.toggle("hidden", autenticado);
    document.getElementById("central-conteudo")?.classList.toggle("hidden", !autenticado);
  },

  async carregar(sincronizar = false) {
    if (this.carregando) return;
    this.carregando = true;
    this.atualizarSessao();
    this.fecharDetalhe();

    if (!API.chaveAdmin()) {
      this.estado("error", "Sessão administrativa necessária");
      this.carregando = false;
      return;
    }

    const botao = document.getElementById("central-atualizar");
    if (botao) { botao.disabled = true; botao.textContent = "Atualizando…"; }
    this.estado("loading", sincronizar ? "Sincronizando módulos" : "Carregando fila");

    try {
      if (sincronizar) await this.sincronizarFontes();
      await this.buscar();
      this.estado("success", this.avisosFontes.length ? "Fila atualizada com avisos" : "Fila operacional atualizada");
      this.atualizarSessao();
    } catch (erro) {
      console.error("Central de pendências:", erro);
      if (erro.status === 401) {
        API.definirChaveAdmin("");
        this.atualizarSessao();
      }
      this.estado("error", "Falha ao carregar a fila");
      alert(erro.message || "Não foi possível carregar a Central de Pendências.");
    } finally {
      this.carregando = false;
      if (botao) { botao.disabled = false; botao.textContent = "↻ Sincronizar tudo"; }
    }
  },

  async sincronizarFontes() {
    if (this.sincronizando) return;
    this.sincronizando = true;
    this.avisosFontes = [];
    try {
      const coleta = await this.coletarPendencias();
      await API.sincronizarPendencias({
        itens: coleta.itens,
        fontesSincronizadas: coleta.fontes
      });
      this.avisosFontes = coleta.avisos;
      const nota = document.getElementById("central-fontes-nota");
      if (nota) {
        nota.textContent = coleta.avisos.length
          ? `Sincronização parcial: ${coleta.avisos.join(" • ")}`
          : `${coleta.itens.length} pendência${coleta.itens.length === 1 ? "" : "s"} consolidada${coleta.itens.length === 1 ? "" : "s"} de ${coleta.fontes.length} fontes.`;
        nota.className = coleta.avisos.length ? "central-source-note is-warning" : "central-source-note is-success";
      }
    } finally {
      this.sincronizando = false;
    }
  },

  async coletarPendencias() {
    const tarefas = {
      solicitacoes: API.listarSolicitacoes(),
      alteracoes: API.listarAlteracoes(),
      ocorrencias: API.listarOcorrencias({ limit: 500 }),
      streaming: API.listarInteressesStreaming({ limit: 500 }),
      audiencia: API.listarAuditoriaAudiencia({ periodo: "24h" }),
      streams: API.listarMonitoramentoStreams(),
      radios: API.carregar("radios.json", true),
      emails: API.listarEmails({ caixa: "entrada" })
    };
    const nomes = Object.keys(tarefas);
    const resultados = await Promise.allSettled(Object.values(tarefas));
    const dados = {};
    const fontes = [];
    const avisos = [];

    resultados.forEach((resultado, indice) => {
      const nome = nomes[indice];
      if (resultado.status === "fulfilled") dados[nome] = resultado.value;
      else avisos.push(`${this.rotuloOrigem(nome)} indisponível`);
    });

    const documentoRadios = dados.radios || null;
    const radiosCatalogo = documentoRadios
      ? (Array.isArray(documentoRadios) ? documentoRadios : (documentoRadios.radios || []))
      : [];
    this.catalogoRadios = new Map(radiosCatalogo.map((radio) => [String(radio.id || ""), radio]));

    const itens = [];
    if (dados.solicitacoes) {
      fontes.push("solicitacoes");
      this.mapearSolicitacoes(dados.solicitacoes.solicitacoes || []).forEach((item) => itens.push(item));
    }
    if (dados.alteracoes) {
      fontes.push("alteracoes");
      this.mapearAlteracoes(dados.alteracoes.alteracoes || []).forEach((item) => itens.push(item));
    }
    if (dados.ocorrencias) {
      fontes.push("ocorrencias");
      this.mapearOcorrencias(dados.ocorrencias.ocorrencias || []).forEach((item) => itens.push(item));
    }
    if (dados.streaming) {
      fontes.push("streaming");
      this.mapearStreaming(dados.streaming.interesses || []).forEach((item) => itens.push(item));
    }
    if (dados.audiencia) {
      fontes.push("audiencia");
      this.mapearAudiencia(dados.audiencia.radios || []).forEach((item) => itens.push(item));
    }
    if (dados.streams) {
      fontes.push("streams");
      this.mapearStreams(dados.streams.streams || []).forEach((item) => itens.push(item));
    }
    if (dados.radios && dados.streams) {
      fontes.push("qualidade");
      const radios = radiosCatalogo;
      const monitoramento = dados.streams?.streams || [];
      const avaliacoes = typeof QualidadeAdmin !== "undefined"
        ? QualidadeAdmin.avaliarCatalogo(radios, monitoramento)
        : [];
      this.mapearQualidade(avaliacoes).forEach((item) => itens.push(item));
    }
    if (dados.emails) {
      fontes.push("emails");
      this.mapearEmails(dados.emails.mensagens || []).forEach((item) => itens.push(item));
    }

    return { itens, fontes: [...new Set(fontes)], avisos };
  },

  criarItem({ chave, tipo, origem, referenciaId = "", radioId = "", radioNome = "", titulo, descricao, prioridade = "media", rota, criadoEm = "", metadata = {} }) {
    return { chave, tipo, origem, referenciaId, radioId, radioNome, titulo, descricao, prioridade, rota, criadoEm, metadata };
  },

  mapearSolicitacoes(lista) {
    return lista.filter((item) => ["pendente", "em_analise"].includes(String(item.status || ""))).map((item) => {
      const horas = this.horasEmAberto(item.criado_em);
      const prioridade = horas >= 72 ? "alta" : horas >= 24 ? "media" : "baixa";
      return this.criarItem({
        chave: `solicitacao:${item.protocolo || item.id}`,
        tipo: "cadastro_emissora",
        origem: "solicitacoes",
        referenciaId: item.protocolo || item.id,
        radioNome: item.nome_radio,
        titulo: item.status === "em_analise" ? "Cadastro de emissora em análise" : "Nova solicitação de cadastro",
        descricao: `${item.nome_radio || "Emissora"} • ${item.cidade || "Cidade não informada"}/${item.estado || "UF"}`,
        prioridade,
        rota: "solicitacoes",
        criadoEm: item.criado_em,
        metadata: { statusOrigem: item.status, email: item.email, categoria: item.categoria_principal, horasEmAberto: horas }
      });
    });
  },

  mapearAlteracoes(lista) {
    return lista.filter((item) => ["pendente", "em_analise"].includes(String(item.status || ""))).map((item) => {
      const horas = this.horasEmAberto(item.criado_em);
      return this.criarItem({
        chave: `alteracao:${item.id}`,
        tipo: "alteracao_cadastral",
        origem: "alteracoes",
        referenciaId: item.id,
        radioId: item.radio_id || "",
        radioNome: item.nome_radio || "",
        titulo: item.status === "em_analise" ? "Alteração cadastral em análise" : "Alteração cadastral pendente",
        descricao: `${item.nome_radio || "Emissora"} solicitou atualização dos dados publicados.`,
        prioridade: horas >= 72 ? "alta" : "media",
        rota: "solicitacoes",
        criadoEm: item.criado_em,
        metadata: { protocoloOriginal: item.protocolo_original, statusOrigem: item.status, horasEmAberto: horas }
      });
    });
  },

  mapearOcorrencias(lista) {
    return lista.filter((item) => !["resolvida", "arquivada"].includes(String(item.status || ""))).map((item) => {
      const prioridade = item.prioridade === "critica" ? "urgente" : item.prioridade === "alta" ? "alta" : "media";
      return this.criarItem({
        chave: `ocorrencia:${item.id}`,
        tipo: item.tipo || "ocorrencia",
        origem: "ocorrencias",
        referenciaId: item.id,
        radioId: item.radio_id || "",
        radioNome: item.radio_nome || "",
        titulo: `Ocorrência ${item.protocolo || "sem protocolo"}`,
        descricao: item.mensagem || "Ocorrência pública aguardando tratamento.",
        prioridade,
        rota: "ocorrencias",
        criadoEm: item.criado_em,
        metadata: { protocolo: item.protocolo, statusOrigem: item.status, prioridadeOrigem: item.prioridade, tipo: item.tipo }
      });
    });
  },

  mapearStreaming(lista) {
    return lista.filter((item) => ["novo", "qualificado"].includes(String(item.status || ""))).map((item) => this.criarItem({
      chave: `streaming:${item.id}`,
      tipo: "oportunidade_streaming",
      origem: "streaming",
      referenciaId: item.id,
      radioNome: item.nome_projeto || item.nome || "Interessado",
      titulo: item.status === "qualificado" ? "Lead de streaming qualificado" : "Novo interessado no Streaming CRB",
      descricao: `${item.nome || "Contato"} • ${item.cidade || "Cidade"}/${item.estado || "UF"}`,
      prioridade: item.status === "qualificado" ? "alta" : "media",
      rota: "streaming-interesses",
      criadoEm: item.criado_em,
      metadata: { protocolo: item.protocolo, email: item.email, whatsapp: item.whatsapp, statusOrigem: item.status }
    }));
  },

  mapearAudiencia(lista) {
    return lista.filter((item) => ["observar", "revisar"].includes(String(item.nivel || ""))).map((item) => this.criarItem({
      chave: `audiencia:${item.radioId}`,
      tipo: "audiencia_anomala",
      origem: "audiencia",
      referenciaId: item.radioId,
      radioId: item.radioId,
      radioNome: this.nomeRadio(item.radioId),
      titulo: item.nivel === "revisar" ? "Audiência exige revisão" : "Audiência em observação",
      descricao: `${Number(item.validas || 0)} válidas • ${Number(item.duplicadas || 0)} duplicadas • pico de ${Number(item.pico10Minutos || 0)} em 10 min.`,
      prioridade: item.nivel === "revisar" ? "alta" : "media",
      rota: "audiencia",
      criadoEm: new Date().toISOString(),
      metadata: { nivel: item.nivel, pontuacao: item.pontuacao, validas: item.validas, redesUnicas: item.redesUnicas, duplicadas: item.duplicadas, crescimentoPercentual: item.crescimentoPercentual, motivos: item.motivos || [] }
    }));
  },

  mapearStreams(lista) {
    return lista.filter((item) => ["suspensa", "fora_portal", "instavel", "offline"].includes(String(item.estado || ""))).map((item) => {
      const estado = String(item.estado || "");
      return this.criarItem({
        chave: `stream:${item.radio_id || item.radioId}`,
        tipo: "stream_indisponivel",
        origem: "streams",
        referenciaId: item.radio_id || item.radioId,
        radioId: item.radio_id || item.radioId,
        radioNome: item.nome_radio || item.nomeRadio || this.nomeRadio(item.radio_id || item.radioId),
        titulo: estado === "suspensa" ? "Stream suspenso" : estado === "fora_portal" ? "Stream retirado do portal" : "Stream instável ou offline",
        descricao: item.ultimo_erro || `${Number(item.falhas_consecutivas || 0)} falha(s) consecutiva(s).`,
        prioridade: ["suspensa", "fora_portal"].includes(estado) ? "urgente" : "alta",
        rota: "streams",
        criadoEm: item.ultima_verificacao || new Date().toISOString(),
        metadata: { estado, falhasConsecutivas: item.falhas_consecutivas, ultimaVerificacao: item.ultima_verificacao, streamUrl: item.stream_url }
      });
    });
  },

  mapearQualidade(lista) {
    return lista.filter((item) => ["critica", "atencao"].includes(item.nivel)).map((item) => this.criarItem({
      chave: `qualidade:${item.radioId}`,
      tipo: "qualidade_cadastro",
      origem: "qualidade",
      referenciaId: item.radioId,
      radioId: item.radioId,
      radioNome: item.nome,
      titulo: item.nivel === "critica" ? "Qualidade crítica da emissora" : "Cadastro precisa de revisão",
      descricao: item.pendencias.filter((p) => p.severidade !== "melhoria").slice(0, 3).map((p) => p.titulo).join(" • ") || "Pendências de qualidade identificadas.",
      prioridade: item.nivel === "critica" ? "urgente" : "media",
      rota: "qualidade",
      criadoEm: item.atualizadoEm || item.ultimaVerificacao || new Date().toISOString(),
      metadata: { score: item.score, completude: item.completude, nivel: item.nivel, criticas: item.criticas, atencoes: item.atencoes, pendencias: item.pendencias }
    }));
  },

  mapearEmails(lista) {
    return lista.filter((item) => item.direcao === "entrada" && !item.lidaEm && !item.lixeiraEm).map((item) => {
      const horas = this.horasEmAberto(item.data || item.criadoEm);
      return this.criarItem({
        chave: `email:${item.id}`,
        tipo: "email_nao_lido",
        origem: "emails",
        referenciaId: item.id,
        titulo: `E-mail não lido: ${item.assunto || "Sem assunto"}`,
        descricao: `${item.remetenteNome || item.remetenteEmail || "Remetente"} • ${item.previa || "Sem prévia"}`,
        prioridade: horas >= 48 ? "alta" : "media",
        rota: "emails",
        criadoEm: item.data || item.criadoEm,
        metadata: { remetenteEmail: item.remetenteEmail, assunto: item.assunto, horasEmAberto: horas }
      });
    });
  },

  nomeRadio(radioId) {
    const radio = this.catalogoRadios.get(String(radioId || ""));
    return radio?.nome || radio?.nomeFantasia || String(radioId || "Emissora");
  },

  horasEmAberto(valor) {
    const data = new Date(valor || "");
    if (Number.isNaN(data.getTime())) return 0;
    return Math.max(0, Math.floor((Date.now() - data.getTime()) / 3600000));
  },

  filtros() {
    return {
      busca: document.getElementById("central-busca")?.value.trim() || "",
      status: document.getElementById("central-status")?.value || "abertas",
      prioridade: document.getElementById("central-prioridade")?.value || "",
      origem: document.getElementById("central-origem")?.value || "",
      ativas: document.getElementById("central-ativas")?.value || "1",
      page: this.paginacao.pagina,
      limit: Number(document.getElementById("central-limite")?.value || 50)
    };
  },

  async buscar() {
    const resposta = await API.listarPendencias(this.filtros());
    this.dados = resposta.pendencias || [];
    this.resumo = resposta.resumo || {};
    this.paginacao = resposta.paginacao || { pagina: 1, paginas: 1, total: this.dados.length, limite: 50 };
    this.renderizar();
  },

  renderizar() {
    const resumo = this.resumo;
    texto("central-kpi-abertas", resumo.abertas || 0);
    texto("central-kpi-urgentes", resumo.urgentes || 0);
    texto("central-kpi-pendentes", resumo.pendentes || 0);
    texto("central-kpi-analise", resumo.emAnalise || 0);
    texto("central-kpi-monitorando", resumo.monitorando || 0);
    texto("central-kpi-resolvidas", resumo.resolvidas || 0);
    texto("central-resultados", `${this.paginacao.total || 0} resultado${Number(this.paginacao.total || 0) === 1 ? "" : "s"}`);
    texto("central-pagina", `Página ${this.paginacao.pagina || 1} de ${this.paginacao.paginas || 1}`);
    texto("central-atualizado-em", resumo.atualizadoEm ? `Última mudança: ${this.formatarDataHora(resumo.atualizadoEm)}` : "Ainda não sincronizado");

    const anterior = document.getElementById("central-anterior");
    const proxima = document.getElementById("central-proxima");
    if (anterior) anterior.disabled = (this.paginacao.pagina || 1) <= 1;
    if (proxima) proxima.disabled = (this.paginacao.pagina || 1) >= (this.paginacao.paginas || 1);
    this.renderizarTabela();
    this.atualizarBadgeNavegacao();
  },

  renderizarTabela() {
    const corpo = document.getElementById("central-table-body");
    if (!corpo) return;
    if (!this.dados.length) {
      corpo.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma pendência corresponde aos filtros.</td></tr>';
      return;
    }
    corpo.innerHTML = this.dados.map((item) => {
      const idade = this.tempoDecorrido(item.primeiraDetectadaEm);
      const encerrada = ["resolvida", "ignorada"].includes(item.status);
      const acaoRapida = encerrada
        ? `<button class="table-button" data-central-status-rapido="pendente" data-central-id="${escaparHtml(item.id)}">Reabrir</button>`
        : item.status === "pendente"
          ? `<button class="table-button" data-central-status-rapido="em_analise" data-central-id="${escaparHtml(item.id)}">Analisar</button>`
          : `<button class="table-button" data-central-status-rapido="resolvida" data-central-id="${escaparHtml(item.id)}">Resolver</button>`;
      return `<tr class="central-row central-row--${escaparHtml(item.prioridade)} ${encerrada ? "is-closed" : ""}">
        <td><span class="central-priority central-priority--${escaparHtml(item.prioridade)}">${this.rotuloPrioridade(item.prioridade)}</span>${item.prioridadeManual ? "<small>Ajustada</small>" : ""}</td>
        <td><span class="central-origin">${this.iconeOrigem(item.origem)} ${escaparHtml(this.rotuloOrigem(item.origem))}</span><small>${escaparHtml(this.rotuloTipo(item.tipo))}</small></td>
        <td><strong>${escaparHtml(item.titulo)}</strong><small>${escaparHtml(item.descricao || "Sem descrição")}</small><code>${escaparHtml(item.referenciaId || item.chave)}</code></td>
        <td>${item.radioNome ? `<strong>${escaparHtml(item.radioNome)}</strong><small>${escaparHtml(item.radioId || "")}</small>` : "—"}</td>
        <td><strong>${idade}</strong><small>${this.formatarDataHora(item.primeiraDetectadaEm)}</small></td>
        <td><span class="central-status central-status--${escaparHtml(item.status)}">${this.rotuloStatus(item.status)}</span><small>${item.ativa ? "Fonte ativa" : "Fonte encerrada"}</small></td>
        <td>${this.formatarDataHora(item.atualizadoEm)}</td>
        <td class="central-actions">${acaoRapida}<button class="table-button" data-central-detalhe="${escaparHtml(item.id)}">Detalhes</button><button class="table-button" data-central-rota="${escaparHtml(item.id)}">Abrir módulo</button></td>
      </tr>`;
    }).join("");
  },

  async abrirDetalhe(id) {
    const painel = document.getElementById("central-detalhe");
    if (!painel) return;
    painel.classList.remove("hidden");
    painel.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("central-detalhe-conteudo").innerHTML = '<p class="central-loading">Carregando histórico…</p>';
    try {
      const resposta = await API.detalharPendencia(id);
      this.detalheAtual = resposta.pendencia;
      this.renderizarDetalhe(resposta.pendencia, resposta.historico || []);
    } catch (erro) {
      document.getElementById("central-detalhe-conteudo").innerHTML = `<p class="central-error">${escaparHtml(erro.message || "Falha ao carregar a pendência.")}</p>`;
    }
  },

  renderizarDetalhe(item, historico) {
    texto("central-detalhe-titulo", item.titulo);
    texto("central-detalhe-subtitulo", `${this.rotuloOrigem(item.origem)} • ${item.referenciaId || item.chave}`);
    document.getElementById("central-detalhe-status").value = item.status;
    document.getElementById("central-detalhe-prioridade").value = item.prioridadeManual || "";
    document.getElementById("central-detalhe-observacao").value = item.observacoesAdmin || "";
    const metadata = item.metadata && Object.keys(item.metadata).length
      ? Object.entries(item.metadata).slice(0, 12).map(([chave, valor]) => `<div><span>${escaparHtml(this.rotuloMetadata(chave))}</span><strong>${escaparHtml(Array.isArray(valor) ? valor.join(" • ") : String(valor ?? "—"))}</strong></div>`).join("")
      : '<p class="dashboard-empty">Sem dados técnicos adicionais.</p>';
    const historicoHtml = historico.length
      ? historico.map((registro) => `<li><span class="central-history-dot"></span><div><strong>${escaparHtml(this.rotuloAcao(registro.acao))}</strong><small>${this.formatarDataHora(registro.criado_em)}${registro.observacao ? ` • ${escaparHtml(registro.observacao)}` : ""}</small></div></li>`).join("")
      : '<li class="central-history-empty">Nenhuma decisão administrativa registrada.</li>';
    document.getElementById("central-detalhe-conteudo").innerHTML = `
      <section class="central-detail-kpis">
        <article><span>Prioridade</span><strong>${this.rotuloPrioridade(item.prioridade)}</strong></article>
        <article><span>Status</span><strong>${this.rotuloStatus(item.status)}</strong></article>
        <article><span>Origem</span><strong>${this.rotuloOrigem(item.origem)}</strong></article>
        <article><span>Em aberto</span><strong>${this.tempoDecorrido(item.primeiraDetectadaEm)}</strong></article>
      </section>
      <section class="central-detail-grid">
        <article class="central-detail-card"><h3>Descrição</h3><p>${escaparHtml(item.descricao || "Sem descrição adicional.")}</p>${item.radioNome ? `<p><strong>Emissora:</strong> ${escaparHtml(item.radioNome)} <code>${escaparHtml(item.radioId || "")}</code></p>` : ""}<p><strong>Fonte atual:</strong> ${item.ativa ? "continua indicando a pendência" : "não indica mais a pendência"}.</p></article>
        <article class="central-detail-card"><h3>Dados da origem</h3><div class="central-metadata">${metadata}</div></article>
      </section>
      <article class="central-detail-card"><h3>Histórico administrativo</h3><ol class="central-history">${historicoHtml}</ol></article>`;
  },

  async salvarDetalhe(evento) {
    evento.preventDefault();
    if (!this.detalheAtual) return;
    const botao = document.getElementById("central-detalhe-salvar");
    if (botao) { botao.disabled = true; botao.textContent = "Salvando…"; }
    try {
      const resposta = await API.atualizarPendencia(this.detalheAtual.id, {
        status: document.getElementById("central-detalhe-status").value,
        prioridade: document.getElementById("central-detalhe-prioridade").value,
        observacao: document.getElementById("central-detalhe-observacao").value,
        notaHistorico: document.getElementById("central-detalhe-observacao").value
      });
      this.detalheAtual = resposta.pendencia;
      this.renderizarDetalhe(resposta.pendencia, resposta.historico || []);
      await this.buscar();
    } catch (erro) {
      alert(erro.message || "Não foi possível salvar a decisão.");
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = "Salvar decisão"; }
    }
  },

  async atualizarStatusRapido(id, status) {
    const item = this.dados.find((registro) => registro.id === id);
    if (!item) return;
    try {
      await API.atualizarPendencia(id, {
        status,
        observacao: item.observacoesAdmin || "",
        notaHistorico: `Ação rápida: ${this.rotuloStatus(status)}.`
      });
      await this.buscar();
    } catch (erro) {
      alert(erro.message || "Não foi possível atualizar a pendência.");
    }
  },

  abrirOrigem(item) {
    if (!item?.rota) return;
    window.location.hash = `#/${item.rota}`;
    if (["qualidade", "audiencia"].includes(item.rota) && item.radioId) {
      let tentativas = 0;
      const timer = setInterval(() => {
        tentativas += 1;
        if (item.rota === "qualidade" && QualidadeAdmin?.avaliacoes?.length) {
          clearInterval(timer);
          QualidadeAdmin.abrirDetalhe(item.radioId);
        } else if (item.rota === "audiencia" && AudienciaAdmin?.dados?.radios) {
          clearInterval(timer);
          AudienciaAdmin.abrirDetalhe(item.radioId);
        } else if (tentativas >= 20) clearInterval(timer);
      }, 250);
    }
  },

  fecharDetalhe() {
    document.getElementById("central-detalhe")?.classList.add("hidden");
    this.detalheAtual = null;
  },

  limparFiltros() {
    document.getElementById("central-busca").value = "";
    document.getElementById("central-status").value = "abertas";
    document.getElementById("central-prioridade").value = "";
    document.getElementById("central-origem").value = "";
    document.getElementById("central-ativas").value = "1";
    this.paginacao.pagina = 1;
    this.buscar();
  },

  mudarPagina(delta) {
    const nova = Math.min(Math.max(1, (this.paginacao.pagina || 1) + delta), this.paginacao.paginas || 1);
    if (nova === this.paginacao.pagina) return;
    this.paginacao.pagina = nova;
    this.buscar();
  },

  exportarCsv() {
    if (!this.dados.length) return alert("Não há pendências visíveis para exportar.");
    const linhas = [["prioridade", "status", "origem", "tipo", "titulo", "emissora", "radio_id", "referencia", "primeira_deteccao", "ultima_atualizacao", "descricao"]];
    this.dados.forEach((item) => linhas.push([item.prioridade, item.status, item.origem, item.tipo, item.titulo, item.radioNome, item.radioId, item.referenciaId, item.primeiraDetectadaEm, item.atualizadoEm, item.descricao]));
    const csv = linhas.map((linha) => linha.map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `central-pendencias-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  atualizarBadgeNavegacao() {
    const numero = Number(this.resumo.abertas || 0);
    const badge = document.getElementById("central-nav-count");
    if (!badge) return;
    badge.textContent = numero > 99 ? "99+" : String(numero);
    badge.classList.toggle("hidden", numero <= 0);
  },

  estado(tipo, mensagem) {
    const badge = document.getElementById("central-status-badge");
    if (!badge) return;
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  },

  rotuloOrigem(origem) {
    return ({ solicitacoes: "Solicitações", alteracoes: "Alterações", ocorrencias: "Ocorrências", streaming: "Streaming CRB", emails: "E-mails", audiencia: "Audiência", qualidade: "Qualidade", streams: "Streams", radios: "Catálogo" })[origem] || origem || "Origem";
  },
  iconeOrigem(origem) {
    return ({ solicitacoes: "📥", alteracoes: "📝", ocorrencias: "⚠️", streaming: "🚀", emails: "✉️", audiencia: "📊", qualidade: "🛡️", streams: "📡" })[origem] || "•";
  },
  rotuloTipo(tipo) {
    return String(tipo || "Pendência").replace(/_/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase());
  },
  rotuloPrioridade(valor) {
    return ({ baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" })[valor] || "Média";
  },
  rotuloStatus(valor) {
    return ({ pendente: "Pendente", em_analise: "Em análise", monitorando: "Monitorando", resolvida: "Resolvida", ignorada: "Ignorada" })[valor] || "Pendente";
  },
  rotuloAcao(valor) {
    return ({ status_atualizado: "Status atualizado", prioridade_atualizada: "Prioridade atualizada", observacao_atualizada: "Observação atualizada", registro_revisado: "Registro revisado", resolvida_automaticamente: "Resolvida automaticamente", reaberta_automaticamente: "Reaberta automaticamente" })[valor] || this.rotuloTipo(valor);
  },
  rotuloMetadata(valor) {
    return String(valor || "Dado").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase());
  },
  formatarDataHora(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(data);
  },
  tempoDecorrido(valor) {
    const data = new Date(valor || "");
    if (Number.isNaN(data.getTime())) return "—";
    const minutos = Math.max(0, Math.floor((Date.now() - data.getTime()) / 60000));
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `${horas} h`;
    const dias = Math.floor(horas / 24);
    return `${dias} d`;
  }
};
