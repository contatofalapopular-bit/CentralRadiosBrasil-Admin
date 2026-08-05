let dashboardCarregando = false;
let dashboardEventosRegistrados = false;
let dashboardOperacional = null;

async function carregarDashboard(semCache = false) {
  if (dashboardCarregando) return;
  dashboardCarregando = true;
  registrarEventosDashboard();

  estadoDashboard("loading", "Carregando visão operacional");
  const refresh = document.getElementById("refresh-button");
  if (refresh) refresh.disabled = true;
  document.getElementById("error-panel")?.classList.add("hidden");

  try {
    const docRadios = await API.carregar("radios.json", semCache);
    let docCategorias = { categorias: [] };
    try {
      docCategorias = await API.carregar("categorias.json", semCache);
    } catch (erro) {
      console.warn("categorias.json indisponível", erro);
    }

    const radios = Array.isArray(docRadios) ? docRadios : (docRadios.radios || []);
    const resumoCatalogo = calcularResumoCatalogoDashboard(radios);

    let resumoOperacional = null;
    if (API.chaveAdmin()) {
      try {
        resumoOperacional = await API.resumoDashboard();
        dashboardOperacional = resumoOperacional;
      } catch (erro) {
        console.warn("Dashboard operacional indisponível:", erro);
        if (erro.status === 401) {
          API.definirChaveAdmin("");
        }
      }
    }

    dashboardOperacional = resumoOperacional;
    renderizarCatalogoDashboard(docRadios, resumoCatalogo);
    renderizarOperacaoDashboard(resumoOperacional);
    atualizarSessaoDashboard(Boolean(resumoOperacional));
    estadoDashboard("success", resumoOperacional ? "Operação sincronizada" : "Catálogo conectado");
  } catch (erro) {
    console.error(erro);
    estadoDashboard("error", "Falha na conexão");
    texto("error-message", `${erro.message}. Verifique a conexão e tente novamente.`);
    document.getElementById("error-panel")?.classList.remove("hidden");
  } finally {
    dashboardCarregando = false;
    if (refresh) {
      refresh.disabled = false;
      refresh.textContent = "↻ Atualizar dados";
    }
  }
}

function registrarEventosDashboard() {
  if (dashboardEventosRegistrados) return;
  dashboardEventosRegistrados = true;

  document.getElementById("dashboard-login-button")?.addEventListener("click", autenticarDashboard);

  document.addEventListener("click", (evento) => {
    const alvo = evento.target.closest("[data-dashboard-route]");
    if (!alvo) return;
    const rota = String(alvo.dataset.dashboardRoute || "").trim();
    if (rota) window.location.hash = `#/${rota}`;
  });
}

async function autenticarDashboard() {
  if (API.chaveAdmin()) {
    const sair = confirm("Encerrar a sessão administrativa desta aba?");
    if (!sair) return;
    await API.logoutAdmin();
    dashboardOperacional = null;
    renderizarOperacaoDashboard(null);
    atualizarSessaoDashboard(false);
    return;
  }

  const chave = prompt("Digite a chave administrativa. Ela será usada apenas para criar uma sessão temporária:");
  if (chave === null || !String(chave).trim()) return;

  const botao = document.getElementById("dashboard-login-button");
  if (botao) { botao.disabled = true; botao.textContent = "Entrando…"; }
  try {
    await API.loginAdmin(String(chave).trim());
    await carregarDashboard(true);
  } catch (erro) {
    API.definirChaveAdmin("");
    alert(erro.message || "Não foi possível iniciar a sessão administrativa.");
  } finally {
    if (botao) botao.disabled = false;
    atualizarSessaoDashboard(Boolean(API.chaveAdmin()));
  }
}

