let dashboardCarregando = false;

async function carregarDashboard(semCache = false) {
  if (dashboardCarregando) return;
  dashboardCarregando = true;

  estadoDashboard("loading", "Carregando dados do GitHub");
  const refresh = document.getElementById("refresh-button");
  if (refresh) refresh.disabled = true;
  document.getElementById("error-panel")?.classList.add("hidden");

  try {
    const docRadios = await API.carregar("radios.json", semCache);
    let docCategorias = { categorias: [] };
    let docVersao = {};

    try { docCategorias = await API.carregar("categorias.json", semCache); } catch (e) { console.warn("categorias.json indisponível", e); }
    try { docVersao = await API.carregar("version.json", semCache); }
    catch (_) {
      try { docVersao = await API.carregar("versao.json", semCache); } catch (e) { console.warn("Arquivo de versão externo indisponível", e); }
    }

    const radios = Array.isArray(docRadios) ? docRadios : (docRadios.radios || []);
    const total = radios.length;
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
      [...new Set(cats.map(normalizar))].forEach((cat) => categorias.set(cat, (categorias.get(cat) || 0) + 1));

      const listaStreams = Array.isArray(radio.streams) ? radio.streams : [];
      streams += listaStreams.length;
      streamsHttps += listaStreams.filter((s) => String(s.url || "").toLowerCase().startsWith("https://")).length;
      if (radio.status?.verificada === true || radio.verificada === true || radio.selo?.status === "verificado") verificadas++;
      if (["premium", "profissional", "pro"].includes(String(radio.plano?.nome || radio.plano || "").toLowerCase())) premium++;
    });

    // radios.json oficial contém somente emissoras aprovadas e publicadas.
    const publicadas = total;
    const emAnalise = 0;
    const bloqueadas = 0;
    const percentualPublicadas = total ? Math.round((publicadas / total) * 100) : 0;
    const percentualSelo = total ? Math.round((verificadas / total) * 100) : 0;

    texto("total-radios", total);
    texto("total-publicadas", publicadas);
    texto("total-em-analise", emAnalise);
    texto("total-bloqueadas", bloqueadas);
    texto("total-selo-verificado", verificadas);
    texto("total-streams", streams);
    texto("publicadas-percentual", `${percentualPublicadas}% do total`);
    texto("selo-percentual", `${percentualSelo}% do total`);
    texto("streams-seguros", `${streamsHttps} em HTTPS`);
    texto("total-cidades", cidades.size);
    texto("total-estados", `${estados.size} estado${estados.size === 1 ? "" : "s"}`);
    texto("network-total-estados", estados.size);
    texto("total-categorias", `${categorias.size} categoria${categorias.size === 1 ? "" : "s"}`);
    texto("total-verificadas", verificadas);
    texto("dashboard-premium-count", premium);
    texto("dashboard-ready-count", publicadas);
    texto("dashboard-pending-count", 0);

    // A versão exibida é a versão de publicação/painel, não a versão do schema.
    // schemaVersion descreve apenas o formato técnico do JSON e pode permanecer 1.0.0/3.0.0.
    const versao = docRadios.datasetVersion
      ?? docRadios.catalogo?.versaoPainel
      ?? docVersao.datasetVersion
      ?? docVersao.version
      ?? CONFIG.VERSION;
    const atualizadoEm = docRadios.generatedAt
      ?? docRadios.catalogo?.geradoEm
      ?? docRadios.geradoEm
      ?? docVersao.generatedAt
      ?? docVersao.updatedAt;

    texto("dataset-version", versao);
    texto("dashboard-data-source", `Fonte: ${CONFIG.DADOS_REPO}/radios.json`);
    texto("last-update", `Última atualização: ${formatarData(atualizadoEm)}`);

    renderizarMetricas("dashboard-status-list", [
      ["Publicadas", publicadas, "registration-publicada"],
      ["Em análise", emAnalise, "registration-em_analise"],
      ["Suspensas ou rejeitadas", bloqueadas, "registration-rejeitada"]
    ], Math.max(total, 1));
    renderizarMetricas("dashboard-seal-list", [
      ["Verificado", verificadas, "seal-verificado"],
      ["Não verificado", Math.max(total - verificadas, 0), "seal-nao_solicitado"]
    ], Math.max(total, 1));
    renderizarRanking("dashboard-states-list", estados);
    renderizarRanking("dashboard-categories-list", categorias);
    renderizarSaudeStreams(streams, streamsHttps);

    const pending = document.getElementById("dashboard-pending-summary");
    if (pending) pending.innerHTML = '<span class="all-ready">✓ Catálogo oficial sem pendências</span>';

    estadoDashboard("success", "Banco de dados conectado");
  } catch (erro) {
    console.error(erro);
    estadoDashboard("error", "Falha na conexão");
    texto("error-message", `${erro.message}. Verifique se o repositório de dados está público e se a branch configurada está correta.`);
    document.getElementById("error-panel")?.classList.remove("hidden");
  } finally {
    dashboardCarregando = false;
    if (refresh) {
      refresh.disabled = false;
      refresh.textContent = "↻ Atualizar dados";
    }
  }
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
