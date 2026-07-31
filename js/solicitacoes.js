const SolicitacoesAdmin = {
  solicitacoes: [],
  selecionada: null,
  eventosRegistrados: false,

  async iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }

    this.atualizarEstadoChave();

    if (API.chaveAdmin()) {
      await this.carregar();
    } else {
      this.renderizar();
    }
  },

  registrarEventos() {
    document
      .getElementById("solicitacoes-chave-button")
      .addEventListener(
        "click",
        () => this.informarChave()
      );

    document
      .getElementById("solicitacoes-refresh-button")
      .addEventListener(
        "click",
        () => this.carregar()
      );

    document
      .getElementById("solicitacao-search")
      .addEventListener(
        "input",
        () => this.renderizar()
      );

    document
      .getElementById("solicitacao-status-filter")
      .addEventListener(
        "change",
        () => this.renderizar()
      );

    document
      .getElementById("solicitacao-logo-filter")
      .addEventListener(
        "change",
        () => this.renderizar()
      );

    document
      .getElementById("close-solicitacao-modal")
      .addEventListener(
        "click",
        () => this.fecharDetalhes()
      );

    document
      .getElementById("solicitacao-modal-backdrop")
      .addEventListener(
        "click",
        (evento) => {
          if (
            evento.target.id ===
            "solicitacao-modal-backdrop"
          ) {
            this.fecharDetalhes();
          }
        }
      );

    document
      .getElementById(
        "solicitacao-marcar-analise-button"
      )
      .addEventListener(
        "click",
        () => this.atualizarStatus("em_analise")
      );

    document
      .getElementById("solicitacao-rejeitar-button")
      .addEventListener(
        "click",
        () => this.atualizarStatus("rejeitada")
      );

    document
      .getElementById("solicitacao-importar-button")
      .addEventListener(
        "click",
        () => this.importarParaEmissoras("em_analise")
      );

    document
      .getElementById("solicitacao-aprovar-button")
      .addEventListener(
        "click",
        () => this.importarParaEmissoras("aprovada")
      );
  },

  informarChave() {
    const atual = API.chaveAdmin();

    const chave = prompt(
      atual
        ? "Digite uma nova chave administrativa. Deixe vazio para remover a chave desta aba."
        : "Digite a chave administrativa configurada no Worker:"
    );

    if (chave === null) {
      return;
    }

    API.definirChaveAdmin(chave);
    this.atualizarEstadoChave();

    if (API.chaveAdmin()) {
      this.carregar();
    } else {
      this.solicitacoes = [];
      this.renderizar();
    }
  },

  atualizarEstadoChave() {
    const possuiChave = Boolean(API.chaveAdmin());
    const botao =
      document.getElementById(
        "solicitacoes-chave-button"
      );

    botao.textContent = possuiChave
      ? "🔐 Alterar chave administrativa"
      : "🔐 Informar chave administrativa";

    document
      .getElementById("solicitacoes-aviso-chave")
      .classList.toggle("hidden", possuiChave);
  },

  async carregar() {
    if (!API.chaveAdmin()) {
      this.informarChave();
      return;
    }

    const badge =
      document.getElementById(
        "solicitacoes-status-badge"
      );

    badge.className = "status-badge loading";
    badge.textContent = "Carregando solicitações";

    try {
      const resposta =
        await API.listarSolicitacoes();

      this.solicitacoes =
        Array.isArray(resposta?.solicitacoes)
          ? resposta.solicitacoes
          : [];

      badge.className = "status-badge success";
      badge.textContent = "Solicitações sincronizadas";

      this.atualizarEstadoChave();
      this.renderizar();
    } catch (erro) {
      console.error(
        "Falha ao carregar solicitações:",
        erro
      );

      if (erro.status === 401) {
        API.definirChaveAdmin("");
        this.atualizarEstadoChave();
        badge.className = "status-badge error";
        badge.textContent = "Chave administrativa inválida";

        alert(
          "A chave administrativa não foi aceita. Informe a chave correta."
        );
      } else if (erro.status === 503) {
        badge.className = "status-badge error";
        badge.textContent =
          "Chave ainda não configurada no Worker";

        alert(
          "Configure o segredo ADMIN_KEY no Worker antes de usar esta área."
        );
      } else {
        badge.className = "status-badge error";
        badge.textContent =
          "Não foi possível carregar as solicitações";

        alert(
          erro.message ||
          "Não foi possível acessar a API administrativa."
        );
      }

      this.renderizar();
    }
  },

  filtradas() {
    const busca = normalizar(
      document
        .getElementById("solicitacao-search")
        .value
    );

    const status =
      document
        .getElementById(
          "solicitacao-status-filter"
        )
        .value;

    const filtroLogo =
      document
        .getElementById("solicitacao-logo-filter")
        .value;

    return this.solicitacoes.filter(
      (solicitacao) => {
        const correspondeBusca =
          !busca ||
          normalizar([
            solicitacao.protocolo,
            solicitacao.nome_radio,
            solicitacao.cidade,
            solicitacao.estado,
            solicitacao.email,
            solicitacao.categoria_principal
          ].join(" ")).includes(busca);

        const correspondeStatus =
          !status ||
          solicitacao.status === status;

        const possuiLogo =
          Boolean(solicitacao.logo_chave_r2);

        const correspondeLogo =
          !filtroLogo ||
          (
            filtroLogo === "com_logo" &&
            possuiLogo
          ) ||
          (
            filtroLogo === "sem_logo" &&
            !possuiLogo
          );

        return (
          correspondeBusca &&
          correspondeStatus &&
          correspondeLogo
        );
      }
    );
  },

  renderizar() {
    const tbody =
      document.getElementById(
        "solicitacoes-table-body"
      );

    const lista = this.filtradas();

    texto(
      "solicitacoes-visible-count",
      lista.length
    );

    texto(
      "solicitacoes-total-count",
      this.solicitacoes.length
    );

    texto(
      "solicitacoes-pendentes-count",
      this.contarStatus("pendente")
    );

    texto(
      "solicitacoes-analise-count",
      this.contarStatus("em_analise")
    );

    texto(
      "solicitacoes-aprovadas-count",
      this.contarStatus("aprovada")
    );

    texto(
      "solicitacoes-rejeitadas-count",
      this.contarStatus("rejeitada")
    );

    texto(
      "solicitacoes-sem-logo-count",
      this.solicitacoes.filter(
        (item) => !item.logo_chave_r2
      ).length
    );

    if (!API.chaveAdmin()) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Informe a chave administrativa para carregar as solicitações.
          </td>
        </tr>
      `;
      return;
    }

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Nenhuma solicitação encontrada.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(
      (solicitacao) => {
        const possuiLogo =
          Boolean(solicitacao.logo_url);

        const logo = possuiLogo
          ? `
            <img
              src="${escaparHtml(solicitacao.logo_url)}"
              alt="Logomarca de ${escaparHtml(solicitacao.nome_radio)}"
              loading="lazy"
            >
          `
          : `
            <span aria-hidden="true">📻</span>
          `;

        return `
          <tr>
            <td>
              <div class="solicitacao-logo-mini ${possuiLogo ? "" : "sem-logo"}">
                ${logo}
              </div>
            </td>
            <td>
              <strong>${escaparHtml(solicitacao.nome_radio)}</strong>
              <small>${escaparHtml(solicitacao.protocolo)}</small>
            </td>
            <td>
              ${escaparHtml(solicitacao.cidade)}/
              ${escaparHtml(solicitacao.estado)}
            </td>
            <td>
              ${escaparHtml(solicitacao.categoria_principal)}
            </td>
            <td>
              ${escaparHtml(this.formatarData(solicitacao.criado_em))}
            </td>
            <td>
              <span class="solicitacao-status solicitacao-status--${escaparHtml(solicitacao.status)}">
                ${escaparHtml(this.rotuloStatus(solicitacao.status))}
              </span>
              <small class="solicitacao-logo-resumo">
                ${possuiLogo ? "Logo recebida" : "Logo pendente"}
              </small>
            </td>
            <td class="actions-cell">
              <button type="button" class="table-button"
                onclick="SolicitacoesAdmin.abrirDetalhes('${escaparHtml(solicitacao.protocolo)}')">
                Analisar
              </button>
            </td>
          </tr>
        `;
      }
    ).join("");
  },

  contarStatus(status) {
    return this.solicitacoes.filter(
      (item) => item.status === status
    ).length;
  },

  rotuloStatus(status) {
    const rotulos = {
      pendente: "Pendente",
      em_analise: "Em análise",
      aprovada: "Aprovada",
      rejeitada: "Rejeitada"
    };

    return rotulos[status] || status || "Pendente";
  },

  formatarData(valor) {
    if (!valor) {
      return "—";
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime())
      ? String(valor)
      : data.toLocaleString("pt-BR");
  },

  async abrirDetalhes(protocolo) {
    let solicitacao =
      this.solicitacoes.find(
        (item) => item.protocolo === protocolo
      );

    try {
      const resposta =
        await API.detalharSolicitacao(protocolo);

      if (resposta?.solicitacao) {
        solicitacao = resposta.solicitacao;
      }
    } catch (erro) {
      console.warn(
        "Detalhamento remoto indisponível:",
        erro
      );
    }

    if (!solicitacao) {
      alert("A solicitação não foi encontrada.");
      return;
    }

    this.selecionada = solicitacao;
    this.preencherDetalhes();

    document
      .getElementById(
        "solicitacao-modal-backdrop"
      )
      .classList.remove("hidden");
  },

  preencherDetalhes() {
    const item = this.selecionada;

    texto(
      "solicitacao-modal-title",
      `Analisar ${item.nome_radio}`
    );

    texto(
      "solicitacao-detalhe-protocolo",
      item.protocolo
    );

    texto(
      "solicitacao-detalhe-nome",
      item.nome_radio
    );

    texto(
      "solicitacao-detalhe-localizacao",
      `${item.cidade}/${item.estado}`
    );

    texto(
      "solicitacao-detalhe-categoria",
      item.categoria_principal
    );

    texto(
      "solicitacao-detalhe-plano",
      item.plano_solicitado || "gratuito"
    );

    texto(
      "solicitacao-detalhe-email",
      item.email
    );

    texto(
      "solicitacao-detalhe-whatsapp",
      item.whatsapp
    );

    texto(
      "solicitacao-detalhe-site",
      item.site || "Não informado"
    );

    texto(
      "solicitacao-detalhe-stream",
      item.stream_url
    );

    texto(
      "solicitacao-detalhe-descricao",
      item.descricao || "Não informada"
    );

    texto(
      "solicitacao-detalhe-observacao",
      item.observacao_analise ||
      "Nenhuma observação registrada."
    );

    document
      .getElementById("solicitacao-observacao")
      .value = item.observacao_analise || "";

    const preview =
      document.getElementById(
        "solicitacao-logo-preview"
      );

    const statusLogo =
      document.getElementById(
        "solicitacao-logo-status"
      );

    if (item.logo_url) {
      preview.innerHTML = `
        <img
          src="${escaparHtml(item.logo_url)}"
          alt="Logomarca de ${escaparHtml(item.nome_radio)}"
        >
      `;

      statusLogo.className =
        "solicitacao-logo-status com-logo";

      statusLogo.textContent =
        `${item.logo_largura || "?"} × ` +
        `${item.logo_altura || "?"} px`;
    } else {
      preview.innerHTML = `
        <span>📻</span>
        <small>Sem logomarca</small>
      `;

      statusLogo.className =
        "solicitacao-logo-status sem-logo";

      statusLogo.textContent = "Logo pendente";
    }

    document
      .getElementById(
        "solicitacao-aprovar-button"
      )
      .disabled = !item.logo_chave_r2;
  },

  fecharDetalhes() {
    this.selecionada = null;

    document
      .getElementById(
        "solicitacao-modal-backdrop"
      )
      .classList.add("hidden");
  },

  async atualizarStatus(status) {
    if (!this.selecionada) {
      return;
    }

    const observacao =
      document
        .getElementById(
          "solicitacao-observacao"
        )
        .value
        .trim();

    if (status === "rejeitada" && !observacao) {
      alert(
        "Informe o motivo da rejeição no campo de observação."
      );
      return;
    }

    const confirmou = confirm(
      `Alterar a solicitação para “${this.rotuloStatus(status)}”?`
    );

    if (!confirmou) {
      return;
    }

    try {
      await API.atualizarSolicitacao(
        this.selecionada.protocolo,
        {
          status,
          observacaoAnalise: observacao
        }
      );

      this.fecharDetalhes();
      await this.carregar();
    } catch (erro) {
      alert(
        erro.message ||
        "Não foi possível atualizar a solicitação."
      );
    }
  },

  async importarParaEmissoras(statusDestino) {
    const solicitacao = this.selecionada;

    if (!solicitacao) {
      return;
    }

    if (
      statusDestino === "aprovada" &&
      !solicitacao.logo_chave_r2
    ) {
      alert(
        "Esta solicitação não pode ser aprovada enquanto a logomarca estiver pendente."
      );
      return;
    }

    const acao =
      statusDestino === "aprovada"
        ? "aprovar e importar"
        : "importar para análise";

    const confirmou = confirm(
      `Deseja ${acao} a solicitação ${solicitacao.protocolo}?`
    );

    if (!confirmou) {
      return;
    }

    try {
      if (
        !EmissorasAdmin.eventosRegistrados ||
        !Array.isArray(EmissorasAdmin.emissoras)
      ) {
        await EmissorasAdmin.iniciar();
      } else if (
        EmissorasAdmin.emissoras.length === 0 &&
        !localStorage.getItem(
          CONFIG.EMISSORAS_STORAGE_KEY
        )
      ) {
        await EmissorasAdmin.carregar();
      }

      const existente =
        EmissorasAdmin.emissoras.find(
          (item) =>
            item.origemSolicitacao?.protocolo ===
            solicitacao.protocolo
        );

      const observacao =
        document
          .getElementById(
            "solicitacao-observacao"
          )
          .value
          .trim();

      await API.atualizarSolicitacao(
        solicitacao.protocolo,
        {
          status: statusDestino,
          observacaoAnalise: observacao
        }
      );

      let emissora = existente;

      if (!emissora) {
        emissora =
          this.converterParaEmissora(
            solicitacao,
            statusDestino,
            observacao
          );

        EmissorasAdmin.emissoras.push(emissora);
        EmissorasAdmin.salvarLocal();
        EmissorasAdmin.preencherFiltros();
      }

      emissorasInicializadas = true;
      this.fecharDetalhes();
      await this.carregar();

      window.location.hash = "#/emissoras";

      window.setTimeout(() => {
        EmissorasAdmin.abrirFormulario(emissora);
      }, 250);
    } catch (erro) {
      console.error(
        "Falha ao importar solicitação:",
        erro
      );

      alert(
        erro.message ||
        "Não foi possível importar a solicitação."
      );
    }
  },

  converterParaEmissora(
    solicitacao,
    statusDestino,
    observacao
  ) {
    const agora = new Date().toISOString();
    const identificador =
      `${gerarSlug(solicitacao.nome_radio)}-${Date.now()}`;

    return {
      id: identificador,
      slug: gerarSlug(solicitacao.nome_radio),
      nome: solicitacao.nome_radio,
      nomeFantasia: solicitacao.nome_radio,
      razaoSocial: "",
      slogan: "",
      tipo: "Web",
      frequencia: "",
      descricao: solicitacao.descricao || "",
      logo: solicitacao.logo_url || "",
      categoriaPrincipal:
        solicitacao.categoria_principal,
      categorias: [
        solicitacao.categoria_principal
      ],
      localizacao: {
        pais: "Brasil",
        uf: solicitacao.estado,
        cidade: solicitacao.cidade,
        cep: "",
        endereco: "",
        latitude: "",
        longitude: ""
      },
      contato: {
        telefone: "",
        whatsapp: solicitacao.whatsapp,
        email: solicitacao.email
      },
      redesSociais: {
        facebook: "",
        instagram: "",
        youtube: ""
      },
      site: solicitacao.site || "",
      statusCadastro:
        statusDestino === "aprovada"
          ? "aprovada"
          : "em_analise",
      plano:
        solicitacao.plano_solicitado === "premium"
          ? "premium"
          : "gratuito",
      seloOficial: {
        status: "nao_solicitado",
        codigo: "",
        dominio: "",
        metodo: "nao_definido",
        ultimaVerificacao: null,
        historico: []
      },
      ativa: false,
      verificada: false,
      publica: false,
      streams: [
        {
          id: `stream-${Date.now()}`,
          nome: "Principal",
          url: solicitacao.stream_url,
          principal: true,
          codec: "Não informado",
          bitrate: null,
          monitoramento: {
            status: "nao_testado",
            ultimaVerificacao: null,
            tempoRespostaMs: null
          }
        }
      ],
      observacoes: [
        `Importada da solicitação ${solicitacao.protocolo}.`,
        observacao
      ].filter(Boolean).join(" "),
      origemSolicitacao: {
        protocolo: solicitacao.protocolo,
        recebidoEm: solicitacao.criado_em
      },
      criadoEm: agora,
      atualizadoEm: agora
    };
  }
};