function calcularResumoCatalogoDashboard(radios) {
  const cidades = new Set();
  const estados = new Map();
  const categorias = new Map();
  let streams = 0;
  let streamsHttps = 0;
  let verificadas = 0;
  let premium = 0;

  radios.forEach((radio) => {
    const cidade = radio.localizacao?.cidade ?? radio.cidade ?? "";
    const uf = String(radio.localizacao?.uf ?? radio.uf ?? "").toUpperCase();
    if (cidade) cidades.add(`${uf}:${normalizar(cidade)}`);
    if (uf) estados.set(uf, (estados.get(uf) || 0) + 1);

    const cats = [
      radio.classificacao?.categoriaPrincipal,
      radio.categoriaPrincipal,
      ...(radio.classificacao?.categorias || []),
      ...(radio.categorias || [])
    ].filter(Boolean);
    [...new Set(cats.map(normalizar))].forEach((cat) =>
      categorias.set(cat, (categorias.get(cat) || 0) + 1)
    );

    const listaStreams = Array.isArray(radio.streams) ? radio.streams : [];
    streams += listaStreams.length;
    streamsHttps += listaStreams.filter((stream) =>
      String(stream.url || "").toLowerCase().startsWith("https://")
    ).length;
    if (radio.status?.verificada === true || radio.verificada === true || radio.selo?.status === "verificado") verificadas++;
    if (["premium", "profissional", "pro"].includes(String(radio.plano?.nome || radio.plano || "").toLowerCase())) premium++;
  });

  return { total: radios.length, cidades, estados, categorias, streams, streamsHttps, verificadas, premium };
}

function renderizarCatalogoDashboard(docRadios, resumo) {
  const publicadas = resumo.total;
  const percentualPublicadas = resumo.total ? 100 : 0;
  const percentualSelo = resumo.total ? Math.round((resumo.verificadas / resumo.total) * 100) : 0;
  const solicitacoesAnalise = Number(dashboardOperacional?.solicitacoes?.emAnalise || 0) +
    Number(dashboardOperacional?.alteracoes?.emAnalise || 0);
  const streamsAtencao = Number(dashboardOperacional?.streams?.indisponiveis || 0);

  texto("total-radios", resumo.total);
  texto("total-publicadas", publicadas);
  texto("total-em-analise", dashboardOperacional ? solicitacoesAnalise : "—");
  texto("total-bloqueadas", dashboardOperacional ? streamsAtencao : "—");
  texto("total-selo-verificado", resumo.verificadas);
  texto("total-streams", resumo.streams);
  texto("publicadas-percentual", `${percentualPublicadas}% do total`);
  texto("selo-percentual", `${percentualSelo}% do total`);
  texto("streams-seguros", `${resumo.streamsHttps} em HTTPS`);
  texto("total-cidades", resumo.cidades.size);
  texto("total-estados", `${resumo.estados.size} estado${resumo.estados.size === 1 ? "" : "s"}`);
  texto("network-total-estados", resumo.estados.size);
  texto("total-categorias", `${resumo.categorias.size} categoria${resumo.categorias.size === 1 ? "" : "s"}`);
  texto("total-verificadas", resumo.verificadas);
  texto("dashboard-premium-count", resumo.premium);
  texto("dashboard-ready-count", publicadas);
  texto("dashboard-pending-count", dashboardOperacional ? streamsAtencao : 0);

  const versao = String(
    docRadios.datasetVersion || docRadios.catalogo?.versaoPainel ||
    docRadios.schemaVersion || CONFIG.VERSION
  ).trim();
  const atualizadoEm = docRadios.generatedAt || docRadios.catalogo?.geradoEm || docRadios.geradoEm || null;
  texto("dataset-version", versao);
  texto("dashboard-data-source", `Fonte: ${CONFIG.DADOS_REPO}/radios.json`);
  texto("last-update", `Última atualização: ${formatarData(atualizadoEm)}`);

  const solicitacoes = dashboardOperacional?.solicitacoes || {};
  const alteracoes = dashboardOperacional?.alteracoes || {};
  renderizarMetricas("dashboard-status-list", [
    ["Pendentes", Number(solicitacoes.pendentes || 0) + Number(alteracoes.pendentes || 0), "registration-cadastro_recebido"],
    ["Em análise", Number(solicitacoes.emAnalise || 0) + Number(alteracoes.emAnalise || 0), "registration-em_analise"],
    ["Aprovadas", Number(solicitacoes.aprovadas || 0) + Number(alteracoes.aprovadas || 0), "registration-publicada"]
  ], Math.max(Number(solicitacoes.total || 0) + Number(alteracoes.total || 0), 1));
  renderizarMetricas("dashboard-seal-list", [
    ["Verificado", resumo.verificadas, "seal-verificado"],
    ["Não verificado", Math.max(resumo.total - resumo.verificadas, 0), "seal-nao_solicitado"]
  ], Math.max(resumo.total, 1));
  renderizarRanking("dashboard-states-list", resumo.estados);
  renderizarRanking("dashboard-categories-list", resumo.categorias);
  renderizarSaudeStreams(resumo.streams, resumo.streamsHttps);

  const pending = document.getElementById("dashboard-pending-summary");
  if (pending) {
    pending.innerHTML = streamsAtencao
      ? `<span>${streamsAtencao} stream${streamsAtencao === 1 ? "" : "s"} exigindo atenção</span>`
      : '<span class="all-ready">✓ Catálogo oficial sem pendências técnicas conhecidas</span>';
  }
}

