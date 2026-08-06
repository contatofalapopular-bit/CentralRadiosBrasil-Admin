const QualidadeAdmin = {
  radios: [],
  monitoramento: [],
  avaliacoes: [],
  ultimaExecucaoMonitoramento: null,
  eventosRegistrados: false,
  carregando: false,
  acaoPendenteKey: "crb-admin-qualidade-acao-v1",

  async iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }
    await this.carregar(true);
  },

  registrarEventos() {
    const ao = (id, evento, fn) => document.getElementById(id)?.addEventListener(evento, fn);
    ao("qualidade-busca", "input", () => this.renderizar());
    ao("qualidade-nivel", "change", () => this.renderizar());
    ao("qualidade-uf", "change", () => this.renderizar());
    ao("qualidade-categoria", "change", () => this.renderizar());
    ao("qualidade-stream", "change", () => this.renderizar());
    ao("qualidade-selo", "change", () => this.renderizar());
    ao("qualidade-ordenacao", "change", () => this.renderizar());
    ao("qualidade-atualizar", "click", () => this.carregar(true));
    ao("qualidade-monitorar", "click", () => this.executarMonitoramento());
    ao("qualidade-exportar", "click", () => this.exportarCsv());
    ao("qualidade-login", "click", () => this.autenticar());
    ao("qualidade-detalhe-fechar", "click", () => this.fecharDetalhe());
  },

  async autenticar() {
    const chave = prompt("Digite a chave administrativa. Ela será usada apenas para criar uma sessão temporária:");
    if (chave === null || !String(chave).trim()) return;
    const botao = document.getElementById("qualidade-login");
    if (botao) { botao.disabled = true; botao.textContent = "Entrando…"; }
    try {
      await API.loginAdmin(String(chave).trim());
      await this.carregar(true);
      if (typeof carregarDashboard === "function") carregarDashboard(true);
    } catch (erro) {
      API.definirChaveAdmin("");
      alert(erro.message || "Não foi possível iniciar a sessão administrativa.");
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = "🔐 Entrar e incluir monitoramento"; }
    }
  },

  async carregar(semCache = false) {
    if (this.carregando) return;
    this.carregando = true;
    this.estado("loading", "Analisando catálogo");
    this.fecharDetalhe();

    const botao = document.getElementById("qualidade-atualizar");
    if (botao) { botao.disabled = true; botao.textContent = "Atualizando…"; }

    try {
      const documento = await API.carregar("radios.json", semCache);
      this.radios = Array.isArray(documento) ? documento : (documento.radios || []);
      this.monitoramento = [];
      this.ultimaExecucaoMonitoramento = null;

      if (API.chaveAdmin()) {
        try {
          const resposta = await API.listarMonitoramentoStreams();
          this.monitoramento = Array.isArray(resposta?.streams) ? resposta.streams : [];
          this.ultimaExecucaoMonitoramento = resposta?.ultimaExecucao || null;
        } catch (erro) {
          console.warn("Monitoramento técnico indisponível na Qualidade:", erro);
          if (erro.status === 401) API.definirChaveAdmin("");
        }
      }

      this.avaliacoes = this.avaliarCatalogo(this.radios, this.monitoramento);
      this.preencherFiltros();
      this.renderizar();
      this.atualizarSessao();
      this.atualizarBadgeNavegacao();
      this.estado("success", "Qualidade atualizada");
    } catch (erro) {
      console.error(erro);
      this.avaliacoes = [];
      this.renderizarErro(erro);
      this.estado("error", "Falha na análise");
    } finally {
      this.carregando = false;
      if (botao) { botao.disabled = false; botao.textContent = "↻ Atualizar"; }
    }
  },

  async resumoRapido(radios) {
    let monitoramento = [];
    if (API.chaveAdmin()) {
      try {
        const resposta = await API.listarMonitoramentoStreams();
        monitoramento = Array.isArray(resposta?.streams) ? resposta.streams : [];
      } catch (erro) {
        console.warn("Resumo rápido de qualidade sem monitoramento:", erro);
      }
    }
    const itens = this.avaliarCatalogo(radios || [], monitoramento);
    return this.calcularResumo(itens);
  },

  avaliarCatalogo(radios, monitoramento) {
    const porRadio = new Map(
      (monitoramento || []).map((item) => [String(item.radio_id || item.radioId || ""), item])
    );
    return (radios || []).map((radio) => this.avaliarRadio(radio, porRadio.get(String(radio.id || "")) || null));
  },

  avaliarRadio(radio, monitor) {
    const pendencias = [];
    const adicionar = (codigo, titulo, detalhe, peso, severidade, grupo) => {
      pendencias.push({ codigo, titulo, detalhe, peso, severidade, grupo });
    };

    const id = String(radio?.id || "").trim();
    const nome = String(radio?.nome || radio?.nomeFantasia || "").trim();
    const localizacao = radio?.localizacao || {};
    const uf = String(localizacao.uf || radio?.uf || "").trim().toUpperCase();
    const cidade = String(localizacao.cidade || radio?.cidade || "").trim();
    const categoria = String(
      radio?.classificacao?.categoriaPrincipal || radio?.categoriaPrincipal || radio?.categorias?.[0] || ""
    ).trim();
    const descricao = String(radio?.descricao || "").trim();
    const logo = this.obterLogo(radio);
    const contato = radio?.contato || {};
    const redes = radio?.redesSociais || {};
    const site = String(radio?.site || "").trim();
    const streams = Array.isArray(radio?.streams) ? radio.streams : [];
    const stream = streams.find((item) => item?.principal === true) || streams[0] || null;
    const streamUrl = String(stream?.url || radio?.streamPrincipal?.url || radio?.stream || "").trim();
    const codec = String(stream?.codec || radio?.streamPrincipal?.codec || "").trim();
    const bitrate = stream?.bitrate ?? radio?.streamPrincipal?.bitrate ?? null;
    const statusCadastro = String(radio?.statusCadastro || (radio?.status?.publica ? "publicada" : "cadastro_recebido"));
    const ativa = radio?.status?.ativa !== false && radio?.ativa !== false;
    const publica = radio?.status?.publica !== false && radio?.publica !== false;
    const verificada = radio?.status?.verificada === true || radio?.verificada === true;
    const seloStatus = String(radio?.seloOficial?.status || radio?.selo?.status || (verificada ? "verificado" : "nao_solicitado"));
    const monitorEstado = String(monitor?.estado || stream?.monitoramento?.status || stream?.status || "nao_testado");
    const falhasConsecutivas = Number(monitor?.falhas_consecutivas || 0);

    if (!id) adicionar("id-ausente", "Identificador ausente", "A emissora precisa de um ID único antes da publicação.", 45, "critica", "Identidade");
    if (!nome) adicionar("nome-ausente", "Nome ausente", "Informe o nome oficial da emissora.", 45, "critica", "Identidade");
    if (!logo) adicionar("logo-ausente", "Logomarca ausente", "Envie uma logomarca para cards, compartilhamento e identificação visual.", 18, "atencao", "Identidade");
    else if (!this.urlValida(logo)) adicionar("logo-invalida", "Logomarca com endereço inválido", "A URL da logomarca não possui formato HTTP/HTTPS válido.", 18, "atencao", "Identidade");

    if (!uf) adicionar("uf-ausente", "Estado não informado", "Selecione a UF correta da emissora.", 12, "atencao", "Localização");
    if (!cidade) adicionar("cidade-ausente", "Cidade não informada", "Selecione o município da emissora.", 12, "atencao", "Localização");
    if (!categoria || normalizar(categoria) === "sem categoria") adicionar("categoria-ausente", "Categoria principal ausente", "Defina a categoria principal para melhorar a descoberta.", 12, "atencao", "Conteúdo");
    if (!descricao) adicionar("descricao-ausente", "Descrição ausente", "Inclua uma apresentação curta da emissora.", 9, "atencao", "Conteúdo");
    else if (descricao.length < 60) adicionar("descricao-curta", "Descrição muito curta", "Amplie a descrição para pelo menos 60 caracteres.", 4, "melhoria", "Conteúdo");

    const possuiContato = [contato.email, contato.whatsapp, contato.telefone].some((valor) => String(valor || "").trim());
    if (!possuiContato) adicionar("contato-ausente", "Contato administrativo ausente", "Informe e-mail, WhatsApp ou telefone para suporte e validação.", 8, "atencao", "Contato");
    if (contato.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contato.email).trim())) {
      adicionar("email-invalido", "E-mail com formato inválido", "Revise o endereço de e-mail cadastrado.", 7, "atencao", "Contato");
    }

    if (!site) adicionar("site-ausente", "Site oficial não informado", "Campo opcional, mas recomendado para credibilidade e divulgação.", 2, "melhoria", "Links");
    else if (!this.urlValida(site)) adicionar("site-invalido", "Site com endereço inválido", "A URL do site não possui formato HTTP/HTTPS válido.", 8, "atencao", "Links");
    Object.entries(redes).forEach(([rede, valor]) => {
      const texto = String(valor || "").trim();
      if (texto && !this.urlValida(texto)) adicionar(`rede-${rede}-invalida`, `${this.rotuloRede(rede)} com endereço inválido`, "Revise a URL cadastrada.", 4, "melhoria", "Links");
    });

    if (!streamUrl) {
      adicionar("stream-ausente", "Stream principal ausente", "Cadastre uma URL direta de áudio para a emissora funcionar no portal.", 50, "critica", "Stream");
    } else if (!this.urlValida(streamUrl)) {
      adicionar("stream-invalido", "Stream com endereço inválido", "A URL do stream não possui formato HTTP/HTTPS válido.", 35, "critica", "Stream");
    } else if (!streamUrl.toLowerCase().startsWith("https://")) {
      adicionar("stream-http", "Stream sem HTTPS", "Streams HTTP podem ser bloqueados pelo navegador e pelo portal seguro.", 28, "critica", "Stream");
    }

    if (["suspensa", "fora_portal"].includes(monitorEstado)) {
      adicionar(
        `monitor-${monitorEstado}`,
        monitorEstado === "suspensa" ? "Stream suspenso" : "Stream retirado do portal",
        monitor?.ultimo_erro || "O monitoramento automático detectou indisponibilidade prolongada.",
        monitorEstado === "suspensa" ? 45 : 35,
        "critica",
        "Stream"
      );
    } else if (["instavel", "offline"].includes(monitorEstado)) {
      adicionar("monitor-instavel", "Stream instável", monitor?.ultimo_erro || "O stream apresentou falhas recentes.", 18, "atencao", "Stream");
    } else if (["nao_testado", "", "desconhecido"].includes(monitorEstado)) {
      adicionar("monitor-nao-testado", "Stream ainda não monitorado", "Execute o monitoramento para confirmar a disponibilidade técnica.", 6, "atencao", "Stream");
    }
    if (falhasConsecutivas >= 3 && !["suspensa", "fora_portal"].includes(monitorEstado)) {
      adicionar("falhas-consecutivas", `${falhasConsecutivas} falhas consecutivas`, "Revise o provedor ou a URL do stream.", 12, "atencao", "Stream");
    }
    if (!codec || ["nao informado", "não informado", "desconhecido"].includes(normalizar(codec))) {
      adicionar("codec-ausente", "Codec não identificado", "Informe MP3, AAC ou o formato correto.", 3, "melhoria", "Stream");
    }
    if (!bitrate) adicionar("bitrate-ausente", "Bitrate não informado", "Campo técnico recomendado para controle de qualidade.", 2, "melhoria", "Stream");

    if (publica && !ativa) adicionar("publica-inativa", "Cadastro público marcado como inativo", "Revise a combinação entre publicação e atividade.", 10, "atencao", "Publicação");
    if (publica && !["publicada", "aprovada", "aguardando_selo"].includes(statusCadastro)) {
      adicionar("status-publicacao-incompativel", "Status administrativo incompatível", "A emissora está pública, mas o fluxo cadastral não está como publicado ou aprovado.", 8, "atencao", "Publicação");
    }
    if (seloStatus !== "verificado") adicionar("selo-pendente", "Selo Oficial não verificado", "A verificação é opcional, mas aumenta a confiança no catálogo.", 1, "melhoria", "Confiança");

    const score = Math.max(0, 100 - pendencias.reduce((total, item) => total + item.peso, 0));
    const criticas = pendencias.filter((item) => item.severidade === "critica").length;
    const atencoes = pendencias.filter((item) => item.severidade === "atencao").length;
    const melhorias = pendencias.filter((item) => item.severidade === "melhoria").length;
    const nivel = criticas > 0 || score < 60 ? "critica" : atencoes > 0 || score < 85 ? "atencao" : "saudavel";

    const camposCompletos = [nome, logo, uf, cidade, categoria, descricao, possuiContato, streamUrl]
      .filter(Boolean).length;
    const completude = Math.round((camposCompletos / 8) * 100);

    return {
      radioId: id,
      radio,
      nome: nome || "Emissora sem nome",
      logo,
      uf,
      cidade,
      categoria,
      statusCadastro,
      ativa,
      publica,
      seloStatus,
      streamUrl,
      codec: codec || "Não informado",
      bitrate,
      monitorEstado,
      falhasConsecutivas,
      ultimaVerificacao: monitor?.ultima_verificacao || stream?.monitoramento?.ultimaVerificacao || null,
      ultimoErro: monitor?.ultimo_erro || null,
      score,
      completude,
      nivel,
      criticas,
      atencoes,
      melhorias,
      pendencias,
      atualizadoEm: radio?.atualizadoEm || radio?.updatedAt || null
    };
  },

  calcularResumo(itens = this.avaliacoes) {
    return {
      total: itens.length,
      saudaveis: itens.filter((item) => item.nivel === "saudavel").length,
      atencao: itens.filter((item) => item.nivel === "atencao").length,
      criticas: itens.filter((item) => item.nivel === "critica").length,
      streamAlertas: itens.filter((item) => ["suspensa", "fora_portal", "instavel", "offline"].includes(item.monitorEstado)).length,
      incompletas: itens.filter((item) => item.completude < 100).length,
      atencaoTotal: itens.filter((item) => item.nivel !== "saudavel").length,
      scoreMedio: itens.length ? Math.round(itens.reduce((soma, item) => soma + item.score, 0) / itens.length) : 0
    };
  },

  preencherFiltros() {
    const popular = (id, valores, primeiro) => {
      const select = document.getElementById(id);
      if (!select) return;
      const atual = select.value;
      select.innerHTML = `<option value="">${primeiro}</option>` + valores
        .filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((valor) => `<option value="${escaparHtml(valor)}">${escaparHtml(valor)}</option>`).join("");
      if ([...select.options].some((opcao) => opcao.value === atual)) select.value = atual;
    };
    popular("qualidade-uf", [...new Set(this.avaliacoes.map((item) => item.uf))], "Todos os estados");
    popular("qualidade-categoria", [...new Set(this.avaliacoes.map((item) => item.categoria))], "Todas as categorias");
  },

  radiosFiltradas() {
    const busca = normalizar(document.getElementById("qualidade-busca")?.value || "");
    const nivel = document.getElementById("qualidade-nivel")?.value || "";
    const uf = document.getElementById("qualidade-uf")?.value || "";
    const categoria = document.getElementById("qualidade-categoria")?.value || "";
    const stream = document.getElementById("qualidade-stream")?.value || "";
    const selo = document.getElementById("qualidade-selo")?.value || "";
    const ordenacao = document.getElementById("qualidade-ordenacao")?.value || "risco";

    const lista = this.avaliacoes.filter((item) => {
      const texto = normalizar([item.nome, item.radioId, item.cidade, item.uf, item.categoria].join(" "));
      if (busca && !texto.includes(busca)) return false;
      if (nivel && item.nivel !== nivel) return false;
      if (uf && item.uf !== uf) return false;
      if (categoria && item.categoria !== categoria) return false;
      if (stream && !this.correspondeFiltroStream(item, stream)) return false;
      if (selo === "verificado" && item.seloStatus !== "verificado") return false;
      if (selo === "pendente" && item.seloStatus === "verificado") return false;
      return true;
    });

    return lista.sort((a, b) => {
      if (ordenacao === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordenacao === "score") return b.score - a.score || a.nome.localeCompare(b.nome, "pt-BR");
      if (ordenacao === "atualizacao") return String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || ""));
      const pesoNivel = { critica: 0, atencao: 1, saudavel: 2 };
      return (pesoNivel[a.nivel] - pesoNivel[b.nivel]) || (a.score - b.score) || a.nome.localeCompare(b.nome, "pt-BR");
    });
  },

  correspondeFiltroStream(item, filtro) {
    if (filtro === "online") return ["online", "saudavel", "ativo"].includes(item.monitorEstado);
    if (filtro === "atencao") return ["instavel", "offline", "fora_portal", "suspensa"].includes(item.monitorEstado);
    if (filtro === "nao_testado") return ["nao_testado", "", "desconhecido"].includes(item.monitorEstado);
    if (filtro === "sem_https") return Boolean(item.streamUrl) && !item.streamUrl.toLowerCase().startsWith("https://");
    return true;
  },

  renderizar() {
    const resumo = this.calcularResumo();
    texto("qualidade-kpi-total", resumo.total);
    texto("qualidade-kpi-saudaveis", resumo.saudaveis);
    texto("qualidade-kpi-atencao", resumo.atencao);
    texto("qualidade-kpi-criticas", resumo.criticas);
    texto("qualidade-kpi-streams", resumo.streamAlertas);
    texto("qualidade-kpi-incompletas", resumo.incompletas);
    texto("qualidade-score-medio", `${resumo.scoreMedio}/100`);
    texto("qualidade-atualizado-em", this.ultimaExecucaoMonitoramento
      ? `Monitoramento: ${this.formatarDataHora(this.ultimaExecucaoMonitoramento)}`
      : "Monitoramento técnico ainda não carregado");

    const lista = this.radiosFiltradas();
    texto("qualidade-resultados", `${lista.length} emissora${lista.length === 1 ? "" : "s"}`);
    this.renderizarResumoAlerta(resumo);
    this.renderizarTabela(lista);
    this.atualizarBadgeNavegacao();
  },

  renderizarResumoAlerta(resumo) {
    const alvo = document.getElementById("qualidade-resumo-alerta");
    if (!alvo) return;
    if (resumo.criticas > 0) {
      alvo.className = "qualidade-summary-alert is-danger";
      alvo.innerHTML = `<strong>${resumo.criticas} emissora${resumo.criticas === 1 ? "" : "s"} com pendência crítica</strong><span>Priorize stream, identificação, localização e publicação antes da próxima atualização do catálogo.</span>`;
    } else if (resumo.atencao > 0) {
      alvo.className = "qualidade-summary-alert is-warning";
      alvo.innerHTML = `<strong>${resumo.atencao} emissora${resumo.atencao === 1 ? "" : "s"} precisa${resumo.atencao === 1 ? "" : "m"} de revisão</strong><span>Não há bloqueio crítico, mas existem campos ou sinais técnicos que merecem correção.</span>`;
    } else {
      alvo.className = "qualidade-summary-alert is-success";
      alvo.innerHTML = "<strong>Catálogo com boa qualidade</strong><span>Nenhuma pendência operacional relevante foi identificada.</span>";
    }
  },

  renderizarTabela(lista) {
    const tbody = document.getElementById("qualidade-table-body");
    if (!tbody) return;
    if (!lista.length) {
      tbody.innerHTML = '<tr><td class="empty-state" colspan="9">Nenhuma emissora corresponde aos filtros.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map((item) => {
      const principais = item.pendencias.filter((p) => p.severidade !== "melhoria").slice(0, 2);
      const totalRelevante = item.criticas + item.atencoes;
      const logo = item.logo
        ? `<img src="${escaparHtml(item.logo)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'qualidade-logo-placeholder',textContent:'📻'}))">`
        : '<span class="qualidade-logo-placeholder">📻</span>';
      return `<tr>
        <td><div class="qualidade-radio-cell">${logo}<div><strong>${escaparHtml(item.nome)}</strong><small>${escaparHtml([item.cidade, item.uf].filter(Boolean).join("/") || "Localização pendente")}</small><code>${escaparHtml(item.radioId || "sem-id")}</code></div></div></td>
        <td><span class="qualidade-score qualidade-score--${item.nivel}">${item.score}</span><small>${this.rotuloNivel(item.nivel)}</small></td>
        <td><div class="qualidade-progress"><span style="width:${item.completude}%"></span></div><strong>${item.completude}%</strong></td>
        <td><span class="qualidade-stream-status qualidade-stream-status--${this.classeStream(item.monitorEstado)}">${escaparHtml(this.rotuloStream(item.monitorEstado))}</span><small>${item.falhasConsecutivas ? `${item.falhasConsecutivas} falha(s)` : escaparHtml(item.codec)}</small></td>
        <td><span class="qualidade-registration">${escaparHtml(this.rotuloStatusCadastro(item.statusCadastro))}</span><small>${item.publica ? "Pública" : "Fora do portal"}</small></td>
        <td><span class="qualidade-seal qualidade-seal--${item.seloStatus === "verificado" ? "ok" : "pending"}">${item.seloStatus === "verificado" ? "Verificado" : "Pendente"}</span></td>
        <td><strong>${totalRelevante}</strong><small>${principais.length ? principais.map((p) => escaparHtml(p.titulo)).join(" • ") : (item.melhorias ? `${item.melhorias} melhoria(s)` : "Sem pendências")}</small></td>
        <td>${this.formatarDataHora(item.atualizadoEm)}<small>${item.ultimaVerificacao ? `Stream: ${this.formatarDataHora(item.ultimaVerificacao)}` : "Stream sem data"}</small></td>
        <td class="qualidade-actions"><button class="table-button" onclick="QualidadeAdmin.abrirDetalhe('${escaparHtml(item.radioId)}')">Revisar</button><button class="table-button" onclick="QualidadeAdmin.editar('${escaparHtml(item.radioId)}')">Editar</button><button class="table-button danger" onclick="QualidadeAdmin.prepararSuspensao('${escaparHtml(item.radioId)}')" ${item.statusCadastro === "suspensa" ? "disabled" : ""}>Suspender</button></td>
      </tr>`;
    }).join("");
  },

  abrirDetalhe(radioId) {
    const item = this.avaliacoes.find((avaliacao) => avaliacao.radioId === radioId);
    if (!item) return;
    texto("qualidade-detalhe-titulo", item.nome);
    texto("qualidade-detalhe-subtitulo", `${item.cidade || "Cidade pendente"}/${item.uf || "UF pendente"} • ${item.categoria || "Categoria pendente"}`);
    const conteudo = document.getElementById("qualidade-detalhe-conteudo");
    const grupos = ["Identidade", "Localização", "Conteúdo", "Contato", "Links", "Stream", "Publicação", "Confiança"];
    const cards = grupos.map((grupo) => {
      const pendencias = item.pendencias.filter((p) => p.grupo === grupo);
      const linhas = pendencias.length
        ? pendencias.map((p) => `<li class="qualidade-issue qualidade-issue--${p.severidade}"><span>${p.severidade === "critica" ? "⛔" : p.severidade === "atencao" ? "⚠️" : "💡"}</span><div><strong>${escaparHtml(p.titulo)}</strong><small>${escaparHtml(p.detalhe)}</small></div></li>`).join("")
        : '<li class="qualidade-issue qualidade-issue--ok"><span>✓</span><div><strong>Sem pendências</strong><small>Os critérios deste grupo estão atendidos.</small></div></li>';
      return `<article class="qualidade-detail-card"><h3>${grupo}</h3><ul>${linhas}</ul></article>`;
    }).join("");

    conteudo.innerHTML = `
      <section class="qualidade-detail-kpis">
        <article><span>Qualidade</span><strong>${item.score}/100</strong><small>${this.rotuloNivel(item.nivel)}</small></article>
        <article><span>Completude</span><strong>${item.completude}%</strong><small>Campos essenciais</small></article>
        <article><span>Críticas</span><strong>${item.criticas}</strong><small>Impedimentos</small></article>
        <article><span>Atenções</span><strong>${item.atencoes}</strong><small>Revisões</small></article>
        <article><span>Melhorias</span><strong>${item.melhorias}</strong><small>Recomendações</small></article>
        <article><span>Stream</span><strong>${escaparHtml(this.rotuloStream(item.monitorEstado))}</strong><small>${item.ultimaVerificacao ? this.formatarDataHora(item.ultimaVerificacao) : "Sem verificação"}</small></article>
      </section>
      <div class="qualidade-detail-actions"><button class="primary-button" onclick="QualidadeAdmin.editar('${escaparHtml(item.radioId)}')">Editar emissora</button><button class="secondary-button" onclick="window.open('https://centralradiosbrasil.com.br/?radio=${encodeURIComponent(item.radioId)}','_blank','noopener')">Abrir no portal</button><button class="danger-button" onclick="QualidadeAdmin.prepararSuspensao('${escaparHtml(item.radioId)}')" ${item.statusCadastro === "suspensa" ? "disabled" : ""}>Preparar suspensão</button></div>
      <p class="qualidade-scope-note">A verificação de links externos nesta tela analisa presença e formato. A disponibilidade real do stream vem do monitoramento protegido do Worker.</p>
      <section class="qualidade-detail-grid">${cards}</section>`;
    document.getElementById("qualidade-detalhe")?.classList.remove("hidden");
    document.getElementById("qualidade-detalhe")?.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  fecharDetalhe() {
    document.getElementById("qualidade-detalhe")?.classList.add("hidden");
  },

  editar(radioId) {
    sessionStorage.setItem(this.acaoPendenteKey, JSON.stringify({ radioId, acao: "editar" }));
    window.location.hash = "#/emissoras";
  },

  prepararSuspensao(radioId) {
    const item = this.avaliacoes.find((avaliacao) => avaliacao.radioId === radioId);
    if (!item) return;
    const confirmou = confirm(`Preparar a suspensão de "${item.nome}"?\n\nO formulário será aberto com o status de suspensão e retirada do portal, mas nada será salvo automaticamente.`);
    if (!confirmou) return;
    sessionStorage.setItem(this.acaoPendenteKey, JSON.stringify({ radioId, acao: "suspender" }));
    window.location.hash = "#/emissoras";
  },

  aplicarAcaoPendenteEmissoras() {
    const bruto = sessionStorage.getItem(this.acaoPendenteKey);
    if (!bruto) return;
    sessionStorage.removeItem(this.acaoPendenteKey);
    let dados;
    try { dados = JSON.parse(bruto); } catch { return; }
    const radioId = String(dados?.radioId || "");
    if (!radioId || typeof EmissorasAdmin === "undefined") return;
    const emissora = EmissorasAdmin.emissoras?.find((item) => item.id === radioId);
    if (!emissora) {
      alert("A emissora não foi encontrada no rascunho atual. Descarte ou atualize o rascunho e tente novamente.");
      return;
    }
    EmissorasAdmin.editar(radioId);
    if (dados.acao === "suspender") {
      setTimeout(() => {
        const status = document.getElementById("emissora-status-cadastro");
        const ativa = document.getElementById("emissora-active");
        const publica = document.getElementById("emissora-public");
        if (status) status.value = "suspensa";
        if (ativa) ativa.checked = false;
        if (publica) publica.checked = false;
        EmissorasAdmin.atualizarPainelFluxo?.();
        alert("Suspensão preparada. Revise o motivo, os campos e clique em Salvar somente após confirmar a decisão.");
      }, 80);
    }
  },

  async executarMonitoramento() {
    if (!API.chaveAdmin()) {
      await this.autenticar();
      if (!API.chaveAdmin()) return;
    }
    const botao = document.getElementById("qualidade-monitorar");
    if (botao) { botao.disabled = true; botao.textContent = "Verificando…"; }
    try {
      const resposta = await API.executarMonitoramentoStreams();
      alert(`${resposta.totalVerificado || 0} stream${Number(resposta.totalVerificado || 0) === 1 ? "" : "s"} verificado${Number(resposta.totalVerificado || 0) === 1 ? "" : "s"}.`);
      await this.carregar(true);
    } catch (erro) {
      alert(erro.message || "Não foi possível executar o monitoramento.");
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = "📡 Verificar streams"; }
    }
  },

  exportarCsv() {
    const itens = this.radiosFiltradas();
    if (!itens.length) return alert("Não há registros para exportar.");
    const linhas = [["radio_id", "radio", "uf", "cidade", "categoria", "qualidade", "completude", "nivel", "stream_status", "falhas", "status_cadastro", "selo", "criticas", "atencoes", "melhorias", "pendencias"]];
    itens.forEach((item) => linhas.push([
      item.radioId, item.nome, item.uf, item.cidade, item.categoria, item.score, item.completude, item.nivel,
      item.monitorEstado, item.falhasConsecutivas, item.statusCadastro, item.seloStatus, item.criticas, item.atencoes,
      item.melhorias, item.pendencias.map((p) => p.titulo).join(" | ")
    ]));
    const csv = linhas.map((linha) => linha.map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qualidade-emissoras-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  atualizarSessao() {
    const login = document.getElementById("qualidade-login-panel");
    const nota = document.getElementById("qualidade-session-note");
    const autenticado = Boolean(API.chaveAdmin());
    login?.classList.toggle("hidden", autenticado);
    if (nota) nota.textContent = autenticado
      ? "Monitoramento técnico e ações administrativas disponíveis nesta aba."
      : "Análise cadastral pública ativa; entre para incluir o monitoramento técnico protegido.";
  },

  atualizarBadgeNavegacao() {
    const numero = this.calcularResumo().atencaoTotal;
    const badge = document.getElementById("qualidade-nav-count");
    if (!badge) return;
    badge.textContent = numero > 99 ? "99+" : String(numero);
    badge.classList.toggle("hidden", numero <= 0);
  },

  renderizarErro(erro) {
    const tbody = document.getElementById("qualidade-table-body");
    if (tbody) tbody.innerHTML = `<tr><td class="empty-state" colspan="9">Não foi possível analisar o catálogo.<br><small>${escaparHtml(erro.message || "Falha desconhecida")}</small></td></tr>`;
  },

  obterLogo(radio) {
    if (typeof radio?.logo === "string") return String(radio.logo).trim();
    return String(radio?.logo?.quadrada || radio?.logo?.miniatura || radio?.logo?.original || "").trim();
  },

  urlValida(valor) {
    try {
      const url = new URL(String(valor || ""));
      return ["http:", "https:"].includes(url.protocol);
    } catch { return false; }
  },

  rotuloNivel(nivel) {
    return ({ saudavel: "Saudável", atencao: "Atenção", critica: "Crítica" })[nivel] || "Atenção";
  },

  rotuloStream(estado) {
    return ({ online: "Online", saudavel: "Online", ativo: "Online", instavel: "Instável", offline: "Offline", fora_portal: "Fora do portal", suspensa: "Suspensa", nao_testado: "Não testado", desconhecido: "Não testado" })[estado] || "Não testado";
  },

  classeStream(estado) {
    if (["online", "saudavel", "ativo"].includes(estado)) return "online";
    if (["suspensa", "fora_portal", "offline"].includes(estado)) return "danger";
    if (estado === "instavel") return "warning";
    return "neutral";
  },

  rotuloStatusCadastro(status) {
    return ({ cadastro_recebido: "Recebido", em_analise: "Em análise", aprovada: "Aprovada", aguardando_selo: "Aguardando selo", publicada: "Publicada", suspensa: "Suspensa", rejeitada: "Rejeitada" })[status] || status || "Não informado";
  },

  rotuloRede(rede) {
    return ({ facebook: "Facebook", instagram: "Instagram", youtube: "YouTube" })[rede] || rede;
  },

  formatarDataHora(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(data);
  },

  estado(tipo, mensagem) {
    const badge = document.getElementById("qualidade-status-badge");
    if (!badge) return;
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  }
};
