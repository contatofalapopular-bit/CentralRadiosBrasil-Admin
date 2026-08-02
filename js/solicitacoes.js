const SolicitacoesAdmin = {
  solicitacoes: [],
  alteracoes: [],
  selecionada: null,
  alteracaoSelecionada: null,
  eventosRegistrados: false,

  async iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }

    this.atualizarEstadoChave();

    if (API.chaveAdmin()) {
      try {
        await API.validarSessaoAdmin();
        await this.carregar();
      } catch {
        API.definirChaveAdmin("");
        this.atualizarEstadoChave();
        this.renderizar();
      }
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

    document
      .getElementById("close-alteracao-modal")
      .addEventListener("click", () => this.fecharAlteracao());

    document
      .getElementById("alteracao-modal-backdrop")
      .addEventListener("click", (evento) => {
        if (evento.target.id === "alteracao-modal-backdrop") {
          this.fecharAlteracao();
        }
      });

    document
      .getElementById("alteracao-marcar-analise-button")
      .addEventListener("click", () =>
        this.atualizarStatusAlteracao("em_analise")
      );

    document
      .getElementById("alteracao-rejeitar-button")
      .addEventListener("click", () =>
        this.atualizarStatusAlteracao("rejeitada")
      );

    document
      .getElementById("alteracao-aplicar-button")
      .addEventListener("click", () =>
        this.aprovarEAplicarAlteracao()
      );
  },

  async informarChave() {
    if (API.chaveAdmin()) {
      const sair = confirm(
        "Encerrar a sessão administrativa desta aba?"
      );

      if (!sair) return false;

      await API.logoutAdmin();
      this.solicitacoes = [];
      this.alteracoes = [];
      this.atualizarEstadoChave();
      this.renderizar();
      return false;
    }

    const chave = prompt(
      "Digite a chave administrativa configurada no Worker. Ela será usada apenas para criar uma sessão temporária e não será armazenada no navegador:"
    );

    if (chave === null || !String(chave).trim()) {
      return false;
    }

    const botao = document.getElementById(
      "solicitacoes-chave-button"
    );
    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
      await API.loginAdmin(String(chave).trim());
      this.atualizarEstadoChave();
      await this.carregar();
      return true;
    } catch (erro) {
      API.definirChaveAdmin("");
      this.atualizarEstadoChave();
      alert(
        erro.message ||
        "Não foi possível iniciar a sessão administrativa."
      );
      return false;
    } finally {
      botao.disabled = false;
      this.atualizarEstadoChave();
    }
  },

  atualizarEstadoChave() {
    const possuiChave = Boolean(API.chaveAdmin());
    const botao =
      document.getElementById(
        "solicitacoes-chave-button"
      );

    botao.textContent = possuiChave
      ? "🔓 Encerrar sessão"
      : "🔐 Entrar no painel";

    document
      .getElementById("solicitacoes-aviso-chave")
      .classList.toggle("hidden", possuiChave);
  },

  async carregar() {
    if (!API.chaveAdmin()) {
      const entrou = await this.informarChave();
      if (!entrou) return;
    }

    const badge =
      document.getElementById(
        "solicitacoes-status-badge"
      );

    badge.className = "status-badge loading";
    badge.textContent = "Carregando solicitações";

    try {
      const [resposta, respostaAlteracoes] =
        await Promise.all([
          API.listarSolicitacoes(),
          API.listarAlteracoes()
        ]);

      this.solicitacoes =
        Array.isArray(resposta?.solicitacoes)
          ? resposta.solicitacoes
          : [];

      this.alteracoes =
        Array.isArray(respostaAlteracoes?.alteracoes)
          ? respostaAlteracoes.alteracoes
          : [];

      badge.className = "status-badge success";
      badge.textContent = "Solicitações sincronizadas";

      const badgeAlteracoes =
        document.getElementById("alteracoes-status-badge");
      badgeAlteracoes.className = "status-badge success";
      badgeAlteracoes.textContent = "Alterações sincronizadas";

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
        badge.textContent = "Sessão administrativa expirada";

        alert(
          "A sessão administrativa terminou. Entre novamente."
        );
      } else if (erro.status === 503) {
        badge.className = "status-badge error";
        badge.textContent =
          "Acesso administrativo ainda não configurado";

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

    this.renderizarAlteracoes();

    if (!API.chaveAdmin()) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Entre no painel para carregar as solicitações.
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


  renderizarAlteracoes() {
    const tbody = document.getElementById(
      "alteracoes-table-body"
    );
    const alteracoes = Array.isArray(this.alteracoes)
      ? this.alteracoes
      : [];
    const pendentes = alteracoes.filter((item) =>
      ["pendente", "em_analise"].includes(item.status)
    ).length;

    texto("alteracoes-total-count", alteracoes.length);
    texto("alteracoes-pendentes-count", pendentes);

    if (!API.chaveAdmin()) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Entre no painel para carregar as alterações.
          </td>
        </tr>
      `;
      return;
    }

    if (!alteracoes.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Nenhuma alteração solicitada pelas emissoras.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = alteracoes.map((item) => `
      <tr>
        <td>
          <strong>${escaparHtml(item.id)}</strong>
          <small>${escaparHtml(item.protocolo_original)}</small>
        </td>
        <td>
          <strong>${escaparHtml(item.nome_radio)}</strong>
          <small>${escaparHtml(item.email)}</small>
        </td>
        <td>${escaparHtml(item.cidade)}/${escaparHtml(item.estado)}</td>
        <td class="stream-url-cell">
          <small title="${escaparHtml(item.stream_url)}">
            ${escaparHtml(item.stream_url)}
          </small>
        </td>
        <td>${escaparHtml(this.formatarData(item.criado_em))}</td>
        <td>
          <span class="solicitacao-status solicitacao-status--${escaparHtml(item.status)}">
            ${escaparHtml(this.rotuloStatus(item.status))}
          </span>
        </td>
        <td class="actions-cell">
          <button type="button" class="table-button"
            onclick="SolicitacoesAdmin.abrirAlteracao('${escaparHtml(item.id)}')">
            Analisar
          </button>
        </td>
      </tr>
    `).join("");
  },

  async abrirAlteracao(id) {
    let alteracao = this.alteracoes.find(
      (item) => item.id === id
    );

    try {
      const resposta = await API.detalharAlteracao(id);
      if (resposta?.alteracao) {
        alteracao = resposta.alteracao;
      }
    } catch (erro) {
      console.warn("Detalhamento da alteração indisponível:", erro);
    }

    if (!alteracao) {
      alert("A solicitação de alteração não foi encontrada.");
      return;
    }

    this.alteracaoSelecionada = alteracao;
    this.preencherAlteracao();
    document
      .getElementById("alteracao-modal-backdrop")
      .classList.remove("hidden");
  },

  preencherAlteracao() {
    const item = this.alteracaoSelecionada;
    const anteriores = item.dados_anteriores || {};

    texto("alteracao-modal-title", `Analisar alteração de ${item.nome_radio}`);
    texto("alteracao-detalhe-id", item.id);
    texto("alteracao-detalhe-protocolo", item.protocolo_original);

    const campos = [
      ["Nome da rádio", "nome_radio", item.nome_radio],
      ["Cidade", "cidade", item.cidade],
      ["Estado", "estado", item.estado],
      ["Categoria", "categoria_principal", item.categoria_principal],
      ["Site", "site", item.site || ""],
      ["E-mail", "email", item.email],
      ["WhatsApp", "whatsapp", item.whatsapp],
      ["Descrição", "descricao", item.descricao || ""],
      ["Stream", "stream_url", item.stream_url]
    ];

    document.getElementById("alteracao-comparacao-body").innerHTML =
      campos.map(([rotulo, chave, novoValor]) => {
        const antigoValor = anteriores[chave] || "—";
        const novo = novoValor || "—";
        const alterado = String(antigoValor) !== String(novo);

        return `
          <tr>
            <td><strong>${escaparHtml(rotulo)}</strong></td>
            <td>${escaparHtml(antigoValor)}</td>
            <td class="${alterado ? "alteracao-valor-alterado" : ""}">
              ${escaparHtml(novo)}
            </td>
          </tr>
        `;
      }).join("");

    const logo = document.getElementById("alteracao-logo-proposta");

    if (item.logo_url) {
      logo.innerHTML = `
        <img src="${escaparHtml(item.logo_url)}"
          alt="Nova logomarca proposta">
        <div>
          <strong>Nova logomarca enviada</strong>
          <p>${escaparHtml(item.logo_largura || "?")} × ${escaparHtml(item.logo_altura || "?")} pixels</p>
        </div>
      `;
      logo.classList.remove("hidden");
    } else {
      logo.innerHTML = "";
      logo.classList.add("hidden");
    }

    document.getElementById("alteracao-observacao").value =
      item.observacao_analise || "";

    const finalizada = ["aprovada", "rejeitada"].includes(item.status);
    document.getElementById("alteracao-marcar-analise-button").disabled = finalizada;
    document.getElementById("alteracao-rejeitar-button").disabled = finalizada;
    document.getElementById("alteracao-aplicar-button").disabled = finalizada;
  },

  fecharAlteracao() {
    this.alteracaoSelecionada = null;
    document
      .getElementById("alteracao-modal-backdrop")
      .classList.add("hidden");
  },

  async atualizarStatusAlteracao(status) {
    const item = this.alteracaoSelecionada;
    if (!item) return;

    const observacao = document
      .getElementById("alteracao-observacao")
      .value
      .trim();

    if (status === "rejeitada" && !observacao) {
      alert("Informe o motivo da rejeição.");
      return;
    }

    if (!confirm(`Alterar para “${this.rotuloStatus(status)}”?`)) {
      return;
    }

    try {
      await API.atualizarAlteracao(item.id, {
        status,
        observacaoAnalise: observacao
      });
      this.fecharAlteracao();
      await this.carregar();
    } catch (erro) {
      alert(
        erro.message ||
        "Não foi possível atualizar a solicitação de alteração."
      );
    }
  },

  async garantirEmissorasCarregadas() {
    if (
      !EmissorasAdmin.eventosRegistrados ||
      !Array.isArray(EmissorasAdmin.emissoras)
    ) {
      await EmissorasAdmin.iniciar();
      return;
    }

    if (
      EmissorasAdmin.emissoras.length === 0 &&
      !localStorage.getItem(CONFIG.EMISSORAS_STORAGE_KEY)
    ) {
      await EmissorasAdmin.carregar();
    }
  },

  async aprovarEAplicarAlteracao() {
    const item = this.alteracaoSelecionada;
    if (!item) return;

    const observacao = document
      .getElementById("alteracao-observacao")
      .value
      .trim();

    if (!confirm(
      "Aprovar esta alteração e aplicá-la à emissora? A versão pública só mudará após uma nova publicação."
    )) {
      return;
    }

    try {
      await this.garantirEmissorasCarregadas();

      const emissora = EmissorasAdmin.emissoras.find(
        (radio) =>
          radio.origemSolicitacao?.protocolo ===
          item.protocolo_original
      );

      if (!emissora) {
        alert(
          "A emissora vinculada a este protocolo não foi encontrada. Importe ou localize a emissora antes de aprovar a alteração."
        );
        return;
      }

      const copiaAnterior = structuredClone(emissora);

      try {
        this.aplicarDadosAlteracao(emissora, item);
        EmissorasAdmin.salvarLocal();

        await API.atualizarAlteracao(item.id, {
          status: "aprovada",
          observacaoAnalise:
            observacao ||
            "Alteração aprovada e aplicada. Aguardando nova publicação oficial."
        });
      } catch (erro) {
        const indice = EmissorasAdmin.emissoras.findIndex(
          (radio) => radio.id === emissora.id
        );
        if (indice >= 0) {
          EmissorasAdmin.emissoras[indice] = copiaAnterior;
          EmissorasAdmin.salvarLocal();
        }
        throw erro;
      }

      this.fecharAlteracao();
      await this.carregar();
      window.location.hash = "#/emissoras";

      window.setTimeout(() => {
        EmissorasAdmin.abrirFormulario(emissora);
      }, 250);
    } catch (erro) {
      console.error("Falha ao aplicar alteração:", erro);
      alert(
        erro.message ||
        "Não foi possível aplicar a alteração na emissora."
      );
    }
  },

  aplicarDadosAlteracao(emissora, item) {
    emissora.nome = item.nome_radio;
    emissora.nomeFantasia = item.nome_radio;
    emissora.descricao = item.descricao || "";
    emissora.site = item.site || "";
    emissora.categoriaPrincipal = item.categoria_principal;
    emissora.categorias = [item.categoria_principal];

    emissora.localizacao = {
      ...(emissora.localizacao || {}),
      pais: emissora.localizacao?.pais || "Brasil",
      cidade: item.cidade,
      uf: item.estado
    };

    emissora.contato = {
      ...(emissora.contato || {}),
      email: item.email,
      whatsapp: item.whatsapp
    };

    if (item.logo_url) {
      if (
        emissora.logo &&
        typeof emissora.logo === "object"
      ) {
        emissora.logo = {
          ...emissora.logo,
          original: item.logo_url,
          quadrada: item.logo_url,
          miniatura: item.logo_url
        };
      } else {
        emissora.logo = item.logo_url;
      }
    }

    if (!Array.isArray(emissora.streams)) {
      emissora.streams = [];
    }

    let principal = emissora.streams.find(
      (stream) => stream.principal === true
    );

    if (!principal) {
      principal = emissora.streams[0];
    }

    if (!principal) {
      principal = {
        id: `stream-${Date.now()}`,
        nome: "Principal",
        principal: true,
        codec: "Não informado",
        bitrate: null
      };
      emissora.streams.push(principal);
    }

    principal.url = item.stream_url;
    principal.principal = true;
    principal.monitoramento = {
      status: "nao_testado",
      ultimaVerificacao: null,
      tempoRespostaMs: null
    };

    emissora.observacoes = [
      emissora.observacoes,
      `Alteração ${item.id} aprovada e aplicada.`
    ].filter(Boolean).join(" ");
    emissora.atualizadoEm = new Date().toISOString();
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