function renderizarOperacaoDashboard(resumo) {
  const campos = ["solicitacoes", "ocorrencias", "streaming", "emails", "streams"];
  if (!resumo) {
    texto("dashboard-alert-total", "—");
    campos.forEach((campo) => texto(`dashboard-alert-${campo}`, "—"));
    texto("dashboard-operational-status", "Entre no Painel para carregar alertas e atividades.");
    texto("dashboard-activity-updated", "—");
    const atividade = document.getElementById("dashboard-activity-list");
    if (atividade) atividade.innerHTML = '<p class="dashboard-empty">Sessão administrativa necessária.</p>';
    const fila = document.getElementById("dashboard-queue-summary");
    if (fila) fila.innerHTML = '<p class="dashboard-empty">Aguardando sessão administrativa.</p>';
    atualizarBadgesNavegacao({});
    return;
  }

  const alertas = resumo.alertas || {};
  const totalVisivel = campos.reduce((total, campo) => total + Number(alertas[campo] || 0), 0);
  texto("dashboard-alert-total", totalVisivel);
  campos.forEach((campo) => texto(`dashboard-alert-${campo}`, Number(alertas[campo] || 0)));
  texto("dashboard-operational-status", totalVisivel
    ? `${totalVisivel} item${totalVisivel === 1 ? "" : "s"} aguardando atenção.`
    : "Nenhum alerta operacional pendente.");
  texto("dashboard-activity-updated", `Atualizado ${formatarDataHoraDashboard(resumo.geradoEm)}`);
  renderizarAtividadesDashboard(resumo.atividades || []);
  renderizarResumoFilasDashboard(resumo);
  atualizarBadgesNavegacao(alertas);
}

function renderizarAtividadesDashboard(atividades) {
  const alvo = document.getElementById("dashboard-activity-list");
  if (!alvo) return;
  if (!atividades.length) {
    alvo.innerHTML = '<p class="dashboard-empty">Nenhuma atividade registrada ainda.</p>';
    return;
  }
  const icones = { solicitacao: "📥", alteracao: "📝", streaming: "🚀", ocorrencia: "⚠️", email: "✉️", stream: "📡" };
  const atividadesVisiveis = atividades.filter((item) => item?.tipo !== "comercial" && item?.rota !== "comercial");
  if (!atividadesVisiveis.length) {
    alvo.innerHTML = '<p class="dashboard-empty">Nenhuma atividade operacional registrada ainda.</p>';
    return;
  }
  alvo.innerHTML = atividadesVisiveis.map((item) => `
    <button type="button" class="activity-item" data-dashboard-route="${escaparHtml(item.rota || "dashboard")}">
      <span class="activity-icon">${icones[item.tipo] || "•"}</span>
      <span class="activity-content"><strong>${escaparHtml(item.titulo || "Atividade")}</strong><small>${escaparHtml(item.detalhe || "")}</small></span>
      <time datetime="${escaparHtml(item.data || "")}">${formatarDataHoraDashboard(item.data)}</time>
    </button>
  `).join("");
}

