const AudienciaAdmin = {
  periodo: "24h",
  filtroNivel: "todos",
  busca: "",
  dados: null,
  radiosCatalogo: new Map(),
  inicializada: false,
  carregando: false,

  async iniciar() {
    if (!this.inicializada) {
      this.registrarEventos();
      this.inicializada = true;
    }
    await this.carregar();
  },

  registrarEventos() {
    document.getElementById("audiencia-periodo")?.addEventListener("change", (evento) => {
      this.periodo = evento.target.value || "24h";
      this.carregar();
    });
    document.getElementById("audiencia-nivel")?.addEventListener("change", (evento) => {
      this.filtroNivel = evento.target.value || "todos";
      this.renderizarTabela();
    });
    document.getElementById("audiencia-busca")?.addEventListener("input", (evento) => {
      this.busca = normalizar(evento.target.value || "");
      this.renderizarTabela();
    });
    document.getElementById("audiencia-atualizar")?.addEventListener("click", () => this.carregar(true));
    document.getElementById("audiencia-exportar")?.addEventListener("click", () => this.exportarCsv());
    document.getElementById("audiencia-login")?.addEventListener("click", () => this.autenticar());
    document.getElementById("audiencia-detalhe-fechar")?.addEventListener("click", () => this.fecharDetalhe());
    document.getElementById("audiencia-table-body")?.addEventListener("click", (evento) => {
      const botao = evento.target.closest("[data-audiencia-radio]");
      if (botao) this.abrirDetalhe(botao.dataset.audienciaRadio);
    });
  },

  async autenticar() {
    const chave = prompt("Digite a chave administrativa para abrir a auditoria:");
    if (chave === null || !String(chave).trim()) return;
    try {
      await API.loginAdmin(String(chave).trim());
      await this.carregar(true);
      carregarDashboard(true).catch(() => {});
    } catch (erro) {
      API.definirChaveAdmin("");
      alert(erro.message || "Não foi possível iniciar a sessão administrativa.");
    }
  },

  async carregar(forcar = false) {
    if (this.carregando) return;
    this.carregando = true;
    this.estado("loading", "Carregando auditoria");
    document.getElementById("audiencia-login-panel")?.classList.toggle("hidden", Boolean(API.chaveAdmin()));
    document.getElementById("audiencia-conteudo")?.classList.toggle("hidden", !API.chaveAdmin());
    try {
      if (!API.chaveAdmin()) {
        this.estado("warning", "Sessão administrativa necessária");
        return;
      }
      const [catalogo, dados] = await Promise.all([
        API.carregar("radios.json", forcar).catch(() => ({ radios: [] })),
        API.listarAuditoriaAudiencia({ periodo: this.periodo })
      ]);
      const radios = Array.isArray(catalogo) ? catalogo : (catalogo.radios || []);
      this.radiosCatalogo = new Map(radios.map((radio) => [String(radio.id || ""), radio]));
      this.dados = dados;
      this.renderizarResumo();
      this.renderizarTabela();
      this.atualizarBadgeNavegacao();
      this.estado("success", `Auditoria atualizada — ${dados.janela?.rotulo || "período selecionado"}`);
      texto("audiencia-atualizado-em", `Atualizado em ${this.formatarDataHora(dados.geradoEm)}`);
    } catch (erro) {
      console.error("Auditoria de audiência:", erro);
      if (erro.status === 401) {
        API.definirChaveAdmin("");
        document.getElementById("audiencia-login-panel")?.classList.remove("hidden");
        document.getElementById("audiencia-conteudo")?.classList.add("hidden");
      }
      this.estado("error", erro.message || "Falha ao carregar auditoria");
    } finally {
      this.carregando = false;
    }
  },

  renderizarResumo() {
    const resumo = this.dados?.resumo || {};
    texto("audiencia-kpi-validas", resumo.validas || 0);
    texto("audiencia-kpi-redes", resumo.redesUnicas || 0);
    texto("audiencia-kpi-duplicadas", resumo.duplicadas || 0);
    texto("audiencia-kpi-taxa", `${Number(resumo.taxaDuplicidade || 0).toLocaleString("pt-BR")}%`);
    texto("audiencia-kpi-alertas", Number(resumo.revisar || 0) + Number(resumo.observar || 0));
    texto("audiencia-kpi-pendentes", resumo.pendentes || 0);
    const revisar = Number(resumo.revisar || 0);
    const observar = Number(resumo.observar || 0);
    const painel = document.getElementById("audiencia-resumo-alerta");
    if (painel) {
      painel.className = `audiencia-summary-alert ${revisar ? "is-danger" : observar ? "is-warning" : "is-success"}`;
      painel.innerHTML = revisar
        ? `<strong>${revisar} rádio${revisar === 1 ? "" : "s"} precisa${revisar === 1 ? "" : "m"} de revisão</strong><span>Abra os detalhes antes de tomar qualquer medida. Os sinais não constituem prova de fraude.</span>`
        : observar
          ? `<strong>${observar} rádio${observar === 1 ? "" : "s"} em observação</strong><span>Acompanhe crescimento, duplicidades e picos ao longo do tempo.</span>`
          : `<strong>Nenhum comportamento crítico detectado</strong><span>A proteção de rede está ativa e os indicadores atuais permanecem dentro do padrão.</span>`;
    }
  },

  obterRadioCatalogo(id) {
    const radio = this.radiosCatalogo.get(String(id || "")) || {};
    const nome = radio.nomeFantasia || radio.nome || id;
    const cidade = radio.localizacao?.cidade || radio.cidade || "";
    const uf = radio.localizacao?.uf || radio.uf || "";
    const logo = radio.logo?.miniatura || radio.logo?.quadrada || radio.logo?.original || "";
    return { nome, cidade, uf, logo };
  },

  radiosFiltradas() {
    const itens = Array.isArray(this.dados?.radios) ? this.dados.radios : [];
    return itens.filter((item) => {
      if (this.filtroNivel !== "todos" && item.nivel !== this.filtroNivel) return false;
      if (!this.busca) return true;
      const radio = this.obterRadioCatalogo(item.radioId);
      return normalizar(`${radio.nome} ${radio.cidade} ${radio.uf} ${item.radioId}`).includes(this.busca);
    });
  },

  renderizarTabela() {
    const alvo = document.getElementById("audiencia-table-body");
    if (!alvo) return;
    const itens = this.radiosFiltradas();
    texto("audiencia-resultados", `${itens.length} rádio${itens.length === 1 ? "" : "s"}`);
    if (!itens.length) {
      alvo.innerHTML = '<tr><td colspan="10" class="empty-state">Nenhum registro encontrado para os filtros selecionados.</td></tr>';
      return;
    }
    alvo.innerHTML = itens.map((item) => {
      const radio = this.obterRadioCatalogo(item.radioId);
      const crescimento = Number(item.crescimentoPercentual || 0);
      const classeCrescimento = crescimento >= 100 ? "growth-high" : crescimento < 0 ? "growth-down" : "";
      return `<tr>
        <td><div class="audiencia-radio-cell">${radio.logo ? `<img src="${escaparHtml(radio.logo)}" alt="" loading="lazy">` : '<span class="audiencia-radio-placeholder">📻</span>'}<div><strong>${escaparHtml(radio.nome)}</strong><small>${escaparHtml([radio.cidade, radio.uf].filter(Boolean).join("/"))}</small><code>${escaparHtml(item.radioId)}</code></div></div></td>
        <td><strong>${item.validas}</strong><small>${item.validasAnteriores} no período anterior</small></td>
        <td>${item.redesUnicas}</td>
        <td>${item.duplicadas}<small>${item.taxaDuplicidade}% dos inícios</small></td>
        <td>${item.pico10Minutos}</td>
        <td class="${classeCrescimento}">${crescimento > 0 ? "+" : ""}${crescimento}%</td>
        <td>${item.inicios}</td>
        <td>${item.pendentes}</td>
        <td><span class="audiencia-level audiencia-level--${item.nivel}">${this.rotuloNivel(item.nivel)}</span><small class="audiencia-score">${item.pontuacao}/100</small></td>
        <td><button class="secondary-button compact-button" type="button" data-audiencia-radio="${escaparHtml(item.radioId)}">Detalhes</button></td>
      </tr>`;
    }).join("");
  },

  async abrirDetalhe(radioId) {
    const painel = document.getElementById("audiencia-detalhe");
    if (!painel) return;
    painel.classList.remove("hidden");
    painel.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("audiencia-detalhe-conteudo").innerHTML = '<p class="audiencia-loading">Carregando detalhes…</p>';
    try {
      const dados = await API.detalharAuditoriaAudiencia(radioId, { periodo: this.periodo });
      this.renderizarDetalhe(dados);
    } catch (erro) {
      document.getElementById("audiencia-detalhe-conteudo").innerHTML = `<p class="audiencia-error">${escaparHtml(erro.message || "Falha ao carregar detalhes.")}</p>`;
    }
  },

  renderizarDetalhe(dados) {
    const item = dados.radio || {};
    const radio = this.obterRadioCatalogo(item.radioId);
    texto("audiencia-detalhe-titulo", radio.nome);
    texto("audiencia-detalhe-subtitulo", `${dados.janela?.rotulo || "Período"} · ${item.radioId}`);
    const max = Math.max(...(dados.distribuicao || []).map((p) => Number(p.validas || 0)), 1);
    const grafico = (dados.distribuicao || []).map((p) => {
      const valor = Number(p.validas || 0);
      const largura = Math.max(valor ? 4 : 0, Math.round((valor / max) * 100));
      return `<div class="audiencia-chart-row"><time>${this.formatarPeriodo(p.periodo, dados.janela?.agrupamento)}</time><div class="audiencia-chart-track"><span style="width:${largura}%"></span></div><strong>${valor}</strong><small>${Number(p.redes || 0)} redes</small></div>`;
    }).join("") || '<p class="dashboard-empty">Nenhuma reprodução válida no período.</p>';
    const motivos = item.motivos?.length
      ? `<ul>${item.motivos.map((motivo) => `<li>${escaparHtml(motivo)}</li>`).join("")}</ul>`
      : '<p>Nenhum sinal relevante foi identificado pelos critérios atuais.</p>';
    const picos = (dados.janelasPico || []).map((p) => `<tr><td>${this.formatarDataHora(`${String(p.inicio).replace(" ", "T")}Z`)}</td><td>${p.validas}</td><td>${p.redes}</td></tr>`).join("") || '<tr><td colspan="3" class="empty-state">Sem picos registrados.</td></tr>';
    const sessoes = (dados.sessoesRecentes || []).map((s) => `<tr><td><code>${escaparHtml(s.eventoId)}</code></td><td><span class="audiencia-session audiencia-session--${escaparHtml(s.status)}">${escaparHtml(s.status)}</span></td><td>${Number(s.segundos || 0)} s</td><td>${escaparHtml(s.origem || "—")}</td><td>${this.formatarDataHora(s.iniciadoEm)}</td></tr>`).join("") || '<tr><td colspan="5" class="empty-state">Sem sessões recentes.</td></tr>';
    document.getElementById("audiencia-detalhe-conteudo").innerHTML = `
      <section class="audiencia-detail-kpis">
        <article><span>Válidas</span><strong>${item.validas}</strong></article>
        <article><span>Redes únicas</span><strong>${item.redesUnicas}</strong></article>
        <article><span>Duplicadas</span><strong>${item.duplicadas}</strong></article>
        <article><span>Pico/10 min</span><strong>${item.pico10Minutos}</strong></article>
        <article><span>Crescimento</span><strong>${item.crescimentoPercentual > 0 ? "+" : ""}${item.crescimentoPercentual}%</strong></article>
        <article><span>Nível</span><strong>${this.rotuloNivel(item.nivel)}</strong></article>
      </section>
      <section class="audiencia-detail-grid">
        <article class="audiencia-detail-card"><h3>Sinais detectados</h3><div class="audiencia-reasons audiencia-reasons--${item.nivel}">${motivos}</div><p class="audiencia-legal-note">Esses indicadores orientam revisão humana e não comprovam fraude isoladamente.</p></article>
        <article class="audiencia-detail-card"><h3>Distribuição no período</h3><div class="audiencia-chart">${grafico}</div></article>
      </section>
      <section class="audiencia-detail-grid">
        <article class="audiencia-detail-card"><h3>Maiores janelas de 10 minutos</h3><div class="table-scroll"><table class="audiencia-mini-table"><thead><tr><th>Início</th><th>Válidas</th><th>Redes</th></tr></thead><tbody>${picos}</tbody></table></div></article>
        <article class="audiencia-detail-card"><h3>Sessões recentes</h3><div class="table-scroll"><table class="audiencia-mini-table"><thead><tr><th>Evento</th><th>Status</th><th>Tempo</th><th>Origem</th><th>Início</th></tr></thead><tbody>${sessoes}</tbody></table></div></article>
      </section>`;
  },

  fecharDetalhe() {
    document.getElementById("audiencia-detalhe")?.classList.add("hidden");
  },

  exportarCsv() {
    const itens = this.radiosFiltradas();
    if (!itens.length) return alert("Não há registros para exportar.");
    const linhas = [["radio_id", "radio", "validas", "redes_unicas", "duplicadas", "taxa_duplicidade", "pico_10_min", "crescimento_percentual", "inicios", "pendentes", "nivel", "pontuacao"]];
    itens.forEach((item) => {
      const radio = this.obterRadioCatalogo(item.radioId);
      linhas.push([item.radioId, radio.nome, item.validas, item.redesUnicas, item.duplicadas, item.taxaDuplicidade, item.pico10Minutos, item.crescimentoPercentual, item.inicios, item.pendentes, item.nivel, item.pontuacao]);
    });
    const csv = linhas.map((linha) => linha.map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria-audiencia-${this.periodo}-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  atualizarBadgeNavegacao() {
    const numero = Number(this.dados?.resumo?.revisar || 0);
    const badge = document.getElementById("audiencia-nav-count");
    if (!badge) return;
    badge.textContent = numero > 99 ? "99+" : String(numero);
    badge.classList.toggle("hidden", numero <= 0);
  },

  rotuloNivel(nivel) {
    return ({ normal: "Normal", observar: "Observar", revisar: "Revisar" })[nivel] || "Normal";
  },

  formatarDataHora(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(data);
  },

  formatarPeriodo(valor, agrupamento) {
    if (!valor) return "—";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return agrupamento === "hora"
      ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(data)
      : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(data);
  },

  estado(tipo, mensagem) {
    const badge = document.getElementById("audiencia-status-badge");
    if (!badge) return;
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  }
};
