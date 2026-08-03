const EmailsAdmin = (() => {
  const estado = {
    caixa: "entrada",
    busca: "",
    mensagens: [],
    selecionada: null,
    resumo: {},
    modoEnvio: "teste",
    destinatarioTeste: ""
  };

  async function iniciar() {
    conectarEventos();
    await carregar();
  }

  function conectarEventos() {
    document.getElementById("emails-refresh-button")?.addEventListener("click", carregar);
    document.getElementById("emails-compose-button")?.addEventListener("click", () => abrirCompositor());
    document.getElementById("emails-compose-close")?.addEventListener("click", fecharCompositor);
    document.getElementById("emails-compose-cancel")?.addEventListener("click", fecharCompositor);
    document.getElementById("emails-compose-form")?.addEventListener("submit", enviar);
    document.getElementById("emails-search")?.addEventListener("input", debounce((evento) => {
      estado.busca = evento.target.value.trim();
      carregarLista();
    }, 350));

    document.querySelectorAll("[data-email-box]").forEach((botao) => {
      botao.addEventListener("click", () => {
        estado.caixa = botao.dataset.emailBox;
        estado.selecionada = null;
        document.querySelectorAll("[data-email-box]").forEach((item) => {
          item.classList.toggle("active", item === botao);
        });
        carregarLista();
      });
    });

    document.getElementById("email-reply-button")?.addEventListener("click", responderSelecionado);
    document.getElementById("email-unread-button")?.addEventListener("click", () => atualizarSelecionado({ lida: false }));
    document.getElementById("email-archive-button")?.addEventListener("click", () => atualizarSelecionado({ estado: "arquivada" }));
    document.getElementById("email-trash-button")?.addEventListener("click", () => atualizarSelecionado({ estado: "lixeira" }));
    document.getElementById("email-restore-button")?.addEventListener("click", () => atualizarSelecionado({ estado: "ativa" }));
  }

  async function carregar() {
    if (!API.chaveAdmin()) {
      const entrou = await SolicitacoesAdmin.informarChave();
      if (!entrou) {
        indicarStatus("error", "Entre no Painel para acessar os e-mails");
        return;
      }
    }
    indicarStatus("loading", "Carregando caixa de e-mail");
    try {
      const resumo = await API.resumoEmails();
      estado.resumo = resumo.resumo || {};
      estado.modoEnvio = resumo.modoEnvio || "teste";
      estado.destinatarioTeste = resumo.destinatarioTeste || "";
      renderizarResumo();
      await carregarLista();
      indicarStatus("success", `E-mail conectado — modo ${estado.modoEnvio}`);
    } catch (erro) {
      indicarStatus("error", erro.message || "Falha ao carregar e-mails");
      renderizarErro(erro);
    }
  }

  async function carregarLista() {
    const lista = document.getElementById("emails-list");
    if (lista) lista.innerHTML = '<div class="email-empty">Carregando mensagens…</div>';
    try {
      const resposta = await API.listarEmails({ caixa: estado.caixa, busca: estado.busca });
      estado.mensagens = resposta.mensagens || [];
      renderizarLista();
      if (!estado.selecionada && estado.mensagens.length) {
        await selecionar(estado.mensagens[0].id);
      } else if (!estado.mensagens.length) {
        limparLeitor();
      }
    } catch (erro) {
      renderizarErro(erro);
    }
  }

  function renderizarResumo() {
    const resumo = estado.resumo;
    texto("emails-count-inbox", resumo.entrada || 0);
    texto("emails-count-unread", resumo.naoLidas || 0);
    texto("emails-count-sent", resumo.enviados || 0);
    texto("emails-count-archived", resumo.arquivados || 0);
    texto("emails-count-trash", resumo.lixeira || 0);
    texto("emails-nav-count", resumo.naoLidas ? String(resumo.naoLidas) : "");
    document.getElementById("emails-nav-count")?.classList.toggle("hidden", !resumo.naoLidas);

    const modo = document.getElementById("emails-mode-note");
    if (modo) {
      modo.textContent = estado.modoEnvio === "teste"
        ? `Modo de testes: respostas limitadas a ${estado.destinatarioTeste}.`
        : "Modo de produção: respostas liberadas para destinatários externos.";
      modo.className = `emails-mode-note ${estado.modoEnvio === "teste" ? "testing" : "production"}`;
    }
  }

  function renderizarLista() {
    const lista = document.getElementById("emails-list");
    texto("emails-visible-count", estado.mensagens.length);
    if (!lista) return;
    if (!estado.mensagens.length) {
      lista.innerHTML = '<div class="email-empty"><strong>Nenhuma mensagem nesta caixa.</strong><span>Novos e-mails aparecerão aqui automaticamente.</span></div>';
      return;
    }

    lista.innerHTML = estado.mensagens.map((item) => {
      const nome = item.direcao === "saida"
        ? `Para: ${(item.destinatarios || []).join(", ")}`
        : (item.remetenteNome || item.remetenteEmail);
      const naoLida = item.direcao === "entrada" && !item.lidaEm;
      return `
        <button class="email-list-item ${naoLida ? "unread" : ""} ${estado.selecionada?.id === item.id ? "selected" : ""}"
          type="button" data-email-id="${escaparHtml(item.id)}">
          <span class="email-list-top"><strong>${escaparHtml(nome)}</strong><time>${formatarDataEmail(item.data)}</time></span>
          <span class="email-list-subject">${escaparHtml(item.assunto || "Sem assunto")}</span>
          <span class="email-list-preview">${escaparHtml(item.previa || "Sem conteúdo textual")}</span>
          <span class="email-list-meta">${Number(item.totalAnexos || 0) ? `📎 ${item.totalAnexos}` : ""}</span>
        </button>`;
    }).join("");

    lista.querySelectorAll("[data-email-id]").forEach((botao) => {
      botao.addEventListener("click", () => selecionar(botao.dataset.emailId));
    });
  }

  async function selecionar(id) {
    const leitor = document.getElementById("email-reader");
    if (leitor) leitor.setAttribute("aria-busy", "true");
    try {
      const resposta = await API.detalharEmail(id);
      estado.selecionada = resposta.mensagem;
      estado.selecionada.conversa = resposta.conversa || [];
      estado.selecionada.anexos = resposta.anexos || [];
      renderizarLista();
      renderizarLeitor();
      const resumo = await API.resumoEmails();
      estado.resumo = resumo.resumo || {};
      renderizarResumo();
    } catch (erro) {
      renderizarErro(erro);
    } finally {
      leitor?.removeAttribute("aria-busy");
    }
  }

  function renderizarLeitor() {
    const item = estado.selecionada;
    if (!item) return limparLeitor();

    texto("email-reader-subject", item.assunto || "Sem assunto");
    texto("email-reader-from", item.direcao === "saida"
      ? `Enviado para ${(item.destinatarios || []).join(", ")}`
      : `${item.remetenteNome || item.remetenteEmail} <${item.remetenteEmail}>`);
    texto("email-reader-date", formatarDataEmail(item.data, true));
    texto("email-reader-body", item.corpoTexto || "Esta mensagem não possui conteúdo textual disponível.");

    const thread = document.getElementById("email-thread");
    if (thread) {
      thread.innerHTML = (item.conversa || []).map((mensagem) => `
        <article class="email-thread-item ${mensagem.direcao}">
          <header><strong>${mensagem.direcao === "saida" ? "Central Rádios Brasil" : escaparHtml(mensagem.remetenteNome || mensagem.remetenteEmail)}</strong><time>${formatarDataEmail(mensagem.data)}</time></header>
          <p>${escaparHtml(mensagem.corpoTexto || "").replace(/\n/g, "<br>")}</p>
        </article>`).join("");
    }

    const anexos = document.getElementById("email-attachments");
    if (anexos) {
      anexos.innerHTML = item.anexos.length
        ? `<h4>Anexos</h4>${item.anexos.map((anexo) => `<button type="button" data-attachment-id="${escaparHtml(anexo.id)}">📎 ${escaparHtml(anexo.nome)} <small>${formatarBytes(anexo.tamanhoBytes)}</small></button>`).join("")}`
        : "";
      anexos.querySelectorAll("[data-attachment-id]").forEach((botao) => {
        botao.addEventListener("click", () => API.baixarAnexo(item.id, botao.dataset.attachmentId));
      });
    }

    document.getElementById("email-reply-button")?.classList.toggle("hidden", item.direcao !== "entrada" || Boolean(item.lixeiraEm));
    document.getElementById("email-unread-button")?.classList.toggle("hidden", item.direcao !== "entrada" || Boolean(item.lixeiraEm));
    document.getElementById("email-archive-button")?.classList.toggle("hidden", Boolean(item.arquivadaEm) || Boolean(item.lixeiraEm));
    document.getElementById("email-trash-button")?.classList.toggle("hidden", Boolean(item.lixeiraEm));
    document.getElementById("email-restore-button")?.classList.toggle("hidden", !item.arquivadaEm && !item.lixeiraEm);
    document.getElementById("email-reader-empty")?.classList.add("hidden");
    document.getElementById("email-reader-content")?.classList.remove("hidden");
  }

  function limparLeitor() {
    document.getElementById("email-reader-empty")?.classList.remove("hidden");
    document.getElementById("email-reader-content")?.classList.add("hidden");
  }

  function responderSelecionado() {
    const item = estado.selecionada;
    if (!item) return;
    abrirCompositor({
      to: item.remetenteEmail,
      subject: /^re:/i.test(item.assunto) ? item.assunto : `Re: ${item.assunto}`,
      replyToId: item.id
    });
  }

  function abrirCompositor(valores = {}) {
    const modal = document.getElementById("emails-compose-backdrop");
    const form = document.getElementById("emails-compose-form");
    form?.reset();
    document.getElementById("email-compose-to").value = valores.to || (estado.modoEnvio === "teste" ? estado.destinatarioTeste : "");
    document.getElementById("email-compose-subject").value = valores.subject || "";
    document.getElementById("email-compose-reply-id").value = valores.replyToId || "";
    modal?.classList.remove("hidden");
    document.getElementById("email-compose-to")?.focus();
  }

  function fecharCompositor() {
    document.getElementById("emails-compose-backdrop")?.classList.add("hidden");
  }

  async function enviar(evento) {
    evento.preventDefault();
    const botao = document.getElementById("email-compose-send");
    botao.disabled = true;
    botao.textContent = "Enviando…";
    try {
      const form = new FormData(evento.currentTarget);
      await API.enviarEmail(form);
      fecharCompositor();
      estado.caixa = "enviados";
      document.querySelectorAll("[data-email-box]").forEach((item) => item.classList.toggle("active", item.dataset.emailBox === "enviados"));
      await carregar();
      alert("E-mail enviado com sucesso.");
    } catch (erro) {
      alert(erro.message || "Não foi possível enviar o e-mail.");
    } finally {
      botao.disabled = false;
      botao.textContent = "Enviar e-mail";
    }
  }

  async function atualizarSelecionado(dados) {
    if (!estado.selecionada) return;
    try {
      await API.atualizarEmail(estado.selecionada.id, dados);
      estado.selecionada = null;
      await carregar();
    } catch (erro) {
      alert(erro.message || "Não foi possível atualizar o e-mail.");
    }
  }

  function indicarStatus(tipo, mensagem) {
    const badge = document.getElementById("emails-status-badge");
    if (!badge) return;
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  }

  function renderizarErro(erro) {
    const lista = document.getElementById("emails-list");
    if (lista) lista.innerHTML = `<div class="email-empty error"><strong>Não foi possível carregar o e-mail.</strong><span>${escaparHtml(erro.message || "Erro desconhecido")}</span></div>`;
  }

  function formatarDataEmail(valor, completa = false) {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", completa
      ? { dateStyle: "long", timeStyle: "short" }
      : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
    ).format(data);
  }

  function formatarBytes(bytes) {
    const valor = Number(bytes || 0);
    if (valor < 1024) return `${valor} B`;
    if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
    return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
  }

  function escaparHtml(valor) {
    return String(valor || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function debounce(funcao, espera) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => funcao(...args), espera);
    };
  }

  return { iniciar, carregar };
})();