function renderizarResumoFilasDashboard(resumo) {
  const alvo = document.getElementById("dashboard-queue-summary");
  if (!alvo) return;
  const itens = [
    ["Solicitações pendentes", Number(resumo.solicitacoes?.pendentes || 0) + Number(resumo.alteracoes?.pendentes || 0), "solicitacoes"],
    ["Ocorrências em análise", Number(resumo.ocorrencias?.emAnalise || 0), "ocorrencias"],
    ["Leads qualificados", Number(resumo.streaming?.qualificados || 0), "streaming-interesses"],
    ["E-mails na entrada", Number(resumo.emails?.entrada || 0), "emails"],
    ["Streams online", Number(resumo.streams?.online || 0), "streams"]
  ];
  alvo.innerHTML = itens.map(([rotulo, valor, rota]) => `
    <button type="button" class="queue-row" data-dashboard-route="${rota}"><span>${rotulo}</span><strong>${valor}</strong></button>
  `).join("");
}

function atualizarSessaoDashboard(autenticado) {
  const botao = document.getElementById("dashboard-login-button");
  const nota = document.getElementById("dashboard-session-note");
  if (botao) botao.textContent = autenticado ? "🔓 Encerrar sessão" : "🔐 Entrar para ver alertas";
  if (nota) nota.textContent = autenticado
    ? "Sessão administrativa ativa nesta aba."
    : "Os dados do catálogo permanecem públicos; alertas exigem sessão administrativa.";
}

function atualizarBadgesNavegacao(alertas) {
  const mapa = {
    "solicitacoes-nav-count": alertas.solicitacoes,
    "ocorrencias-nav-count": alertas.ocorrencias,
    "streaming-nav-count": alertas.streaming,
    "emails-nav-count": alertas.emails,
    "streams-nav-count": alertas.streams
  };
  Object.entries(mapa).forEach(([id, valor]) => {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    const numero = Number(valor || 0);
    elemento.textContent = numero > 99 ? "99+" : String(numero);
    elemento.classList.toggle("hidden", numero <= 0);
  });
}

function formatarDataHoraDashboard(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  }).format(data);
}

function renderizarMetricas(id, itens, total) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  alvo.innerHTML = itens.map(([rotulo, valor, classe]) => {
    const percentual = Math.round((valor / total) * 100);
    return `<div class="metric-row"><div class="metric-row-header"><span><i class="metric-dot ${classe}"></i>${rotulo}</span><strong>${valor}</strong></div><div class="metric-track"><span style="width:${percentual}%"></span></div></div>`;
  }).join("");
}

function renderizarRanking(id, mapa) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  const itens = [...mapa.entries()].sort((a,b) => b[1]-a[1]).slice(0,5);
  if (!itens.length) { alvo.innerHTML = '<p class="dashboard-empty">Nenhum dado disponível.</p>'; return; }
  const max = itens[0][1] || 1;
  alvo.innerHTML = itens.map(([nome, valor], i) => `<div class="ranking-row"><span class="ranking-position">${i+1}</span><div class="ranking-content"><div><strong>${escaparHtml(String(nome))}</strong><span>${valor}</span></div><div class="ranking-track"><span style="width:${Math.round(valor/max*100)}%"></span></div></div></div>`).join("");
}

function renderizarSaudeStreams(total, https) {
  const alvo = document.getElementById("dashboard-stream-health");
  if (!alvo) return;
  const http = Math.max(total - https, 0);
  alvo.innerHTML = `<div class="health-item"><span>Total</span><strong>${total}</strong><small>Streams cadastrados</small></div><div class="health-item"><span>HTTPS</span><strong>${https}</strong><small>Conexões seguras</small></div><div class="health-item ${http ? "health-alert" : ""}"><span>HTTP</span><strong>${http}</strong><small>${http ? "Revisar compatibilidade" : "Nenhum inseguro"}</small></div><div class="health-item"><span>Cobertura</span><strong>${total ? 100 : 0}%</strong><small>Emissoras com stream</small></div>`;
}

function estadoDashboard(tipo, mensagem) {
  const badge = document.getElementById("connection-badge");
  if (!badge) return;
  badge.className = `status-badge ${tipo}`;
  badge.textContent = mensagem;
}
