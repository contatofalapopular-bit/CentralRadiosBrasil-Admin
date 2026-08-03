const StreamingInteressesAdmin = (() => {
  const estado = {
    interesses: [],
    contadores: {},
    status: "",
    busca: "",
    selecionado: null,
    carregando: false,
    ultimoFoco: null
  };

  const rotulosStatus = {
    novo: "Novo",
    contatado: "Contatado",
    qualificado: "Qualificado",
    convertido: "Convertido",
    arquivado: "Arquivado"
  };

  const rotulosRecursos = {
    streaming: "Streaming 24h",
    autodj: "AutoDJ",
    player: "Player",
    pwa: "Aplicativo PWA",
    alexa: "Alexa"
  };

  const rotulosSituacao = {
    ideia: "Ainda é uma ideia",
    montando: "Está montando a rádio",
    ja_tem_radio: "Já possui rádio online",
    migracao: "Quer migrar de fornecedor"
  };

  const rotulosPrevisao = {
    imediatamente: "Imediatamente",
    "30_dias": "Nos próximos 30 dias",
    "60_90_dias": "Entre 60 e 90 dias",
    sem_previsao: "Ainda sem previsão"
  };

  async function iniciar() {
    conectarEventos();
    await carregar();
  }

  function conectarEventos() {
    document
      .getElementById("streaming-refresh-button")
      ?.addEventListener("click", carregar);

    document
      .getElementById("streaming-search")
      ?.addEventListener("input", debounce((evento) => {
        estado.busca = evento.target.value.trim();
        carregar();
      }, 350));

    document
      .getElementById("streaming-status-filter")
      ?.addEventListener("change", (evento) => {
        estado.status = evento.target.value;
        carregar();
      });

    document
      .getElementById("close-streaming-modal")
      ?.addEventListener("click", fecharModal);

    document
      .getElementById("streaming-modal-cancel")
      ?.addEventListener("click", fecharModal);

    document
      .getElementById("streaming-modal-backdrop")
      ?.addEventListener("click", (evento) => {
        if (evento.target.id === "streaming-modal-backdrop") {
          fecharModal();
        }
      });

    document
      .getElementById("streaming-interest-form")
      ?.addEventListener("submit", salvar);

    document
      .getElementById("streaming-copy-protocol")
      ?.addEventListener("click", copiarProtocolo);

    document.addEventListener("keydown", (evento) => {
      if (
        evento.key === "Escape" &&
        !document.getElementById("streaming-modal-backdrop")?.classList.contains("hidden")
      ) {
        fecharModal();
      }
    });
  }

  async function carregar() {
    if (estado.carregando) return;

    if (!API.chaveAdmin()) {
      const entrou = await SolicitacoesAdmin.informarChave();
      if (!entrou) {
        indicarStatus("error", "Entre no Painel para acessar os interessados");
        return;
      }
    }

    estado.carregando = true;
    indicarStatus("loading", "Carregando pré-cadastros");
    definirCarregandoTabela();

    try {
      const resposta = await API.listarInteressesStreaming({
        status: estado.status,
        busca: estado.busca,
        limit: 500
      });

      estado.interesses = Array.isArray(resposta?.interesses)
        ? resposta.interesses
        : [];
      estado.contadores = resposta?.contadores || {};

      renderizarContadores();
      renderizarTabela();
      indicarStatus(
        "success",
        `${estado.interesses.length} pré-cadastro${estado.interesses.length === 1 ? "" : "s"} exibido${estado.interesses.length === 1 ? "" : "s"}`
      );
    } catch (erro) {
      if (erro.status === 401) {
        API.definirChaveAdmin("");
      }
      renderizarErro(erro);
    } finally {
      estado.carregando = false;
    }
  }

  function renderizarContadores() {
    texto("streaming-total-count", estado.contadores.total || 0);
    texto("streaming-new-count", estado.contadores.novos || 0);
    texto("streaming-contacted-count", estado.contadores.contatados || 0);
    texto("streaming-qualified-count", estado.contadores.qualificados || 0);
    texto("streaming-converted-count", estado.contadores.convertidos || 0);
    texto("streaming-visible-count", estado.interesses.length);
  }

  function definirCarregandoTabela() {
    const corpo = document.getElementById("streaming-table-body");
    if (corpo) {
      corpo.innerHTML = '<tr><td colspan="8" class="streaming-empty">Carregando interessados…</td></tr>';
    }
  }

  function renderizarTabela() {
    const corpo = document.getElementById("streaming-table-body");
    if (!corpo) return;

    if (!estado.interesses.length) {
      corpo.innerHTML = `
        <tr>
          <td colspan="8" class="streaming-empty">
            <strong>Nenhum pré-cadastro encontrado.</strong><br>
            Ajuste os filtros ou aguarde novos interessados pelo Portal.
          </td>
        </tr>`;
      return;
    }

    corpo.innerHTML = estado.interesses.map((item) => {
      const recursos = Array.isArray(item.recursos) ? item.recursos : [];
      const nomeProjeto = item.nome_projeto || "Projeto ainda sem nome";
      const situacao = rotulosSituacao[item.situacao_projeto] || item.situacao_projeto || "Não informada";
      const status = item.status || "novo";

      return `
        <tr>
          <td><span class="streaming-protocol">${escaparHtml(item.protocolo)}</span></td>
          <td class="streaming-contact">
            <strong>${escaparHtml(item.nome)}</strong>
            <small>${escaparHtml(item.email)}</small>
            <small>${escaparHtml(item.whatsapp)}</small>
          </td>
          <td class="streaming-project">
            <strong>${escaparHtml(nomeProjeto)}</strong>
            <small>${escaparHtml(situacao)}</small>
          </td>
          <td class="streaming-location">
            ${escaparHtml(item.cidade)} — ${escaparHtml(item.estado)}
            <small>${escaparHtml(rotulosPrevisao[item.previsao_inicio] || item.previsao_inicio || "Sem previsão")}</small>
          </td>
          <td>
            <div class="streaming-resources">
              ${recursos.length
                ? recursos.map((recurso) => `<span class="streaming-resource">${escaparHtml(rotulosRecursos[recurso] || recurso)}</span>`).join("")
                : '<span class="streaming-resource">Interesse geral</span>'}
            </div>
          </td>
          <td><span class="streaming-status ${escaparHtml(status)}">${escaparHtml(rotulosStatus[status] || status)}</span></td>
          <td>${formatarData(item.criado_em)}</td>
          <td><button type="button" class="streaming-row-action" data-streaming-id="${escaparHtml(item.id)}">Abrir</button></td>
        </tr>`;
    }).join("");

    corpo.querySelectorAll("[data-streaming-id]").forEach((botao) => {
      botao.addEventListener("click", () => abrirModal(botao.dataset.streamingId, botao));
    });
  }

  function abrirModal(id, origem) {
    const item = estado.interesses.find((interesse) => String(interesse.id) === String(id));
    if (!item) return;

    estado.selecionado = item;
    estado.ultimoFoco = origem || document.activeElement;

    texto("streaming-modal-title", item.nome || "Interessado");
    texto("streaming-modal-protocol", item.protocolo || "—");
    texto("streaming-detail-email", item.email || "—");
    texto("streaming-detail-whatsapp", item.whatsapp || "—");
    texto("streaming-detail-location", `${item.cidade || "—"} — ${item.estado || "—"}`);
    texto("streaming-detail-project", item.nome_projeto || "Projeto ainda sem nome");
    texto(
      "streaming-detail-situation",
      rotulosSituacao[item.situacao_projeto] || item.situacao_projeto || "Não informada"
    );
    texto(
      "streaming-detail-start",
      rotulosPrevisao[item.previsao_inicio] || item.previsao_inicio || "Sem previsão"
    );
    texto("streaming-detail-message", item.mensagem || "Nenhuma observação enviada pelo interessado.");
    texto("streaming-detail-date", formatarData(item.criado_em));
    texto("streaming-detail-origin", item.origem || "portal-streaming");

    const recursos = document.getElementById("streaming-detail-resources");
    if (recursos) {
      const lista = Array.isArray(item.recursos) ? item.recursos : [];
      recursos.innerHTML = lista.length
        ? lista.map((recurso) => `<span class="streaming-resource">${escaparHtml(rotulosRecursos[recurso] || recurso)}</span>`).join("")
        : '<span class="streaming-resource">Interesse geral</span>';
    }

    const emailLink = document.getElementById("streaming-email-link");
    if (emailLink) {
      emailLink.href = `mailto:${item.email || ""}?subject=${encodeURIComponent(`Streaming CRB — ${item.protocolo || "pré-cadastro"}`)}`;
    }

    const whatsappLink = document.getElementById("streaming-whatsapp-link");
    if (whatsappLink) {
      const numero = somenteDigitos(item.whatsapp);
      const numeroCompleto = numero.startsWith("55") ? numero : `55${numero}`;
      whatsappLink.href = numero
        ? `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(`Olá, ${item.nome}. Recebemos seu interesse no Streaming CRB (${item.protocolo}).`)}`
        : "#";
      whatsappLink.classList.toggle("hidden", !numero);
    }

    const status = document.getElementById("streaming-interest-status");
    const observacoes = document.getElementById("streaming-interest-notes");
    if (status) status.value = item.status || "novo";
    if (observacoes) observacoes.value = item.observacoes_admin || "";

    const backdrop = document.getElementById("streaming-modal-backdrop");
    backdrop?.classList.remove("hidden");
    document.body.classList.add("modal-open");
    document.getElementById("close-streaming-modal")?.focus();
  }

  function fecharModal() {
    document.getElementById("streaming-modal-backdrop")?.classList.add("hidden");
    document.body.classList.remove("modal-open");
    estado.selecionado = null;
    estado.ultimoFoco?.focus?.();
    estado.ultimoFoco = null;
  }

  async function salvar(evento) {
    evento.preventDefault();
    if (!estado.selecionado) return;

    const botao = document.getElementById("streaming-modal-save");
    const status = document.getElementById("streaming-interest-status")?.value || "novo";
    const observacoesAdmin = document.getElementById("streaming-interest-notes")?.value.trim() || "";

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando…";
    }

    try {
      await API.atualizarInteresseStreaming(estado.selecionado.id, {
        status,
        observacoesAdmin
      });

      fecharModal();
      await carregar();
      alert("Pré-cadastro atualizado com sucesso.");
    } catch (erro) {
      alert(erro.message || "Não foi possível atualizar o pré-cadastro.");
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Salvar atualização";
      }
    }
  }

  async function copiarProtocolo() {
    const protocolo = estado.selecionado?.protocolo;
    if (!protocolo) return;

    try {
      await navigator.clipboard.writeText(protocolo);
      const botao = document.getElementById("streaming-copy-protocol");
      if (botao) {
        const original = botao.textContent;
        botao.textContent = "✓ Protocolo copiado";
        setTimeout(() => { botao.textContent = original; }, 1400);
      }
    } catch {
      alert(`Protocolo: ${protocolo}`);
    }
  }

  function renderizarErro(erro) {
    indicarStatus("error", erro?.message || "Falha ao carregar pré-cadastros");
    const corpo = document.getElementById("streaming-table-body");
    if (corpo) {
      corpo.innerHTML = `
        <tr>
          <td colspan="8" class="streaming-empty">
            <strong>Não foi possível carregar os interessados.</strong><br>
            ${escaparHtml(erro?.message || "Erro desconhecido")}
          </td>
        </tr>`;
    }
  }

  function indicarStatus(tipo, mensagem) {
    const badge = document.getElementById("streaming-status-badge");
    if (!badge) return;
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  }

  function somenteDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function debounce(funcao, espera) {
    let temporizador;
    return (...argumentos) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => funcao(...argumentos), espera);
    };
  }

  return {
    iniciar,
    carregar
  };
})();
