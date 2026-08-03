const ComercialAdmin = (() => {
  const estado = {
    resumo: null,
    clientes: [], planos: [], contratos: [], faturas: [], modelos: [], sites: [], revendas: [],
    aba: "visao-geral", modalTipo: null, modalId: null, carregando: false
  };

  const statusRotulos = {
    prospect:"Prospect", ativo:"Ativo", suspenso:"Suspenso", cancelado:"Cancelado",
    planejamento:"Planejamento", inativo:"Inativo", descontinuado:"Descontinuado",
    rascunho:"Rascunho", proposta_enviada:"Proposta enviada", aguardando_pagamento:"Aguardando pagamento",
    em_atraso:"Em atraso", configurando:"Configurando", nao_incluido:"Não incluído", publicado:"Publicado",
    sem_rascunho:"Sem rascunho", aguardando_publicacao:"Aguardando publicação",
    aberta:"Aberta", parcial:"Parcial", paga:"Paga", vencida:"Vencida", cancelada:"Cancelada", estornada:"Estornada",
    mensalidade:"Mensalidade", implantacao:"Implantação", servico_adicional:"Serviço adicional", ajuste:"Ajuste", outro:"Outro",
    desenvolvimento:"Em desenvolvimento", disponivel:"Disponível", ativa:"Ativa", suspensa:"Suspensa", confirmado:"Confirmado"
  };
  const periodicidades = { mensal:"Mensal", trimestral:"Trimestral", semestral:"Semestral", anual:"Anual" };
  const camposSite = {
    nome:"Nome", slogan:"Slogan", logo:"Logomarca", cores:"Cores", capa:"Imagem de capa", descricao:"Descrição",
    contatos:"Contatos", whatsapp:"WhatsApp", redes_sociais:"Redes sociais", programacao:"Programação",
    locutores:"Locutores", noticias:"Notícias", banners:"Banners", patrocinadores:"Patrocinadores",
    links_aplicativos:"Links de aplicativos", textos_institucionais:"Textos institucionais"
  };

  async function iniciar() {
    conectarEventos();
    await carregarTudo();
  }

  function conectarEventos() {
    document.getElementById("comercial-refresh-button")?.addEventListener("click", carregarTudo);
    document.getElementById("comercial-seed-model-button")?.addEventListener("click", instalarModeloRadioEssencial);
    document.querySelectorAll("[data-comercial-tab]").forEach(botao => botao.addEventListener("click", () => trocarAba(botao.dataset.comercialTab)));
    document.addEventListener("click", tratarClique);
    document.getElementById("comercial-modal-backdrop")?.addEventListener("click", e => { if (e.target.id === "comercial-modal-backdrop") fecharModal(); });
    document.getElementById("close-comercial-modal")?.addEventListener("click", fecharModal);
    document.getElementById("comercial-modal-cancel")?.addEventListener("click", fecharModal);
    document.getElementById("comercial-modal-form")?.addEventListener("submit", salvarModal);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !document.getElementById("comercial-modal-backdrop")?.classList.contains("hidden")) fecharModal();
    });
  }

  async function tratarClique(evento) {
    const novo = evento.target.closest("[data-comercial-new]");
    if (novo) return abrirFormulario(novo.dataset.comercialNew);
    const acao = evento.target.closest("[data-comercial-action]");
    if (!acao) return;
    const tipo = acao.dataset.comercialAction;
    const id = acao.dataset.id;
    if (tipo.endsWith("-edit")) return abrirFormulario(tipo.replace("-edit", ""), id);
    if (tipo === "client-access") return criarOuRedefinirAcessoCliente(id);
    if (tipo === "site-content") return abrirConteudoSite(id);
    if (tipo === "site-publish") return publicarSite(id);
    if (tipo === "contract-invoice") return gerarFaturaContrato(id);
    if (tipo === "invoice-pay") return abrirFormulario("pagamento", id);
    if (tipo === "invoice-detail") return abrirDetalheFatura(id);
    if (tipo === "payment-refund") return estornarPagamento(id, acao.dataset.invoiceId);
  }

  async function carregarTudo() {
    if (estado.carregando) return;
    if (!API.chaveAdmin()) {
      const entrou = await SolicitacoesAdmin.informarChave();
      if (!entrou) { indicarStatus("error", "Entre no Painel para acessar a gestão comercial"); return; }
    }
    estado.carregando = true;
    indicarStatus("loading", "Carregando gestão comercial");
    try {
      const [resumo, clientes, planos, contratos, faturas, modelos, sites, revendas] = await Promise.all([
        API.resumoComercial(), API.listarClientesComerciais(), API.listarPlanosComerciais(),
        API.listarContratosComerciais(), API.listarFaturasComerciais(), API.listarModelosSiteComerciais(),
        API.listarSitesComerciais(), API.listarRevendasComerciais()
      ]);
      estado.resumo = resumo;
      estado.clientes = clientes.clientes || [];
      estado.planos = planos.planos || [];
      estado.contratos = contratos.contratos || [];
      estado.faturas = faturas.faturas || [];
      estado.modelos = modelos.modelos || [];
      estado.sites = sites.sites || [];
      estado.revendas = revendas.revendas || [];
      renderizar();
      indicarStatus("success", "Gestão comercial sincronizada");
    } catch (erro) {
      if (erro.status === 401) API.definirChaveAdmin("");
      indicarStatus("error", erro.message || "Falha ao carregar a gestão comercial");
    } finally { estado.carregando = false; }
  }

  function renderizar() {
    renderizarResumo(); renderizarClientes(); renderizarPlanos(); renderizarContratos();
    renderizarFaturas(); renderizarModelos(); renderizarSites(); renderizarRevendas();
  }

  function renderizarResumo() {
    const r = estado.resumo || {};
    texto("comercial-kpi-clientes", r.clientes?.ativos || 0);
    texto("comercial-kpi-receita", moeda(r.contratos?.receitaMensalCentavos || 0));
    texto("comercial-kpi-vencidas", r.faturas?.vencidas || 0);
    texto("comercial-kpi-sites", r.sites?.publicados || 0);
    texto("comercial-kpi-capacidade", r.revenda?.disponiveis || 0);
    texto("comercial-kpi-modelos", r.modelos?.disponiveis || 0);
    texto("comercial-visible-count", r.clientes?.total || 0);

    const capacidade = document.getElementById("comercial-capacity-summary");
    if (capacidade) capacidade.innerHTML = `
      <div><span>Limite contratado</span><strong>${numero(r.revenda?.capacidade)}</strong></div>
      <div><span>Contas em uso</span><strong>${numero(r.revenda?.contasEmUso)}</strong></div>
      <div><span>Disponíveis</span><strong>${numero(r.revenda?.disponiveis)}</strong></div>`;

    const filas = document.getElementById("comercial-pipeline-summary");
    if (filas) filas.innerHTML = [
      ["Prospects", r.clientes?.prospects], ["Contratos em negociação", r.contratos?.negociacao],
      ["Contratos em atenção", r.contratos?.atencao], ["Faturas próximas", r.faturas?.proximas],
      ["Sites em implantação", r.sites?.implantacao], ["Inadimplência", moeda(r.faturas?.inadimplenciaCentavos || 0)]
    ].map(([label,val]) => `<div class="comercial-summary-row"><span>${label}</span><strong>${val ?? 0}</strong></div>`).join("");

    const atividades = document.getElementById("comercial-activity-list");
    if (atividades) {
      const lista = r.atividades || [];
      atividades.innerHTML = lista.length ? lista.map(a => `<div class="comercial-activity-item"><div><strong>${escaparHtml(rotuloAcao(a.acao))}</strong><small>${escaparHtml(a.detalhe || a.entidade || "")}</small></div><time>${formatarData(a.criado_em)}</time></div>`).join("") : '<p class="comercial-empty">Nenhuma atividade comercial registrada.</p>';
    }
  }

  function renderizarClientes() {
    tabela("comercial-clientes-body", estado.clientes, 7, item => `<tr>
      <td><span class="comercial-code">${escaparHtml(item.codigo)}</span></td>
      <td><strong>${escaparHtml(item.nome)}</strong><small>${escaparHtml(item.nome_radio || "Rádio ainda não definida")}</small></td>
      <td><strong>${escaparHtml(item.email)}</strong><small>${escaparHtml(item.whatsapp || "Sem WhatsApp")}</small></td>
      <td>${escaparHtml([item.cidade,item.estado].filter(Boolean).join(" — ") || "—")}</td>
      <td><span class="comercial-badge ${item.status}">${rotuloStatus(item.status)}</span></td>
      <td>${numero(item.contratos_ativos)} contrato(s) • ${numero(item.sites)} site(s)</td>
      <td><div class="comercial-row-actions"><button data-comercial-action="client-edit" data-id="${item.id}">Abrir</button><button data-comercial-action="client-access" data-id="${item.id}">Acesso</button></div></td>
    </tr>`, "Nenhum cliente cadastrado.");
  }

  function renderizarPlanos() {
    tabela("comercial-planos-body", estado.planos, 7, item => `<tr>
      <td><span class="comercial-code">${escaparHtml(item.codigo)}</span></td>
      <td><strong>${escaparHtml(item.nome)}</strong><small>${escaparHtml(item.descricao || "Sem descrição")}</small></td>
      <td>${moeda(item.valor_centavos)} / ${periodicidades[item.periodicidade] || item.periodicidade}</td>
      <td>${numero(item.limite_ouvintes) || "—"} ouvintes • ${numero(item.bitrate_kbps) || "—"} kbps • ${item.autodj_gb || "—"} GB</td>
      <td>${item.site_incluido ? "Site" : "Sem site"}${item.pwa_incluido ? " • PWA" : ""}${item.alexa_incluida ? " • Alexa" : ""}</td>
      <td><span class="comercial-badge ${item.status}">${rotuloStatus(item.status)}</span></td>
      <td><div class="comercial-row-actions"><button data-comercial-action="plan-edit" data-id="${item.id}">Editar</button></div></td>
    </tr>`, "Nenhum plano cadastrado. Defina os produtos antes de contratar clientes.");
  }

  function renderizarContratos() {
    tabela("comercial-contratos-body", estado.contratos, 8, item => `<tr>
      <td><span class="comercial-code">${escaparHtml(item.numero)}</span></td>
      <td><strong>${escaparHtml(item.cliente_nome)}</strong><small>${escaparHtml(item.nome_radio || "")}</small></td>
      <td>${escaparHtml(item.plano_nome || "Plano personalizado")}</td>
      <td>${moeda(item.valor_centavos)} / ${periodicidades[item.periodicidade] || item.periodicidade}</td>
      <td>Dia ${item.dia_vencimento}</td>
      <td><span class="comercial-badge ${item.status}">${rotuloStatus(item.status)}</span><small>Streaming: ${rotuloStatus(item.streaming_status)} • Site: ${rotuloStatus(item.site_status)}</small></td>
      <td>${numero(item.faturas_vencidas)} vencida(s)</td>
      <td><div class="comercial-row-actions"><button data-comercial-action="contract-edit" data-id="${item.id}">Editar</button><button data-comercial-action="contract-invoice" data-id="${item.id}">Gerar fatura</button></div></td>
    </tr>`, "Nenhum contrato cadastrado.");
  }

  function renderizarFaturas() {
    tabela("comercial-faturas-body", estado.faturas, 8, item => `<tr>
      <td><span class="comercial-code">${escaparHtml(item.numero)}</span><small>${escaparHtml(item.competencia)} • ${escaparHtml(rotuloStatus(item.tipo_cobranca || "mensalidade"))}</small></td>
      <td><strong>${escaparHtml(item.cliente_nome)}</strong><small>${escaparHtml(item.nome_radio || "")}</small></td>
      <td>${formatarDataCurta(item.vencimento)}</td>
      <td>${moeda(item.valor_total_centavos)}</td>
      <td>${moeda(item.valor_pago_centavos)}</td>
      <td><span class="comercial-badge ${item.status}">${rotuloStatus(item.status)}</span></td>
      <td>${escaparHtml(item.forma_prevista || "—")}</td>
      <td><div class="comercial-row-actions"><button data-comercial-action="invoice-detail" data-id="${item.id}">Abrir</button>${!['paga','cancelada','estornada'].includes(item.status) ? `<button data-comercial-action="invoice-pay" data-id="${item.id}">Dar baixa</button>` : ""}</div></td>
    </tr>`, "Nenhuma fatura gerada.");
  }

  function renderizarModelos() {
    tabela("comercial-modelos-body", estado.modelos, 6, item => `<tr>
      <td><span class="comercial-code">${escaparHtml(item.codigo)}</span></td>
      <td><strong>${escaparHtml(item.nome)}</strong><small>${escaparHtml(item.categoria || "Sem categoria")}</small></td>
      <td>${escaparHtml(item.descricao || "Modelo ainda sem descrição")}</td>
      <td>${(item.recursosEditaveis || []).map(c => escaparHtml(camposSite[c] || c)).join(", ") || "Campos ainda não definidos"}</td>
      <td><span class="comercial-badge ${item.status}">${rotuloStatus(item.status)}</span><small>${numero(item.sites)} site(s)</small></td>
      <td><div class="comercial-row-actions"><button data-comercial-action="model-edit" data-id="${item.id}">Editar</button></div></td>
    </tr>`, "Nenhum modelo cadastrado. Os modelos podem ser registrados como planejamento antes do desenvolvimento.");
  }

  function renderizarSites() {
    tabela("comercial-sites-body", estado.sites, 7, item => `<tr>
      <td><span class="comercial-code">${escaparHtml(item.codigo)}</span></td>
      <td><strong>${escaparHtml(item.cliente_nome)}</strong><small>${escaparHtml(item.nome_radio || "")}</small></td>
      <td><strong>${escaparHtml(item.nome_site)}</strong><small>${escaparHtml(item.modelo_nome || "Modelo ainda não escolhido")}</small></td>
      <td>${escaparHtml(item.dominio_personalizado || item.subdominio || "Domínio não configurado")}</td>
      <td>${numero((item.camposPermitidos || []).length)} campos<small>Publicação: ${rotuloStatus(item.status_publicacao || "sem_rascunho")}</small></td>
      <td><span class="comercial-badge ${item.status}">${rotuloStatus(item.status)}</span></td>
      <td><div class="comercial-row-actions"><button data-comercial-action="site-edit" data-id="${item.id}">Editar</button><button data-comercial-action="site-content" data-id="${item.id}">Conteúdo</button><button data-comercial-action="site-publish" data-id="${item.id}" ${item.status_publicacao === "publicado" ? "disabled" : ""}>Publicar</button></div></td>
    </tr>`, "Nenhum site de cliente preparado.");
  }

  function renderizarRevendas() {
    tabela("comercial-revendas-body", estado.revendas, 7, item => `<tr>
      <td><span class="comercial-code">${escaparHtml(item.codigo)}</span></td>
      <td><strong>${escaparHtml(item.fornecedor)}</strong><small>${escaparHtml(item.nome_plano || "Plano não informado")}</small></td>
      <td>${numero(item.limite_contas)} contas</td>
      <td>${moeda(item.custo_mensal_centavos)}</td>
      <td>${item.dia_vencimento ? `Dia ${item.dia_vencimento}` : "—"}</td>
      <td><span class="comercial-badge ${item.status}">${rotuloStatus(item.status)}</span></td>
      <td><div class="comercial-row-actions">${item.painel_url ? `<a class="comercial-mini-button" href="${escaparHtml(item.painel_url)}" target="_blank" rel="noopener">Abrir painel</a>` : ""}<button data-comercial-action="revenda-edit" data-id="${item.id}">Editar</button></div></td>
    </tr>`, "Nenhuma infraestrutura de revenda cadastrada.");
  }

  function tabela(id, itens, colunas, render, vazio) {
    const corpo = document.getElementById(id); if (!corpo) return;
    corpo.innerHTML = itens.length ? itens.map(render).join("") : `<tr><td colspan="${colunas}" class="comercial-empty">${escaparHtml(vazio)}</td></tr>`;
  }

  function trocarAba(aba) {
    estado.aba = aba;
    document.querySelectorAll("[data-comercial-tab]").forEach(b => b.classList.toggle("active", b.dataset.comercialTab === aba));
    document.querySelectorAll("[data-comercial-panel]").forEach(p => p.classList.toggle("hidden", p.dataset.comercialPanel !== aba));
  }

  function abrirFormulario(tipo, id = null) {
    estado.modalTipo = tipo; estado.modalId = id;
    // Em novos registros não existe item ainda. Usar um objeto vazio evita
    // erros ao montar os formulários (ex.: tentar ler fornecedor de null).
    const item = id ? (localizar(tipo, id) || {}) : {};
    texto("comercial-modal-title", tituloModal(tipo, Boolean(id)));
    texto("comercial-modal-subtitle", subtituloModal(tipo));
    const form = document.getElementById("comercial-modal-form-fields");
    if (!form) return;
    form.innerHTML = formularioHtml(tipo, item);
    const salvar = document.getElementById("comercial-modal-save");
    const cancelar = document.getElementById("comercial-modal-cancel");
    if (salvar) { salvar.hidden = false; salvar.textContent = "Salvar"; }
    if (cancelar) cancelar.textContent = "Cancelar";
    document.getElementById("comercial-modal-backdrop")?.classList.remove("hidden");
    document.body.classList.add("modal-open");
    document.getElementById("close-comercial-modal")?.focus();
  }

  function fecharModal() {
    document.getElementById("comercial-modal-backdrop")?.classList.add("hidden");
    document.body.classList.remove("modal-open");
    estado.modalTipo = null; estado.modalId = null;
    const salvar = document.getElementById("comercial-modal-save");
    const cancelar = document.getElementById("comercial-modal-cancel");
    if (salvar) { salvar.hidden = false; salvar.textContent = "Salvar"; }
    if (cancelar) cancelar.textContent = "Cancelar";
  }

  function localizar(tipo, id) {
    const mapa = { client:estado.clientes, plan:estado.planos, contract:estado.contratos, invoice:estado.faturas, model:estado.modelos, site:estado.sites, revenda:estado.revendas };
    return (mapa[tipo] || []).find(x => String(x.id) === String(id)) || null;
  }

  function tituloModal(tipo, editando) {
    const nomes = { client:"cliente", plan:"plano", contract:"contrato", invoice:"fatura", pagamento:"pagamento", model:"modelo de site", site:"site do cliente", revenda:"infraestrutura de revenda" };
    if (editando) return `Editar ${nomes[tipo] || "registro"}`;
    const femininos = new Set(["invoice", "revenda"]);
    return `${femininos.has(tipo) ? "Nova" : "Novo"} ${nomes[tipo] || "registro"}`;
  }
  function subtituloModal(tipo) {
    const textos = {
      client:"Dados comerciais e de contato do contratante.", plan:"Produto da Central, sem inventar preço ou recurso ainda não definido.",
      contract:"Vincule cliente, plano, vencimento, streaming e site.", invoice:"Cobrança vinculada a um contrato.",
      pagamento:"Baixa manual de Pix, boleto, cartão ou transferência.", model:"Catálogo dos modelos que serão desenvolvidos no Commit 22.18.",
      site:"Instância do futuro site editável, seus domínios e permissões.", revenda:"Capacidade e custo da infraestrutura fornecedora."
    }; return textos[tipo] || "";
  }

  function formularioHtml(tipo, i = {}) {
    if (tipo === "client") return `
      <div class="comercial-form-grid"><label>Nome completo / responsável<input name="nome" required value="${v(i.nome)}"></label><label>Nome da rádio<input name="nomeRadio" value="${v(i.nome_radio)}"></label>
      <label>E-mail<input name="email" type="email" required value="${v(i.email)}"></label><label>WhatsApp<input name="whatsapp" value="${v(i.whatsapp)}"></label>
      <label>CPF ou CNPJ<input name="cpfCnpj" value="${v(i.cpf_cnpj)}"></label><label>Status<select name="status">${opcoes(["prospect","ativo","suspenso","cancelado"], i.status || "prospect")}</select></label>
      <label>Cidade<input name="cidade" value="${v(i.cidade)}"></label><label>UF<input name="estado" maxlength="2" value="${v(i.estado)}"></label>
      <label class="full">Observações<textarea name="observacoes">${v(i.observacoes)}</textarea></label></div>`;
    if (tipo === "plan") return `
      <div class="comercial-form-grid"><label>Nome do plano<input name="nome" required value="${v(i.nome)}"></label><label>Código interno<input name="codigo" value="${v(i.codigo)}" placeholder="Gerado automaticamente"></label>
      <label>Status<select name="status">${opcoes(["planejamento","ativo","inativo","descontinuado"],i.status||"planejamento")}</select></label><label>Periodicidade<select name="periodicidade">${opcoes(Object.keys(periodicidades),i.periodicidade||"mensal",periodicidades)}</select></label>
      <label>Valor do período (R$)<input name="valor" inputmode="decimal" value="${reais(i.valor_centavos)}"></label><label>Taxa de implantação (R$)<input name="taxaImplantacao" inputmode="decimal" value="${reais(i.taxa_implantacao_centavos)}"></label>
      <label>Ouvintes simultâneos<input name="limiteOuvintes" type="number" min="0" value="${v(i.limite_ouvintes)}"></label><label>Bitrate (kbps)<input name="bitrateKbps" type="number" min="0" value="${v(i.bitrate_kbps)}"></label>
      <label>AutoDJ (GB)<input name="autodjGb" type="number" min="0" step="0.1" value="${v(i.autodj_gb)}"></label><label>Outros recursos<input name="recursos" value="${v((i.recursos||[]).join(", "))}" placeholder="Player, suporte, SSL..."></label>
      <div class="full comercial-checks"><label><input type="checkbox" name="siteIncluido" ${i.site_incluido?"checked":""}> Site editável</label><label><input type="checkbox" name="pwaIncluido" ${i.pwa_incluido?"checked":""}> Aplicativo PWA</label><label><input type="checkbox" name="alexaIncluida" ${i.alexa_incluida?"checked":""}> Alexa</label></div>
      <label class="full">Descrição<textarea name="descricao">${v(i.descricao)}</textarea></label></div>`;
    if (tipo === "contract") return `
      <div class="comercial-form-grid"><label>Cliente<select name="clienteId" required>${selectEntidades(estado.clientes,i.cliente_id,x=>`${x.nome}${x.nome_radio?` — ${x.nome_radio}`:""}`)}</select></label><label>Plano<select name="planoId"><option value="">Plano personalizado</option>${selectEntidades(estado.planos,i.plano_id,x=>x.nome,false)}</select></label>
      <label>Status<select name="status">${opcoes(["rascunho","proposta_enviada","aguardando_pagamento","ativo","em_atraso","suspenso","cancelado"],i.status||"rascunho")}</select></label><label>Periodicidade<select name="periodicidade">${opcoes(Object.keys(periodicidades),i.periodicidade||"mensal",periodicidades)}</select></label>
      <label>Valor do período (R$)<input name="valor" inputmode="decimal" value="${reais(i.valor_centavos)}"></label><label>Taxa de implantação (R$)<input name="taxaImplantacao" inputmode="decimal" value="${reais(i.taxa_implantacao_centavos)}"></label>
      <label>Início<input name="dataInicio" type="date" value="${v(i.data_inicio)}"></label><label>Dia de vencimento<input name="diaVencimento" type="number" min="1" max="28" value="${v(i.dia_vencimento||10)}"></label>
      <label>Status do streaming<select name="streamingStatus">${opcoes(["planejamento","configurando","ativo","suspenso","cancelado"],i.streaming_status||"planejamento")}</select></label><label>Status do site<select name="siteStatus">${opcoes(["nao_incluido","planejamento","configurando","rascunho","publicado","suspenso","cancelado"],i.site_status||"nao_incluido")}</select></label>
      <div class="full comercial-checks"><label><input type="checkbox" name="renovacaoAutomatica" ${i.renovacao_automatica!==0?"checked":""}> Renovação automática</label>${!i.id?'<label><input type="checkbox" name="gerarPrimeiraFatura"> Gerar primeira fatura</label>':""}</div>
      <label class="full">Observações<textarea name="observacoes">${v(i.observacoes)}</textarea></label></div>`;
    if (tipo === "invoice") return `<div class="comercial-form-grid"><label>Contrato<select name="contratoId" required ${i.id?"disabled":""}>${selectEntidades(estado.contratos,i.contrato_id,x=>`${x.numero} — ${x.cliente_nome}`)}</select></label><label>Competência<input name="competencia" type="month" value="${v(i.competencia)}" ${i.id?"disabled":""}></label><label>Tipo de cobrança<select name="tipoCobranca">${opcoes(["mensalidade","implantacao","servico_adicional","ajuste","outro"],i.tipo_cobranca||"mensalidade")}</select></label><label>Vencimento<input name="vencimento" type="date" value="${v(i.vencimento)}"></label><label>Valor (R$)<input name="valor" inputmode="decimal" value="${reais(i.valor_total_centavos)}"></label><label>Status<select name="status">${opcoes(["aberta","parcial","paga","vencida","cancelada","estornada"],i.status||"aberta")}</select></label><label>Forma prevista<input name="formaPrevista" value="${v(i.forma_prevista)}"></label><label class="full">Descrição do serviço<textarea name="descricao" placeholder="Ex.: Mensalidade do streaming, criação de arte, manutenção do site...">${v(i.descricao)}</textarea></label><p class="full comercial-modal-note">A duplicidade é verificada pelo contrato, competência e serviço. Vencimento e valor iguais são permitidos quando as cobranças representam serviços diferentes.</p></div>`;
    if (tipo === "pagamento") { const f=estado.faturas.find(x=>String(x.id)===String(estado.modalId))||{}; return `<p class="comercial-modal-note">Fatura ${escaparHtml(f.numero||"")} • saldo ${moeda(Math.max((f.valor_total_centavos||0)-(f.valor_pago_centavos||0),0))}</p><div class="comercial-form-grid"><label>Valor pago (R$)<input name="valor" required inputmode="decimal" value="${reais(Math.max((f.valor_total_centavos||0)-(f.valor_pago_centavos||0),0))}"></label><label>Forma<select name="forma">${opcoes(["pix","boleto","cartao","transferencia","dinheiro","outro"],"pix")}</select></label><label>Data<input name="pagoEm" type="datetime-local"></label><label>Referência / comprovante<input name="referencia"></label><label class="full">Observações<textarea name="observacoes"></textarea></label></div>`; }
    if (tipo === "model") return `<div class="comercial-form-grid"><label>Nome do modelo<input name="nome" required value="${v(i.nome)}"></label><label>Código interno<input name="codigo" value="${v(i.codigo)}"></label><label>Categoria<input name="categoria" value="${v(i.categoria)}" placeholder="Essencial, Notícias, Gospel..."></label><label>Status<select name="status">${opcoes(["planejamento","desenvolvimento","disponivel","descontinuado"],i.status||"planejamento")}</select></label><label class="full">URL de prévia<input name="previewUrl" type="url" value="${v(i.preview_url)}"></label><label class="full">Descrição<textarea name="descricao">${v(i.descricao)}</textarea></label><div class="full comercial-checks">${checkboxesCampos(i.recursosEditaveis||[])}</div></div>`;
    if (tipo === "site") return `<div class="comercial-form-grid"><label>Cliente<select name="clienteId" required>${selectEntidades(estado.clientes,i.cliente_id,x=>`${x.nome}${x.nome_radio?` — ${x.nome_radio}`:""}`)}</select></label><label>Contrato<select name="contratoId"><option value="">Sem contrato vinculado</option>${selectEntidades(estado.contratos,i.contrato_id,x=>`${x.numero} — ${x.cliente_nome}`,false)}</select></label><label>Modelo<select name="modeloId"><option value="">Modelo ainda não escolhido</option>${selectEntidades(estado.modelos,i.modelo_id,x=>`${x.nome} (${rotuloStatus(x.status)})`,false)}</select></label><label>Status<select name="status">${opcoes(["planejamento","configurando","rascunho","publicado","suspenso","cancelado"],i.status||"planejamento")}</select></label><label>Nome do site<input name="nomeSite" required value="${v(i.nome_site)}"></label><label>Slug<input name="slug" ${i.id?"disabled":""} value="${v(i.slug)}" placeholder="radio-cidade"></label><label>Subdomínio<input name="subdominio" value="${v(i.subdominio)}" placeholder="radio.centralradiosbrasil.com.br"></label><label>Domínio próprio<input name="dominioPersonalizado" value="${v(i.dominio_personalizado)}"></label><label class="full">URL técnica do stream<input name="streamUrl" type="url" value="${v(i.stream_url)}" placeholder="https://servidor:porta/stream"></label><div class="full comercial-checks">${checkboxesCampos(i.camposPermitidos||[])}</div><label class="full">Observações<textarea name="observacoes">${v(i.observacoes)}</textarea></label></div>`;
    if (tipo === "revenda") return `<div class="comercial-form-grid"><label>Fornecedor<input name="fornecedor" required value="${v(i.fornecedor)}" placeholder="SamHost"></label><label>Plano do fornecedor<input name="nomePlano" value="${v(i.nome_plano)}"></label><label>Limite de contas<input name="limiteContas" type="number" min="0" value="${v(i.limite_contas)}"></label><label>Custo mensal (R$)<input name="custoMensal" inputmode="decimal" value="${reais(i.custo_mensal_centavos)}"></label><label>Dia de vencimento<input name="diaVencimento" type="number" min="1" max="28" value="${v(i.dia_vencimento)}"></label><label>Status<select name="status">${opcoes(["planejamento","ativa","suspensa","cancelada"],i.status||"planejamento")}</select></label><label class="full">URL do painel<input name="painelUrl" type="url" value="${v(i.painel_url)}"></label><label class="full">Observações<textarea name="observacoes">${v(i.observacoes)}</textarea></label></div>`;
    return "";
  }

  async function salvarModal(evento) {
    evento.preventDefault();
    const form = evento.currentTarget, dados = new FormData(form), tipo = estado.modalTipo, id = estado.modalId;
    const botao = document.getElementById("comercial-modal-save"); botao.disabled = true; botao.textContent = "Salvando…";
    try {
      if (tipo === "client") await (id ? API.atualizarClienteComercial(id,payloadCliente(dados)) : API.criarClienteComercial(payloadCliente(dados)));
      if (tipo === "plan") await (id ? API.atualizarPlanoComercial(id,payloadPlano(dados)) : API.criarPlanoComercial(payloadPlano(dados)));
      if (tipo === "contract") await (id ? API.atualizarContratoComercial(id,payloadContrato(dados)) : API.criarContratoComercial(payloadContrato(dados)));
      if (tipo === "invoice") {
        const retorno = await (id ? API.atualizarFaturaComercial(id,payloadFatura(dados)) : API.criarFaturaComercial(payloadFatura(dados)));
        if (retorno?.duplicado) throw new Error(retorno.motivo || "Esta cobrança já existe para o contrato e competência informados.");
      }
      if (tipo === "pagamento") await API.registrarPagamentoComercial(id,payloadPagamento(dados));
      if (tipo === "model") await (id ? API.atualizarModeloSiteComercial(id,payloadModelo(dados)) : API.criarModeloSiteComercial(payloadModelo(dados)));
      if (tipo === "site") await (id ? API.atualizarSiteComercial(id,payloadSite(dados)) : API.criarSiteComercial(payloadSite(dados)));
      if (tipo === "revenda") await (id ? API.atualizarRevendaComercial(id,payloadRevenda(dados)) : API.criarRevendaComercial(payloadRevenda(dados)));
      fecharModal(); await carregarTudo();
    } catch (erro) { alert(erro.message || "Não foi possível salvar."); }
    finally { botao.disabled = false; botao.textContent = "Salvar"; }
  }

  async function gerarFaturaContrato(id) {
    if (!confirm("Gerar a próxima fatura deste contrato?")) return;
    try { const r=await API.gerarFaturaContratoComercial(id,{}); alert(r.duplicado?(r.motivo||"A mensalidade dessa competência já existe."):"Fatura gerada com sucesso."); await carregarTudo(); }
    catch(e){ alert(e.message||"Não foi possível gerar a fatura."); }
  }

  async function abrirDetalheFatura(id) {
    try {
      const r=await API.detalharFaturaComercial(id), f=r.fatura, pagamentos=r.pagamentos||[];
      estado.modalTipo="invoice"; estado.modalId=id;
      texto("comercial-modal-title",`Fatura ${f.numero}`); texto("comercial-modal-subtitle",`${f.cliente_nome} • ${rotuloStatus(f.status)}`);
      document.getElementById("comercial-modal-form-fields").innerHTML = formularioHtml("invoice",f) + `<section class="full"><h3>Pagamentos</h3><div class="comercial-payments">${pagamentos.length?pagamentos.map(p=>`<div class="comercial-payment-row"><div><strong>${moeda(p.valor_centavos)} • ${escaparHtml(p.forma)}</strong><small>${formatarData(p.pago_em)}${p.referencia?` • ${escaparHtml(p.referencia)}`:""}</small></div><span class="comercial-badge ${p.status}">${rotuloStatus(p.status)}</span>${p.status==='confirmado'?`<button type="button" class="comercial-mini-button" data-comercial-action="payment-refund" data-id="${p.id}" data-invoice-id="${id}">Estornar</button>`:""}</div>`).join(""):'<p class="comercial-empty">Nenhum pagamento registrado.</p>'}</div></section>`;
      document.getElementById("comercial-modal-backdrop")?.classList.remove("hidden"); document.body.classList.add("modal-open");
    } catch(e){ alert(e.message||"Não foi possível abrir a fatura."); }
  }

  async function estornarPagamento(id, invoiceId) {
    if (!confirm("Confirmar o estorno deste pagamento?")) return;
    try { await API.atualizarPagamentoComercial(id,{status:"estornado"}); await carregarTudo(); await abrirDetalheFatura(invoiceId); }
    catch(e){ alert(e.message||"Não foi possível estornar."); }
  }

  async function instalarModeloRadioEssencial() {
    if (!confirm("Instalar o primeiro modelo oficial Rádio Essencial?")) return;
    try {
      const retorno = await API.criarModeloRadioEssencial();
      alert(retorno.criado ? "Modelo Rádio Essencial instalado com sucesso." : "O modelo Rádio Essencial já estava instalado.");
      await carregarTudo(); trocarAba("sites");
    } catch (erro) { alert(erro.message || "Não foi possível instalar o modelo."); }
  }

  async function criarOuRedefinirAcessoCliente(id) {
    const cliente = localizar("client", id);
    if (!cliente) return;
    const acessoAtual = await API.obterAcessoClienteComercial(id).catch(() => null);
    const verbo = acessoAtual?.acesso ? "redefinir" : "criar";
    if (!confirm(`${verbo === "criar" ? "Criar" : "Redefinir"} o acesso ao Portal do Cliente para ${cliente.nome}?`)) return;
    try {
      const retorno = await API.gerenciarAcessoClienteComercial(id,{acao:"criar_redefinir",email:cliente.email});
      alert(`ACESSO DO CLIENTE\n\nPortal: ${retorno.portalUrl || CONFIG.CLIENT_PORTAL_URL}\nE-mail: ${retorno.email}\nSenha temporária: ${retorno.senhaTemporaria}\n\nCopie estes dados agora. A senha não será exibida novamente.`);
      await carregarTudo();
    } catch (erro) { alert(erro.message || "Não foi possível preparar o acesso."); }
  }

  async function abrirConteudoSite(id) {
    try {
      const retorno = await API.detalharConteudoSiteComercial(id);
      const site = retorno.site || {};
      const rascunho = site.conteudoRascunho || {};
      const publicado = site.conteudoPublicado || null;
      estado.modalTipo = "site-content"; estado.modalId = id;
      texto("comercial-modal-title", `Conteúdo — ${site.nome_site || "site"}`);
      texto("comercial-modal-subtitle", `${site.cliente_nome || "Cliente"} • ${rotuloStatus(site.status_publicacao || "sem_rascunho")}`);
      const campos = Object.entries(rascunho).map(([chave,valor]) => `<div class="comercial-content-item"><strong>${escaparHtml(camposSite[chave] || chave)}</strong><span>${escaparHtml(resumirConteudo(valor))}</span></div>`).join("");
      const versoes = (retorno.versoes || []).map(v => `<li>Versão ${v.numero} — ${rotuloStatus(v.status)} — ${formatarData(v.criado_em)}</li>`).join("");
      document.getElementById("comercial-modal-form-fields").innerHTML = `<section class="comercial-content-summary"><div class="comercial-modal-note"><strong>Rascunho:</strong> ${Object.keys(rascunho).length} campo(s) • <strong>Publicado:</strong> ${publicado ? "sim" : "não"}</div>${campos || '<p class="comercial-empty">Nenhum conteúdo salvo.</p>'}<h3>Histórico de versões</h3><ul class="comercial-version-list">${versoes || '<li>Nenhuma versão registrada.</li>'}</ul></section>`;
      const salvar = document.getElementById("comercial-modal-save");
      const cancelar = document.getElementById("comercial-modal-cancel");
      if (salvar) salvar.hidden = true;
      if (cancelar) cancelar.textContent = "Fechar";
      document.getElementById("comercial-modal-backdrop")?.classList.remove("hidden"); document.body.classList.add("modal-open");
    } catch (erro) { alert(erro.message || "Não foi possível abrir o conteúdo."); }
  }

  async function publicarSite(id) {
    const site = localizar("site", id);
    if (!site) return;
    if (!confirm(`Publicar agora o rascunho de ${site.nome_site}?`)) return;
    try { const retorno = await API.publicarSiteComercial(id); alert(retorno.mensagem || "Site publicado."); await carregarTudo(); trocarAba("sites"); }
    catch (erro) { alert(erro.message || "Não foi possível publicar o site."); }
  }

  function resumirConteudo(valor) {
    if (valor == null) return "—";
    if (typeof valor === "string") return valor.length > 120 ? `${valor.slice(0,120)}…` : valor;
    if (Array.isArray(valor)) return `${valor.length} item(ns)`;
    if (typeof valor === "object") return Object.values(valor).filter(Boolean).slice(0,4).join(" • ") || "Configurado";
    return String(valor);
  }

  function payloadCliente(d){ return {nome:d.get("nome"),nomeRadio:d.get("nomeRadio"),email:d.get("email"),whatsapp:d.get("whatsapp"),cpfCnpj:d.get("cpfCnpj"),cidade:d.get("cidade"),estado:d.get("estado"),status:d.get("status"),observacoes:d.get("observacoes")}; }
  function payloadPlano(d){ return {nome:d.get("nome"),codigo:d.get("codigo"),status:d.get("status"),periodicidade:d.get("periodicidade"),valorCentavos:centavos(d.get("valor")),taxaImplantacaoCentavos:centavos(d.get("taxaImplantacao")),limiteOuvintes:d.get("limiteOuvintes"),bitrateKbps:d.get("bitrateKbps"),autodjGb:d.get("autodjGb"),siteIncluido:d.has("siteIncluido"),pwaIncluido:d.has("pwaIncluido"),alexaIncluida:d.has("alexaIncluida"),recursos:String(d.get("recursos")||"").split(",").map(x=>x.trim()).filter(Boolean),descricao:d.get("descricao")}; }
  function payloadContrato(d){ return {clienteId:d.get("clienteId"),planoId:d.get("planoId"),status:d.get("status"),periodicidade:d.get("periodicidade"),valorCentavos:centavos(d.get("valor")),taxaImplantacaoCentavos:centavos(d.get("taxaImplantacao")),dataInicio:d.get("dataInicio"),diaVencimento:d.get("diaVencimento"),streamingStatus:d.get("streamingStatus"),siteStatus:d.get("siteStatus"),renovacaoAutomatica:d.has("renovacaoAutomatica"),gerarPrimeiraFatura:d.has("gerarPrimeiraFatura"),observacoes:d.get("observacoes")}; }
  function payloadFatura(d){ return {contratoId:d.get("contratoId"),competencia:d.get("competencia"),tipoCobranca:d.get("tipoCobranca"),vencimento:d.get("vencimento"),valorCentavos:centavos(d.get("valor")),status:d.get("status"),formaPrevista:d.get("formaPrevista"),descricao:d.get("descricao")}; }
  function payloadPagamento(d){ return {valorCentavos:centavos(d.get("valor")),forma:d.get("forma"),pagoEm:d.get("pagoEm"),referencia:d.get("referencia"),observacoes:d.get("observacoes")}; }
  function payloadModelo(d){ return {nome:d.get("nome"),codigo:d.get("codigo"),categoria:d.get("categoria"),status:d.get("status"),previewUrl:d.get("previewUrl"),descricao:d.get("descricao"),recursosEditaveis:d.getAll("camposSite")}; }
  function payloadSite(d){ return {clienteId:d.get("clienteId"),contratoId:d.get("contratoId"),modeloId:d.get("modeloId"),status:d.get("status"),nomeSite:d.get("nomeSite"),slug:d.get("slug"),subdominio:d.get("subdominio"),dominioPersonalizado:d.get("dominioPersonalizado"),streamUrl:d.get("streamUrl"),camposPermitidos:d.getAll("camposSite"),observacoes:d.get("observacoes")}; }
  function payloadRevenda(d){ return {fornecedor:d.get("fornecedor"),nomePlano:d.get("nomePlano"),limiteContas:d.get("limiteContas"),custoMensalCentavos:centavos(d.get("custoMensal")),diaVencimento:d.get("diaVencimento"),status:d.get("status"),painelUrl:d.get("painelUrl"),observacoes:d.get("observacoes")}; }

  async function converterInteresse(interesse) {
    try { const r=await API.criarClienteComercial({interesseId:interesse.id}); alert(r.duplicado?"Este interessado já possui cliente comercial.":"Interessado convertido em cliente comercial."); document.getElementById("streaming-modal-backdrop")?.classList.add("hidden"); document.body.classList.remove("modal-open"); window.location.hash="#/comercial"; await carregarTudo(); }
    catch(e){ alert(e.message||"Não foi possível converter o interessado."); }
  }

  function opcoes(valores,selecionado,rotulos={}){ return valores.map(x=>`<option value="${x}" ${String(x)===String(selecionado)?"selected":""}>${escaparHtml(rotulos[x]||rotuloStatus(x))}</option>`).join(""); }
  function selectEntidades(lista,selecionado,rotulo,required=true){ return `${required?'<option value="">Selecione</option>':""}${lista.map(x=>`<option value="${x.id}" ${String(x.id)===String(selecionado)?"selected":""}>${escaparHtml(rotulo(x))}</option>`).join("")}`; }
  function checkboxesCampos(selecionados){ const set=new Set(selecionados||[]); return Object.entries(camposSite).map(([id,label])=>`<label><input type="checkbox" name="camposSite" value="${id}" ${set.has(id)?"checked":""}> ${label}</label>`).join(""); }
  function v(x){ return escaparHtml(x??""); }
  function rotuloStatus(s){ return statusRotulos[s]||String(s||"—").replaceAll("_"," "); }
  function rotuloAcao(a){ return ({cliente_criado:"Cliente criado",cliente_atualizado:"Cliente atualizado",plano_criado:"Plano criado",plano_atualizado:"Plano atualizado",contrato_criado:"Contrato criado",contrato_atualizado:"Contrato atualizado",fatura_gerada:"Fatura gerada",fatura_atualizada:"Fatura atualizada",pagamento_registrado:"Pagamento registrado",pagamento_estornado:"Pagamento estornado",modelo_criado:"Modelo cadastrado",modelo_atualizado:"Modelo atualizado",site_criado:"Site de cliente criado",site_atualizado:"Site de cliente atualizado",acesso_cliente_criado:"Acesso do cliente criado",acesso_cliente_redefinido:"Acesso do cliente redefinido",acesso_cliente_desativado:"Acesso do cliente desativado",login_cliente:"Login do cliente",senha_cliente_alterada:"Senha do cliente alterada",rascunho_cliente_salvo:"Rascunho salvo pelo cliente",publicacao_solicitada:"Publicação solicitada",site_publicado:"Site publicado",revenda_criada:"Infraestrutura cadastrada",revenda_atualizada:"Infraestrutura atualizada"})[a]||String(a||"Atualização").replaceAll("_"," "); }
  function numero(n){ return Number(n||0); }
  function moeda(c){ return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(c||0)/100); }
  function reais(c){ return c==null||c===""?"":(Number(c)/100).toFixed(2).replace(".",","); }
  function centavos(v){ const texto=String(v||"0").trim(); const normalizado=texto.includes(",")?texto.replace(/\./g,"").replace(",","."):texto; const n=Number(normalizado); return Number.isFinite(n)?Math.round(n*100):0; }
  function formatarDataCurta(v){ if(!v)return"—"; const d=new Date(`${v}T12:00:00`); return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat("pt-BR").format(d); }
  function indicarStatus(tipo,mensagem){ const e=document.getElementById("comercial-status-badge"); if(e){e.className=`status-badge ${tipo}`;e.textContent=mensagem;} }

  return { iniciar, carregar:carregarTudo, converterInteresse };
})();
