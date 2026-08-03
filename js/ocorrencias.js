const OcorrenciasAdmin = (() => {
  const estado = {
    ocorrencias: [],
    contadores: {},
    status: "",
    tipo: "",
    prioridade: "",
    busca: "",
    selecionada: null,
    carregando: false,
    ultimoFoco: null
  };

  const tipos = {
    radio_fora_do_ar: "Rádio fora do ar",
    dados_incorretos: "Dados incorretos",
    conteudo_inadequado: "Conteúdo inadequado",
    problema_no_portal: "Problema no Portal",
    suporte_geral: "Suporte geral",
    seguranca_abuso: "Segurança ou abuso"
  };
  const statusRotulos = { nova: "Nova", em_analise: "Em análise", resolvida: "Resolvida", arquivada: "Arquivada" };
  const prioridades = { normal: "Normal", alta: "Alta", critica: "Crítica" };

  async function iniciar() {
    conectarEventos();
    await carregar();
  }

  function conectarEventos() {
    document.getElementById("ocorrencias-refresh-button")?.addEventListener("click", carregar);
    document.getElementById("ocorrencias-search")?.addEventListener("input", debounce(evento => { estado.busca = evento.target.value.trim(); carregar(); }, 350));
    document.getElementById("ocorrencias-status-filter")?.addEventListener("change", evento => { estado.status = evento.target.value; carregar(); });
    document.getElementById("ocorrencias-type-filter")?.addEventListener("change", evento => { estado.tipo = evento.target.value; carregar(); });
    document.getElementById("ocorrencias-priority-filter")?.addEventListener("change", evento => { estado.prioridade = evento.target.value; carregar(); });
    document.getElementById("close-ocorrencias-modal")?.addEventListener("click", fecharModal);
    document.getElementById("ocorrencias-modal-cancel")?.addEventListener("click", fecharModal);
    document.getElementById("ocorrencias-modal-backdrop")?.addEventListener("click", evento => { if (evento.target.id === "ocorrencias-modal-backdrop") fecharModal(); });
    document.getElementById("ocorrencias-form-admin")?.addEventListener("submit", salvar);
    document.getElementById("ocorrencias-copy-protocol")?.addEventListener("click", copiarProtocolo);
    document.addEventListener("keydown", evento => {
      if (evento.key === "Escape" && !document.getElementById("ocorrencias-modal-backdrop")?.classList.contains("hidden")) fecharModal();
    });
  }

  async function carregar() {
    if (estado.carregando) return;
    if (!API.chaveAdmin()) {
      const entrou = await SolicitacoesAdmin.informarChave();
      if (!entrou) { indicarStatus("error", "Entre no Painel para acessar as ocorrências"); return; }
    }
    estado.carregando = true;
    indicarStatus("loading", "Carregando ocorrências");
    const corpo = document.getElementById("ocorrencias-table-body");
    if (corpo) corpo.innerHTML = '<tr><td colspan="8" class="ocorrencias-empty">Carregando ocorrências…</td></tr>';
    try {
      const resposta = await API.listarOcorrencias({ status: estado.status, tipo: estado.tipo, prioridade: estado.prioridade, busca: estado.busca, limit: 500 });
      estado.ocorrencias = Array.isArray(resposta?.ocorrencias) ? resposta.ocorrencias : [];
      estado.contadores = resposta?.contadores || {};
      renderizarContadores();
      renderizarTabela();
      indicarStatus("success", `${estado.ocorrencias.length} ocorrência${estado.ocorrencias.length === 1 ? "" : "s"} exibida${estado.ocorrencias.length === 1 ? "" : "s"}`);
    } catch (erro) {
      if (erro.status === 401) API.definirChaveAdmin("");
      indicarStatus("error", erro.message || "Falha ao carregar ocorrências");
      if (corpo) corpo.innerHTML = `<tr><td colspan="8" class="ocorrencias-empty"><strong>Não foi possível carregar.</strong><br>${escaparHtml(erro.message || "Erro desconhecido")}</td></tr>`;
    } finally { estado.carregando = false; }
  }

  function renderizarContadores() {
    texto("ocorrencias-total-count", estado.contadores.total || 0);
    texto("ocorrencias-new-count", estado.contadores.novas || 0);
    texto("ocorrencias-analysis-count", estado.contadores.emAnalise || 0);
    texto("ocorrencias-resolved-count", estado.contadores.resolvidas || 0);
    texto("ocorrencias-priority-count", estado.contadores.prioritarias || 0);
    texto("ocorrencias-visible-count", estado.ocorrencias.length);
  }

  function renderizarTabela() {
    const corpo = document.getElementById("ocorrencias-table-body");
    if (!corpo) return;
    if (!estado.ocorrencias.length) {
      corpo.innerHTML = '<tr><td colspan="8" class="ocorrencias-empty"><strong>Nenhuma ocorrência encontrada.</strong><br>Ajuste os filtros ou aguarde novos relatos.</td></tr>';
      return;
    }
    corpo.innerHTML = estado.ocorrencias.map(item => `
      <tr>
        <td><span class="ocorrencias-protocolo">${escaparHtml(item.protocolo)}</span></td>
        <td><span class="ocorrencias-tipo">${escaparHtml(tipos[item.tipo] || item.tipo)}</span></td>
        <td class="ocorrencias-radio"><strong>${escaparHtml(item.radio_nome || "Portal / geral")}</strong><small>${escaparHtml([item.radio_cidade, item.radio_estado].filter(Boolean).join(" — ") || "Sem emissora vinculada")}</small></td>
        <td class="ocorrencias-contato"><strong>${escaparHtml(item.nome_contato || "Não informado")}</strong><small>${escaparHtml(item.email_contato || "Sem e-mail")}</small></td>
        <td><span class="ocorrencias-prioridade ${escaparHtml(item.prioridade)}">${escaparHtml(prioridades[item.prioridade] || item.prioridade)}</span></td>
        <td><span class="ocorrencias-status ${escaparHtml(item.status)}">${escaparHtml(statusRotulos[item.status] || item.status)}</span></td>
        <td>${formatarData(item.criado_em)}</td>
        <td><button type="button" class="ocorrencias-row-action" data-ocorrencia-id="${escaparHtml(item.id)}">Abrir</button></td>
      </tr>`).join("");
    corpo.querySelectorAll("[data-ocorrencia-id]").forEach(botao => botao.addEventListener("click", () => abrirModal(botao.dataset.ocorrenciaId, botao)));
  }

  async function abrirModal(id, origem) {
    estado.ultimoFoco = origem || document.activeElement;
    try {
      const resposta = await API.detalharOcorrencia(id);
      const item = resposta?.ocorrencia;
      if (!item) throw new Error("Ocorrência não encontrada.");
      estado.selecionada = item;
      texto("ocorrencias-modal-protocol", item.protocolo || "—");
      texto("ocorrencias-modal-title", tipos[item.tipo] || item.tipo || "Ocorrência");
      texto("ocorrencias-detail-radio", item.radio_nome || "Portal / ocorrência geral");
      texto("ocorrencias-detail-location", [item.radio_cidade, item.radio_estado].filter(Boolean).join(" — ") || "Não se aplica");
      texto("ocorrencias-detail-contact", item.nome_contato || "Não informado");
      texto("ocorrencias-detail-email", item.email_contato || "Não informado");
      texto("ocorrencias-detail-date", formatarData(item.criado_em));
      texto("ocorrencias-detail-page", item.pagina_url || "Não informada");
      texto("ocorrencias-detail-message", item.mensagem || "Sem descrição");
      document.getElementById("ocorrencias-admin-status").value = item.status || "nova";
      document.getElementById("ocorrencias-admin-priority").value = item.prioridade || "normal";
      document.getElementById("ocorrencias-admin-notes").value = item.observacoes_admin || "";
      document.getElementById("ocorrencias-admin-resolution").value = item.resolucao || "";

      const email = document.getElementById("ocorrencias-email-link");
      if (email) {
        email.href = item.email_contato ? `mailto:${item.email_contato}?subject=${encodeURIComponent(`Central Rádios Brasil — ${item.protocolo}`)}` : "#";
        email.classList.toggle("hidden", !item.email_contato);
      }
      const radioLink = document.getElementById("ocorrencias-radio-link");
      if (radioLink) {
        radioLink.href = item.radio_id ? `https://centralradiosbrasil.com.br/?radio=${encodeURIComponent(item.radio_id)}` : "#";
        radioLink.classList.toggle("hidden", !item.radio_id);
      }
      renderizarHistorico(resposta?.historico || []);
      document.getElementById("ocorrencias-modal-backdrop")?.classList.remove("hidden");
      document.body.classList.add("modal-open");
      document.getElementById("close-ocorrencias-modal")?.focus();
    } catch (erro) { alert(erro.message || "Não foi possível abrir a ocorrência."); }
  }

  function renderizarHistorico(historico) {
    const lista = document.getElementById("ocorrencias-history-list");
    if (!lista) return;
    lista.innerHTML = historico.length ? historico.map(item => `
      <div class="ocorrencias-historico-item">
        <strong>${escaparHtml(item.acao || "Atualização")}</strong>
        <div>${escaparHtml(item.status_anterior || "—")} → ${escaparHtml(item.status_novo || "—")}</div>
        ${item.observacao ? `<p>${escaparHtml(item.observacao)}</p>` : ""}
        <small>${formatarData(item.criado_em)}</small>
      </div>`).join("") : '<p>Nenhum histórico disponível.</p>';
  }

  function fecharModal() {
    document.getElementById("ocorrencias-modal-backdrop")?.classList.add("hidden");
    document.body.classList.remove("modal-open");
    estado.selecionada = null;
    estado.ultimoFoco?.focus?.();
    estado.ultimoFoco = null;
  }

  async function salvar(evento) {
    evento.preventDefault();
    if (!estado.selecionada) return;
    const botao = document.getElementById("ocorrencias-modal-save");
    botao.disabled = true; botao.textContent = "Salvando…";
    try {
      const resposta = await API.atualizarOcorrencia(estado.selecionada.id, {
        status: document.getElementById("ocorrencias-admin-status").value,
        prioridade: document.getElementById("ocorrencias-admin-priority").value,
        observacoesAdmin: document.getElementById("ocorrencias-admin-notes").value.trim(),
        resolucao: document.getElementById("ocorrencias-admin-resolution").value.trim()
      });
      if (resposta?.ocorrencia) estado.selecionada = resposta.ocorrencia;
      fecharModal();
      await carregar();
      alert("Ocorrência atualizada com sucesso.");
    } catch (erro) { alert(erro.message || "Não foi possível atualizar a ocorrência."); }
    finally { botao.disabled = false; botao.textContent = "Salvar atualização"; }
  }

  async function copiarProtocolo() {
    const protocolo = estado.selecionada?.protocolo;
    if (!protocolo) return;
    try { await navigator.clipboard.writeText(protocolo); alert("Protocolo copiado."); }
    catch { alert(`Protocolo: ${protocolo}`); }
  }

  function indicarStatus(tipo, mensagem) { const badge = document.getElementById("ocorrencias-status-badge"); if (badge) { badge.className = `status-badge ${tipo}`; badge.textContent = mensagem; } }
  function debounce(funcao, espera) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => funcao(...args), espera); }; }
  return { iniciar, carregar };
})();
