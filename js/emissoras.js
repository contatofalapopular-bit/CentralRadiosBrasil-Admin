const EmissorasAdmin = {
  estadosBrasil: [
    { uf: "AC", nome: "Acre" },
    { uf: "AL", nome: "Alagoas" },
    { uf: "AP", nome: "Amapá" },
    { uf: "AM", nome: "Amazonas" },
    { uf: "BA", nome: "Bahia" },
    { uf: "CE", nome: "Ceará" },
    { uf: "DF", nome: "Distrito Federal" },
    { uf: "ES", nome: "Espírito Santo" },
    { uf: "GO", nome: "Goiás" },
    { uf: "MA", nome: "Maranhão" },
    { uf: "MT", nome: "Mato Grosso" },
    { uf: "MS", nome: "Mato Grosso do Sul" },
    { uf: "MG", nome: "Minas Gerais" },
    { uf: "PA", nome: "Pará" },
    { uf: "PB", nome: "Paraíba" },
    { uf: "PR", nome: "Paraná" },
    { uf: "PE", nome: "Pernambuco" },
    { uf: "PI", nome: "Piauí" },
    { uf: "RJ", nome: "Rio de Janeiro" },
    { uf: "RN", nome: "Rio Grande do Norte" },
    { uf: "RS", nome: "Rio Grande do Sul" },
    { uf: "RO", nome: "Rondônia" },
    { uf: "RR", nome: "Roraima" },
    { uf: "SC", nome: "Santa Catarina" },
    { uf: "SP", nome: "São Paulo" },
    { uf: "SE", nome: "Sergipe" },
    { uf: "TO", nome: "Tocantins" }
  ],

  statusCadastroPermitidos: [
    "cadastro_recebido",
    "em_analise",
    "aprovada",
    "aguardando_selo",
    "publicada",
    "suspensa",
    "rejeitada"
  ],

  emissoras: [],
  documentoOriginal: null,
  editandoId: null,
  eventosRegistrados: false,
  cidadesCache: [],
  streamsTemporarios: [],
  streamEditandoId: null,
  ultimoRelatorioValidacao: null,
  ultimoBancoOficial: null,
  ultimoBancoEsp32: null,

  async iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }

    await Promise.all([
      this.carregarEstadosFormulario(),
      this.carregarCategoriasFormulario(),
      this.carregarCidadesCache()
    ]);

    await this.carregar();
  },

  registrarEventos() {
    document.getElementById("emissora-search")
      .addEventListener("input", () => this.renderizar());

    document.getElementById("emissora-uf-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("emissora-type-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("emissora-status-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("new-emissora-button")
      .addEventListener("click", () => this.abrirFormulario());

    document.getElementById("export-emissoras-button")
      .addEventListener("click", () => this.exportar());

    document.getElementById("import-emissoras-input")
      .addEventListener("change", (evento) => this.importar(evento));

    document.getElementById("emissora-sort")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("discard-emissoras-draft-button")
      .addEventListener("click", () => this.descartarRascunho());

    document.getElementById("emissora-form")
      .addEventListener("submit", (evento) => this.salvar(evento));

    document.getElementById("cancel-emissora-form")
      .addEventListener("click", () => this.fecharFormulario());

    document.getElementById("emissora-state")
      .addEventListener("change", () => this.atualizarCidadesFormulario());

    document.getElementById("add-emissora-stream-button")
      .addEventListener("click", () => this.abrirStreamFormulario());

    document.getElementById("emissora-stream-form")
      .addEventListener("submit", (evento) => this.salvarStreamTemporario(evento));

    document.getElementById("cancel-emissora-stream-form")
      .addEventListener("click", () => this.fecharStreamFormulario());

    document.getElementById("emissora-stream-principal")
      .addEventListener("change", () => this.garantirPrincipalUnico());

    document.getElementById("emissora-modal-backdrop")
      .addEventListener("click", (evento) => {
        if (evento.target.id === "emissora-modal-backdrop") {
          this.fecharFormulario();
        }
      });

    document.getElementById("close-validation-modal")
      .addEventListener("click", () => this.fecharValidacao());

    document.getElementById("validation-modal-backdrop")
      .addEventListener("click", (evento) => {
        if (evento.target.id === "validation-modal-backdrop") {
          this.fecharValidacao();
        }
      });

    document.getElementById("download-official-json-button")
      .addEventListener("click", () => this.baixarBancoOficial());

    document.getElementById("download-esp32-json-button")
      .addEventListener("click", () => this.baixarBancoEsp32());

    document.getElementById("download-validation-report-button")
      .addEventListener("click", () => this.baixarRelatorioValidacao());
  },

  async carregar() {
    const salvo = localStorage.getItem(CONFIG.EMISSORAS_STORAGE_KEY);

    if (salvo) {
      const listaSalva = JSON.parse(salvo);
      this.emissoras = Array.isArray(listaSalva)
        ? listaSalva.map((radio) => this.normalizarEmissoraExistente(radio))
        : [];
      this.preencherFiltros();
      this.renderizar();
      this.atualizarAvisoRascunho();
      return;
    }

    try {
      this.documentoOriginal = await API.carregar("radios.json", true);
      const radios = Array.isArray(this.documentoOriginal)
        ? this.documentoOriginal
        : (this.documentoOriginal.radios || []);

      this.emissoras = radios.map((radio) =>
        this.normalizarEmissoraExistente(radio)
      );

      this.preencherFiltros();
      this.renderizar();
      this.atualizarAvisoRascunho();
    } catch (erro) {
      console.error(erro);
      this.emissoras = [];
      this.renderizar();
    }
  },

  normalizarEmissoraExistente(radio) {
    return {
      ...radio,
      id: radio.id || gerarSlug(radio.nome || "radio"),
      nome: radio.nome || "Sem nome",
      nomeFantasia: radio.nomeFantasia || radio.nome || "",
      razaoSocial: radio.razaoSocial || "",
      slogan: radio.slogan || "",
      tipo: this.normalizarTipo(radio.tipo || radio.modalidade || "Web"),
      frequencia: radio.frequencia || "",
      descricao: radio.descricao || "",
      categoriaPrincipal:
        radio.categoriaPrincipal ||
        radio.categorias?.[0] ||
        "Sem categoria",
      categorias: Array.isArray(radio.categorias)
        ? radio.categorias
        : [radio.categoriaPrincipal || "Sem categoria"],
      localizacao: {
        pais: radio.localizacao?.pais || radio.pais || "Brasil",
        uf: radio.localizacao?.uf || radio.uf || "",
        cidade: radio.localizacao?.cidade || radio.cidade || "",
        cep: radio.localizacao?.cep || radio.cep || "",
        endereco: radio.localizacao?.endereco || radio.endereco || "",
        latitude: radio.localizacao?.latitude ?? radio.latitude ?? "",
        longitude: radio.localizacao?.longitude ?? radio.longitude ?? ""
      },
      contato: {
        telefone: radio.contato?.telefone || radio.telefone || "",
        whatsapp: radio.contato?.whatsapp || radio.whatsapp || "",
        email: radio.contato?.email || radio.email || ""
      },
      redesSociais: {
        facebook: radio.redesSociais?.facebook || radio.facebook || "",
        instagram: radio.redesSociais?.instagram || radio.instagram || "",
        youtube: radio.redesSociais?.youtube || radio.youtube || ""
      },
      site: radio.site || "",
      ativa: radio.ativa !== false,
      verificada: radio.verificada === true,
      publica: radio.publica !== false,
      statusCadastro: this.normalizarStatusCadastro(
        radio.statusCadastro || radio.status?.cadastro || "publicada"
      ),
      observacoes: radio.observacoes || "",
      streams: Array.isArray(radio.streams) ? radio.streams : [],
      criadoEm: radio.criadoEm || new Date().toISOString(),
      atualizadoEm: radio.atualizadoEm || new Date().toISOString()
    };
  },

  normalizarTipo(valor) {
    const tipo = String(valor || "").trim().toUpperCase();
    if (tipo === "FM") return "FM";
    if (tipo === "AM") return "AM";
    return "Web";
  },

  normalizarStatusCadastro(valor, padrao = "publicada") {
    const status = String(valor || "").trim();
    return this.statusCadastroPermitidos.includes(status) ? status : padrao;
  },

  rotuloStatusCadastro(status) {
    const rotulos = {
      cadastro_recebido: "Cadastro recebido",
      em_analise: "Em análise",
      aprovada: "Aprovada",
      aguardando_selo: "Aguardando selo",
      publicada: "Publicada",
      suspensa: "Suspensa",
      rejeitada: "Rejeitada"
    };

    return rotulos[this.normalizarStatusCadastro(status)] || "Publicada";
  },

  async carregarEstadosFormulario() {
    const select = document.getElementById("emissora-state");
    const valorAtual = select.value;

    select.innerHTML = '<option value="">Selecione o estado</option>';

    this.estadosBrasil.forEach((estado) => {
      const option = document.createElement("option");
      option.value = estado.uf;
      option.textContent = `${estado.uf} — ${estado.nome}`;
      select.appendChild(option);
    });

    if (
      valorAtual &&
      this.estadosBrasil.some((estado) => estado.uf === valorAtual)
    ) {
      select.value = valorAtual;
    }
  },

  async carregarCategoriasFormulario() {
    const select = document.getElementById("emissora-category");
    let categorias = [];

    try {
      const documento = await API.carregar("categorias.json", true);
      const lista = Array.isArray(documento)
        ? documento
        : (documento.categorias || []);

      categorias = lista
        .filter((item) => item.ativa !== false)
        .map((item) => typeof item === "string" ? item : item.nome)
        .filter(Boolean);
    } catch {
      categorias = [
        "Notícias", "Popular", "Comunitária", "Gospel", "Católica",
        "Sertanejo", "Forró", "MPB", "Pop", "Rock", "Esportes",
        "Educativa", "Universitária", "Web Rádio", "Eclética"
      ];
    }

    select.innerHTML = '<option value="">Selecione a categoria</option>';

    [...new Set(categorias)]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .forEach((categoria) => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        select.appendChild(option);
      });
  },

  async carregarCidadesCache() {
    this.cidadesCache = [];

    const cache = localStorage.getItem(CONFIG.CIDADES_STORAGE_KEY);

    if (cache) {
      try {
        const documento = JSON.parse(cache);
        const lista = Array.isArray(documento)
          ? documento
          : (documento.cidades || []);

        if (lista.length) {
          this.cidadesCache = lista
            .map((cidade) => ({
              id: cidade.id,
              nome: cidade.nome,
              uf: String(cidade.uf || "").toUpperCase()
            }))
            .filter((cidade) => cidade.nome && cidade.uf);

          return;
        }
      } catch (erro) {
        console.warn("Cache de cidades inválido:", erro);
      }
    }

    try {
      const resposta = await fetch(CONFIG.IBGE_MUNICIPIOS_URL, {
        cache: "no-store"
      });

      if (!resposta.ok) {
        throw new Error(`IBGE respondeu com erro ${resposta.status}`);
      }

      const dados = await resposta.json();

      this.cidadesCache = dados
        .map((municipio) => {
          const uf =
            municipio.microrregiao?.mesorregiao?.UF ||
            municipio["regiao-imediata"]?.["regiao-intermediaria"]?.UF ||
            {};

          return {
            id: municipio.id,
            nome: municipio.nome,
            uf: String(uf.sigla || "").toUpperCase()
          };
        })
        .filter((cidade) => cidade.nome && cidade.uf);

      const documentoCache = {
        schemaVersion: "1.0.0",
        source: "IBGE - API de Localidades",
        generatedAt: new Date().toISOString(),
        total: this.cidadesCache.length,
        cidades: this.cidadesCache
      };

      localStorage.setItem(
        CONFIG.CIDADES_STORAGE_KEY,
        JSON.stringify(documentoCache)
      );
    } catch (erro) {
      console.error("Não foi possível carregar as cidades:", erro);
      this.cidadesCache = [];
    }
  },

  atualizarCidadesFormulario(cidadeSelecionada = "") {
    const uf = String(
      document.getElementById("emissora-state").value || ""
    ).toUpperCase();

    const select = document.getElementById("emissora-city");
    select.innerHTML = '<option value="">Selecione a cidade</option>';
    select.disabled = !uf;

    if (!uf) {
      return;
    }

    const cidadesDoEstado = this.cidadesCache
      .filter((cidade) => String(cidade.uf).toUpperCase() === uf)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    cidadesDoEstado.forEach((cidade) => {
      const option = document.createElement("option");
      option.value = cidade.nome;
      option.textContent = cidade.nome;
      select.appendChild(option);
    });

    if (cidadeSelecionada) {
      const existe = [...select.options].some(
        (option) => option.value === cidadeSelecionada
      );

      if (!existe) {
        const option = document.createElement("option");
        option.value = cidadeSelecionada;
        option.textContent = cidadeSelecionada;
        select.appendChild(option);
      }

      select.value = cidadeSelecionada;
    }
  },

  preencherFiltros() {
    const select = document.getElementById("emissora-uf-filter");
    const atual = select.value;

    const ufs = [...new Set(
      this.emissoras
        .map((item) => item.localizacao?.uf || "")
        .filter(Boolean)
    )].sort();

    select.innerHTML = '<option value="">Todos os estados</option>';

    ufs.forEach((uf) => {
      const option = document.createElement("option");
      option.value = uf;
      option.textContent = uf;
      select.appendChild(option);
    });

    if (ufs.includes(atual)) select.value = atual;
  },

  filtradas() {
    const busca = normalizar(document.getElementById("emissora-search").value);
    const uf = document.getElementById("emissora-uf-filter").value;
    const tipo = document.getElementById("emissora-type-filter").value;
    const status = document.getElementById("emissora-status-filter").value;

    const lista = this.emissoras.filter((emissora) => {
      const localizacao = emissora.localizacao || {};

      const correspondeBusca =
        !busca ||
        normalizar([
          emissora.nome,
          emissora.nomeFantasia,
          emissora.razaoSocial,
          emissora.slogan,
          localizacao.cidade,
          localizacao.uf,
          emissora.categoriaPrincipal,
          emissora.frequencia,
          emissora.slug,
          emissora.id
        ].join(" ")).includes(busca);

      const statusCadastro = this.normalizarStatusCadastro(
        emissora.statusCadastro
      );

      const correspondeStatus =
        !status ||
        (status === "ativa" && emissora.ativa !== false) ||
        (status === "inativa" && emissora.ativa === false) ||
        statusCadastro === status;

      return (
        correspondeBusca &&
        (!uf || localizacao.uf === uf) &&
        (!tipo || emissora.tipo === tipo) &&
        correspondeStatus
      );
    });

    const ordem = document.getElementById("emissora-sort").value;

    return lista.sort((a, b) => {
      const localA = a.localizacao || {};
      const localB = b.localizacao || {};

      if (ordem === "nome-desc") {
        return b.nome.localeCompare(a.nome, "pt-BR");
      }

      if (ordem === "cidade") {
        return String(localA.cidade || "").localeCompare(
          String(localB.cidade || ""),
          "pt-BR"
        );
      }

      if (ordem === "estado") {
        return String(localA.uf || "").localeCompare(
          String(localB.uf || ""),
          "pt-BR"
        ) || a.nome.localeCompare(b.nome, "pt-BR");
      }

      if (ordem === "atualizacao") {
        return new Date(b.atualizadoEm || 0) - new Date(a.atualizadoEm || 0);
      }

      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  },

  renderizar() {
    const tbody = document.getElementById("emissoras-table-body");
    const lista = this.filtradas();

    texto("emissoras-visible-count", lista.length);
    texto("emissoras-total-count", this.emissoras.length);
    texto("emissoras-fm-count", this.emissoras.filter((e) => e.tipo === "FM").length);
    texto("emissoras-am-count", this.emissoras.filter((e) => e.tipo === "AM").length);
    texto("emissoras-web-count", this.emissoras.filter((e) => e.tipo === "Web").length);
    texto("emissoras-active-count", this.emissoras.filter((e) => e.ativa !== false).length);
    texto("emissoras-verified-count", this.emissoras.filter((e) => e.verificada === true).length);

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            Nenhuma emissora encontrada.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((emissora) => {
      const localizacao = emissora.localizacao || {};
      const statusCadastro = this.normalizarStatusCadastro(
        emissora.statusCadastro
      );

      return `
        <tr>
          <td>
            <strong>${escaparHtml(emissora.nome)}</strong>
            <small>${escaparHtml(emissora.id)}</small>
          </td>
          <td>${escaparHtml(emissora.tipo)}</td>
          <td>${escaparHtml(emissora.frequencia || "—")}</td>
          <td>${escaparHtml(localizacao.cidade || "—")}</td>
          <td>${escaparHtml(localizacao.uf || "—")}</td>
          <td>${escaparHtml(emissora.categoriaPrincipal || "—")}</td>
          <td>${Array.isArray(emissora.streams) ? emissora.streams.length : 0}</td>
          <td>
            <span class="registration-status registration-status--${statusCadastro}">
              ${escaparHtml(this.rotuloStatusCadastro(statusCadastro))}
            </span>
            <small class="emissora-activity-status">
              ${emissora.ativa !== false ? "Ativa" : "Inativa"}
            </small>
          </td>
          <td class="actions-cell">
            <button class="table-button"
              onclick="EmissorasAdmin.editar('${escaparHtml(emissora.id)}')">
              Editar
            </button>
            <button class="table-button"
              onclick="EmissorasAdmin.clonar('${escaparHtml(emissora.id)}')">
              Clonar
            </button>
            <button class="table-button"
              onclick="EmissorasAdmin.alternar('${escaparHtml(emissora.id)}')">
              ${emissora.ativa !== false ? "Desativar" : "Ativar"}
            </button>
            <button class="table-button danger"
              onclick="EmissorasAdmin.excluir('${escaparHtml(emissora.id)}')">
              Excluir
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  abrirFormulario(emissora = null) {
    this.editandoId = emissora?.id || null;

    texto(
      "emissora-modal-title",
      emissora ? "Editar emissora" : "Nova emissora"
    );

    document.getElementById("emissora-form").reset();
    this.streamsTemporarios = structuredClone(emissora?.streams || []);
    this.streamEditandoId = null;
    this.renderizarStreamsTemporarios();
    document.getElementById("emissora-country").value = "Brasil";
    document.getElementById("emissora-active").checked = true;
    document.getElementById("emissora-public").checked = true;
    document.getElementById("emissora-status-cadastro").value =
      "cadastro_recebido";

    if (emissora) {
      const localizacao = emissora.localizacao || {};
      const contato = emissora.contato || {};
      const redes = emissora.redesSociais || {};

      document.getElementById("emissora-name").value = emissora.nome || "";
      document.getElementById("emissora-fantasy-name").value =
        emissora.nomeFantasia || "";
      document.getElementById("emissora-company-name").value =
        emissora.razaoSocial || "";
      document.getElementById("emissora-slogan").value = emissora.slogan || "";
      document.getElementById("emissora-type").value = emissora.tipo || "Web";
      document.getElementById("emissora-frequency").value =
        emissora.frequencia || "";
      document.getElementById("emissora-category").value =
        emissora.categoriaPrincipal || "";
      document.getElementById("emissora-description").value =
        emissora.descricao || "";

      const ufSalva = String(localizacao.uf || "").toUpperCase();

      if (
        ufSalva &&
        !this.estadosBrasil.some((estado) => estado.uf === ufSalva)
      ) {
        const option = document.createElement("option");
        option.value = ufSalva;
        option.textContent = ufSalva;
        document.getElementById("emissora-state").appendChild(option);
      }

      document.getElementById("emissora-state").value = ufSalva;
      this.atualizarCidadesFormulario(localizacao.cidade || "");
      document.getElementById("emissora-cep").value =
        localizacao.cep || "";
      document.getElementById("emissora-address").value =
        localizacao.endereco || "";
      document.getElementById("emissora-latitude").value =
        localizacao.latitude ?? "";
      document.getElementById("emissora-longitude").value =
        localizacao.longitude ?? "";

      document.getElementById("emissora-phone").value =
        contato.telefone || "";
      document.getElementById("emissora-whatsapp").value =
        contato.whatsapp || "";
      document.getElementById("emissora-email").value =
        contato.email || "";

      document.getElementById("emissora-site").value = emissora.site || "";
      document.getElementById("emissora-facebook").value =
        redes.facebook || "";
      document.getElementById("emissora-instagram").value =
        redes.instagram || "";
      document.getElementById("emissora-youtube").value =
        redes.youtube || "";
      document.getElementById("emissora-notes").value =
        emissora.observacoes || "";
      document.getElementById("emissora-status-cadastro").value =
        this.normalizarStatusCadastro(emissora.statusCadastro);

      document.getElementById("emissora-active").checked =
        emissora.ativa !== false;
      document.getElementById("emissora-verified").checked =
        emissora.verificada === true;
      document.getElementById("emissora-public").checked =
        emissora.publica !== false;
    } else {
      document.getElementById("emissora-state").value = "";
      this.atualizarCidadesFormulario();
    }

    document.getElementById("emissora-modal-backdrop")
      .classList.remove("hidden");

    document.getElementById("emissora-name").focus();
  },

  renderizarStreamsTemporarios() {
    const tbody = document.getElementById("emissora-streams-table-body");
    const contador = document.getElementById("emissora-streams-count");

    contador.textContent = this.streamsTemporarios.length;

    if (!this.streamsTemporarios.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Nenhum stream adicionado a esta emissora.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.streamsTemporarios.map((stream, indice) => {
      const status =
        stream.monitoramento?.status ||
        stream.status ||
        "nao_testado";

      return `
        <tr>
          <td>
            <strong>${escaparHtml(stream.nome || `Stream ${indice + 1}`)}</strong>
            ${stream.principal === true
              ? '<small class="primary-stream-label">Principal</small>'
              : ''}
          </td>
          <td class="stream-url-cell">
            <small title="${escaparHtml(stream.url || "")}">
              ${escaparHtml(stream.url || "—")}
            </small>
          </td>
          <td>${escaparHtml(stream.codec || "Não informado")}</td>
          <td>${stream.bitrate ? `${escaparHtml(stream.bitrate)} kbps` : "—"}</td>
          <td>
            <span class="stream-status ${escaparHtml(status)}">
              ${StreamsAdmin?.rotuloStatus
                ? StreamsAdmin.rotuloStatus(status)
                : status}
            </span>
          </td>
          <td>${stream.principal === true ? "✅ Sim" : "— Não"}</td>
          <td class="actions-cell">
            <button type="button" class="table-button"
              onclick="EmissorasAdmin.editarStreamTemporario('${escaparHtml(stream.id)}')">
              Editar
            </button>
            <button type="button" class="table-button danger"
              onclick="EmissorasAdmin.removerStreamTemporario('${escaparHtml(stream.id)}')">
              Remover
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  abrirStreamFormulario(stream = null) {
    this.streamEditandoId = stream?.id || null;

    texto(
      "emissora-stream-modal-title",
      stream ? "Editar stream" : "Adicionar stream"
    );

    document.getElementById("emissora-stream-form").reset();
    document.getElementById("emissora-stream-principal").checked =
      stream?.principal === true || this.streamsTemporarios.length === 0;

    if (stream) {
      document.getElementById("emissora-stream-name").value =
        stream.nome || "";
      document.getElementById("emissora-stream-url").value =
        stream.url || "";
      document.getElementById("emissora-stream-codec").value =
        stream.codec || "";
      document.getElementById("emissora-stream-bitrate").value =
        stream.bitrate || "";
    }

    document.getElementById("emissora-stream-modal-backdrop")
      .classList.remove("hidden");

    document.getElementById("emissora-stream-name").focus();
  },

  fecharStreamFormulario() {
    this.streamEditandoId = null;
    document.getElementById("emissora-stream-modal-backdrop")
      .classList.add("hidden");
  },

  editarStreamTemporario(id) {
    const stream = this.streamsTemporarios.find((item) => item.id === id);
    if (stream) this.abrirStreamFormulario(stream);
  },

  salvarStreamTemporario(evento) {
    evento.preventDefault();

    const nome =
      document.getElementById("emissora-stream-name").value.trim();
    const url =
      document.getElementById("emissora-stream-url").value.trim();
    const codec =
      document.getElementById("emissora-stream-codec").value.trim();
    const bitrateValor =
      document.getElementById("emissora-stream-bitrate").value.trim();
    const principal =
      document.getElementById("emissora-stream-principal").checked;

    if (!nome || !url) {
      alert("Informe o nome e a URL do stream.");
      return;
    }

    if (!validarUrlHttp(url)) {
      alert("A URL deve começar com http:// ou https://.");
      return;
    }

    const duplicado = this.streamsTemporarios.find((stream) => {
      if (stream.id === this.streamEditandoId) return false;
      return normalizar(stream.url) === normalizar(url);
    });

    if (duplicado) {
      alert("Este endereço de stream já foi adicionado.");
      return;
    }

    if (principal) {
      this.streamsTemporarios.forEach((stream) => {
        stream.principal = false;
      });
    }

    const anterior = this.streamEditandoId
      ? this.streamsTemporarios.find(
          (stream) => stream.id === this.streamEditandoId
        )
      : null;

    const atualizado = {
      ...(anterior || {}),
      id: anterior?.id || `stream-${Date.now()}`,
      nome,
      url,
      codec: codec || "Não informado",
      bitrate: bitrateValor ? Number(bitrateValor) : null,
      principal,
      monitoramento: {
        ...(anterior?.monitoramento || {}),
        status:
          anterior?.monitoramento?.status ||
          anterior?.status ||
          "nao_testado",
        ultimaVerificacao:
          anterior?.monitoramento?.ultimaVerificacao || null,
        tempoRespostaMs:
          anterior?.monitoramento?.tempoRespostaMs || null
      }
    };

    if (anterior) {
      const indice = this.streamsTemporarios.findIndex(
        (stream) => stream.id === anterior.id
      );
      this.streamsTemporarios[indice] = atualizado;
    } else {
      this.streamsTemporarios.push(atualizado);
    }

    this.garantirPrincipalExistente();
    this.renderizarStreamsTemporarios();
    this.fecharStreamFormulario();
  },

  removerStreamTemporario(id) {
    const stream = this.streamsTemporarios.find((item) => item.id === id);
    if (!stream) return;

    const confirmou = confirm(
      `Remover o stream "${stream.nome}" desta emissora?`
    );

    if (!confirmou) return;

    this.streamsTemporarios =
      this.streamsTemporarios.filter((item) => item.id !== id);

    this.garantirPrincipalExistente();
    this.renderizarStreamsTemporarios();
  },

  garantirPrincipalUnico() {
    if (!document.getElementById("emissora-stream-principal").checked) {
      return;
    }
  },

  garantirPrincipalExistente() {
    if (
      this.streamsTemporarios.length &&
      !this.streamsTemporarios.some((stream) => stream.principal === true)
    ) {
      this.streamsTemporarios[0].principal = true;
    }
  },

  fecharFormulario() {
    this.editandoId = null;
    this.streamsTemporarios = [];
    this.streamEditandoId = null;
    document.getElementById("emissora-modal-backdrop")
      .classList.add("hidden");
  },

  editar(id) {
    const emissora = this.emissoras.find((item) => item.id === id);
    if (emissora) this.abrirFormulario(emissora);
  },

  salvar(evento) {
    evento.preventDefault();

    const nome = document.getElementById("emissora-name").value.trim();
    const tipo = document.getElementById("emissora-type").value;
    const uf = document.getElementById("emissora-state").value;
    const cidade = document.getElementById("emissora-city").value;
    const categoria = document.getElementById("emissora-category").value;

    if (!nome || !tipo || !uf || !cidade || !categoria) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    const email = document.getElementById("emissora-email").value.trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Informe um e-mail válido.");
      return;
    }

    const camposUrl = [
      ["site", "emissora-site"],
      ["Facebook", "emissora-facebook"],
      ["Instagram", "emissora-instagram"],
      ["YouTube", "emissora-youtube"]
    ];

    for (const [rotulo, id] of camposUrl) {
      const valor = document.getElementById(id).value.trim();

      if (valor && !validarUrlHttp(valor)) {
        alert(`A URL de ${rotulo} não é válida.`);
        return;
      }
    }

    const duplicada = this.emissoras.find((emissora) => {
      if (emissora.id === this.editandoId) return false;

      return (
        normalizar(emissora.nome) === normalizar(nome) &&
        normalizar(emissora.localizacao?.cidade) === normalizar(cidade) &&
        emissora.localizacao?.uf === uf
      );
    });

    if (duplicada) {
      alert(`Já existe uma emissora chamada "${nome}" em ${cidade}/${uf}.`);
      return;
    }

    const anterior = this.editandoId
      ? this.emissoras.find((item) => item.id === this.editandoId)
      : null;

    const atualizado = {
      ...(anterior || {}),
      id: anterior?.id || `${gerarSlug(nome)}-${Date.now()}`,
      slug: anterior?.slug || gerarSlug(nome),
      nome,
      nomeFantasia:
        document.getElementById("emissora-fantasy-name").value.trim(),
      razaoSocial:
        document.getElementById("emissora-company-name").value.trim(),
      slogan:
        document.getElementById("emissora-slogan").value.trim(),
      tipo,
      frequencia:
        document.getElementById("emissora-frequency").value.trim(),
      categoriaPrincipal: categoria,
      categorias: [
        categoria
      ],
      descricao:
        document.getElementById("emissora-description").value.trim(),
      localizacao: {
        pais: "Brasil",
        uf,
        cidade,
        cep: document.getElementById("emissora-cep").value.trim(),
        endereco:
          document.getElementById("emissora-address").value.trim(),
        latitude:
          document.getElementById("emissora-latitude").value.trim(),
        longitude:
          document.getElementById("emissora-longitude").value.trim()
      },
      contato: {
        telefone:
          document.getElementById("emissora-phone").value.trim(),
        whatsapp:
          document.getElementById("emissora-whatsapp").value.trim(),
        email
      },
      site: document.getElementById("emissora-site").value.trim(),
      redesSociais: {
        facebook:
          document.getElementById("emissora-facebook").value.trim(),
        instagram:
          document.getElementById("emissora-instagram").value.trim(),
        youtube:
          document.getElementById("emissora-youtube").value.trim()
      },
      observacoes:
        document.getElementById("emissora-notes").value.trim(),
      statusCadastro: this.normalizarStatusCadastro(
        document.getElementById("emissora-status-cadastro").value,
        anterior ? "publicada" : "cadastro_recebido"
      ),
      ativa: document.getElementById("emissora-active").checked,
      verificada: document.getElementById("emissora-verified").checked,
      publica: document.getElementById("emissora-public").checked,
      streams: structuredClone(this.streamsTemporarios),
      criadoEm: anterior?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    if (anterior) {
      const indice = this.emissoras.findIndex(
        (item) => item.id === anterior.id
      );
      this.emissoras[indice] = atualizado;
    } else {
      this.emissoras.push(atualizado);
    }

    this.salvarLocal();
    this.preencherFiltros();
    this.fecharFormulario();
  },

  clonar(id) {
    const original = this.emissoras.find((item) => item.id === id);
    if (!original) return;

    const copia = structuredClone(original);
    const agora = Date.now();

    copia.id = `${gerarSlug(original.nome)}-copia-${agora}`;
    copia.slug = `${gerarSlug(original.nome)}-copia-${agora}`;
    copia.nome = `${original.nome} - Cópia`;
    copia.statusCadastro = "cadastro_recebido";
    copia.verificada = false;
    copia.publica = false;
    copia.criadoEm = new Date().toISOString();
    copia.atualizadoEm = new Date().toISOString();

    this.emissoras.push(copia);
    this.salvarLocal();
    this.preencherFiltros();

    alert("Emissora clonada. Edite a cópia antes de publicar.");
  },

  excluir(id) {
    const emissora = this.emissoras.find((item) => item.id === id);
    if (!emissora) return;

    const confirmou = confirm(
      `Excluir "${emissora.nome}" do rascunho local?\n\n` +
      "O arquivo publicado no GitHub não será alterado até você exportar e substituir radios.json."
    );

    if (!confirmou) return;

    this.emissoras = this.emissoras.filter((item) => item.id !== id);
    this.salvarLocal();
    this.preencherFiltros();
  },

  async importar(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";

    if (!arquivo) return;

    try {
      const documento = await lerArquivoJson(arquivo);
      const lista = Array.isArray(documento)
        ? documento
        : (documento.radios || documento.emissoras || []);

      if (!Array.isArray(lista)) {
        throw new Error("O arquivo não contém uma lista válida de emissoras.");
      }

      const normalizadas = lista.map((item) =>
        this.normalizarEmissoraExistente(item)
      );

      const confirmou = confirm(
        `Importar ${normalizadas.length} emissora(s)?\n\n` +
        "O rascunho local atual será substituído."
      );

      if (!confirmou) return;

      this.documentoOriginal = documento;
      this.emissoras = normalizadas;
      this.salvarLocal();
      this.preencherFiltros();

      alert("Banco de emissoras importado para o rascunho local.");
    } catch (erro) {
      alert(erro.message);
    }
  },

  alternar(id) {
    const emissora = this.emissoras.find((item) => item.id === id);
    if (!emissora) return;

    emissora.ativa = emissora.ativa === false;
    emissora.atualizadoEm = new Date().toISOString();
    this.salvarLocal();
  },

  salvarLocal() {
    localStorage.setItem(
      CONFIG.EMISSORAS_STORAGE_KEY,
      JSON.stringify(this.emissoras)
    );

    this.renderizar();
    this.atualizarAvisoRascunho();
  },

  atualizarAvisoRascunho() {
    const existe =
      localStorage.getItem(CONFIG.EMISSORAS_STORAGE_KEY) !== null;

    document.getElementById("emissoras-draft-banner")
      .classList.toggle("hidden", !existe);

    document.getElementById("discard-emissoras-draft-button").disabled =
      !existe;
  },

  descartarRascunho() {
    const confirmou = confirm(
      "Descartar as alterações locais das emissoras e recarregar radios.json?"
    );

    if (!confirmou) return;

    localStorage.removeItem(CONFIG.EMISSORAS_STORAGE_KEY);
    this.carregar();
  },

  exportar() {
    const resultado = this.validarBanco();

    this.ultimoRelatorioValidacao = resultado;
    this.ultimoBancoOficial = this.gerarBancoOficial(resultado);
    this.ultimoBancoEsp32 = this.gerarBancoEsp32(resultado);

    this.exibirValidacao(resultado);
  },

  validarBanco() {
    const erros = [];
    const avisos = [];
    const ids = new Map();
    const slugs = new Map();
    const urls = new Map();

    const emissorasPublicaveis = this.emissoras.filter(
      (emissora) =>
        emissora.ativa !== false &&
        emissora.publica !== false
    );

    this.emissoras.forEach((emissora, indice) => {
      const referencia =
        emissora.nome || emissora.id || `Registro ${indice + 1}`;
      const localizacao = emissora.localizacao || {};
      const streams = Array.isArray(emissora.streams)
        ? emissora.streams
        : [];

      if (!String(emissora.id || "").trim()) {
        erros.push({
          emissora: referencia,
          campo: "id",
          mensagem: "A emissora não possui um ID."
        });
      } else {
        const id = String(emissora.id).trim();

        if (ids.has(id)) {
          erros.push({
            emissora: referencia,
            campo: "id",
            mensagem:
              `ID duplicado com "${ids.get(id)}": ${id}`
          });
        } else {
          ids.set(id, referencia);
        }
      }

      if (!String(emissora.slug || "").trim()) {
        avisos.push({
          emissora: referencia,
          campo: "slug",
          mensagem: "O slug será gerado automaticamente."
        });
      } else {
        const slug = String(emissora.slug).trim();

        if (slugs.has(slug)) {
          erros.push({
            emissora: referencia,
            campo: "slug",
            mensagem:
              `Slug duplicado com "${slugs.get(slug)}": ${slug}`
          });
        } else {
          slugs.set(slug, referencia);
        }
      }

      if (!String(emissora.nome || "").trim()) {
        erros.push({
          emissora: referencia,
          campo: "nome",
          mensagem: "O nome da emissora é obrigatório."
        });
      }

      if (!String(localizacao.uf || "").trim()) {
        erros.push({
          emissora: referencia,
          campo: "estado",
          mensagem: "O estado é obrigatório."
        });
      }

      if (!String(localizacao.cidade || "").trim()) {
        erros.push({
          emissora: referencia,
          campo: "cidade",
          mensagem: "A cidade é obrigatória."
        });
      }

      if (!String(emissora.categoriaPrincipal || "").trim()) {
        erros.push({
          emissora: referencia,
          campo: "categoria",
          mensagem: "A categoria principal é obrigatória."
        });
      }

      if (
        emissora.ativa !== false &&
        emissora.publica !== false &&
        streams.length === 0
      ) {
        erros.push({
          emissora: referencia,
          campo: "streams",
          mensagem:
            "Uma emissora ativa e pública precisa ter pelo menos um stream."
        });
      }

      const principais = streams.filter(
        (stream) => stream.principal === true
      );

      if (streams.length && principais.length === 0) {
        erros.push({
          emissora: referencia,
          campo: "stream principal",
          mensagem: "Nenhum stream foi marcado como principal."
        });
      }

      if (principais.length > 1) {
        erros.push({
          emissora: referencia,
          campo: "stream principal",
          mensagem:
            "Mais de um stream foi marcado como principal."
        });
      }

      streams.forEach((stream, streamIndice) => {
        const nomeStream =
          stream.nome || `Stream ${streamIndice + 1}`;
        const url = String(stream.url || "").trim();

        if (!url) {
          erros.push({
            emissora: referencia,
            campo: nomeStream,
            mensagem: "O stream não possui URL."
          });
          return;
        }

        if (!validarUrlHttp(url)) {
          erros.push({
            emissora: referencia,
            campo: nomeStream,
            mensagem:
              "A URL do stream deve começar com http:// ou https://."
          });
        }

        if (urls.has(url)) {
          avisos.push({
            emissora: referencia,
            campo: nomeStream,
            mensagem:
              `A mesma URL também é usada por "${urls.get(url)}".`
          });
        } else {
          urls.set(url, referencia);
        }

        if (url.startsWith("http://")) {
          avisos.push({
            emissora: referencia,
            campo: nomeStream,
            mensagem:
              "O stream usa HTTP. HTTPS é preferível quando disponível."
          });
        }

        if (!String(stream.codec || "").trim()) {
          avisos.push({
            emissora: referencia,
            campo: nomeStream,
            mensagem: "Codec não informado."
          });
        }
      });

      if (
        emissora.tipo === "FM" &&
        !String(emissora.frequencia || "").trim()
      ) {
        avisos.push({
          emissora: referencia,
          campo: "frequência",
          mensagem: "Emissora FM sem frequência informada."
        });
      }

      if (
        emissora.tipo === "AM" &&
        !String(emissora.frequencia || "").trim()
      ) {
        avisos.push({
          emissora: referencia,
          campo: "frequência",
          mensagem: "Emissora AM sem frequência informada."
        });
      }

      if (!String(emissora.logo || "").trim()) {
        avisos.push({
          emissora: referencia,
          campo: "logotipo",
          mensagem: "Logotipo não informado."
        });
      }
    });

    return {
      valido: erros.length === 0,
      geradoEm: new Date().toISOString(),
      totalCadastradas: this.emissoras.length,
      totalPublicaveis: emissorasPublicaveis.length,
      totalErros: erros.length,
      totalAvisos: avisos.length,
      erros,
      avisos
    };
  },

  normalizarStreamOficial(stream, indice) {
    const url = String(stream.url || "").trim();
    const monitoramento = stream.monitoramento || {};

    return {
      id: stream.id || `stream-${indice + 1}`,
      nome: stream.nome || `Stream ${indice + 1}`,
      url,
      principal: stream.principal === true,
      protocolo: url.startsWith("https://")
        ? "HTTPS"
        : url.startsWith("http://")
          ? "HTTP"
          : "OUTRO",
      codec: String(stream.codec || "nao_informado").toLowerCase(),
      bitrate: stream.bitrate ? Number(stream.bitrate) : null,
      monitoramento: {
        status:
          monitoramento.status ||
          stream.status ||
          "nao_testado",
        ultimaVerificacao:
          monitoramento.ultimaVerificacao || null,
        tempoRespostaMs:
          monitoramento.tempoRespostaMs || null
      }
    };
  },

  normalizarEmissoraOficial(emissora) {
    const localizacao = emissora.localizacao || {};
    const contato = emissora.contato || {};
    const redes = emissora.redesSociais || {};
    const streams = Array.isArray(emissora.streams)
      ? emissora.streams.map(
          (stream, indice) =>
            this.normalizarStreamOficial(stream, indice)
        )
      : [];

    const principal =
      streams.find((stream) => stream.principal === true) ||
      streams[0] ||
      null;

    return {
      id: emissora.id,
      slug: emissora.slug || gerarSlug(emissora.nome),
      nome: emissora.nome,
      nomeFantasia: emissora.nomeFantasia || "",
      razaoSocial: emissora.razaoSocial || "",
      slogan: emissora.slogan || "",
      descricao: emissora.descricao || "",
      logo: emissora.logo || "",
      tipo: emissora.tipo || "Web",
      frequencia: emissora.frequencia || "",
      site: emissora.site || "",
      localizacao: {
        pais: localizacao.pais || "Brasil",
        uf: String(localizacao.uf || "").toUpperCase(),
        cidade: localizacao.cidade || "",
        cep: localizacao.cep || "",
        endereco: localizacao.endereco || "",
        latitude:
          localizacao.latitude === "" ||
          localizacao.latitude == null
            ? null
            : Number(localizacao.latitude),
        longitude:
          localizacao.longitude === "" ||
          localizacao.longitude == null
            ? null
            : Number(localizacao.longitude)
      },
      classificacao: {
        categoriaPrincipal:
          emissora.categoriaPrincipal || "",
        categorias: [
          ...new Set(
            Array.isArray(emissora.categorias)
              ? emissora.categorias.filter(Boolean)
              : [emissora.categoriaPrincipal].filter(Boolean)
          )
        ],
        idioma: emissora.idioma || "pt-BR",
        tags: Array.isArray(emissora.tags)
          ? emissora.tags
          : []
      },
      contato: {
        telefone: contato.telefone || "",
        whatsapp: contato.whatsapp || "",
        email: contato.email || ""
      },
      redesSociais: {
        facebook: redes.facebook || "",
        instagram: redes.instagram || "",
        youtube: redes.youtube || ""
      },
      statusCadastro: this.normalizarStatusCadastro(
        emissora.statusCadastro
      ),
      status: {
        ativa: emissora.ativa !== false,
        publica: emissora.publica !== false,
        verificada: emissora.verificada === true,
        destaque: emissora.destaque === true
      },
      streams,
      streamPrincipal: principal
        ? {
            id: principal.id,
            url: principal.url,
            codec: principal.codec,
            bitrate: principal.bitrate
          }
        : null,
      observacoes: emissora.observacoes || "",
      criadoEm: emissora.criadoEm || null,
      atualizadoEm: emissora.atualizadoEm || null
    };
  },

  gerarBancoOficial(resultado) {
    const radios = this.emissoras
      .filter(
        (emissora) =>
          emissora.ativa !== false &&
          emissora.publica !== false
      )
      .map((emissora) =>
        this.normalizarEmissoraOficial(emissora)
      )
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );

    const totalStreams = radios.reduce(
      (total, radio) => total + radio.streams.length,
      0
    );

    return {
      schemaVersion: CONFIG.RADIOS_SCHEMA_VERSION,
      catalogo: {
        nome: "Central Rádios Brasil",
        pais: "Brasil",
        idioma: "pt-BR",
        origem:
          `${CONFIG.GITHUB_OWNER}/${CONFIG.DADOS_REPO}`,
        geradoEm: resultado.geradoEm
      },
      totais: {
        emissoras: radios.length,
        streams: totalStreams,
        estados: new Set(
          radios.map((radio) => radio.localizacao.uf)
        ).size,
        cidades: new Set(
          radios.map(
            (radio) =>
              `${radio.localizacao.uf}:${radio.localizacao.cidade}`
          )
        ).size,
        categorias: new Set(
          radios.flatMap(
            (radio) =>
              radio.classificacao.categorias
          )
        ).size,
        verificadas: radios.filter(
          (radio) => radio.status.verificada
        ).length
      },
      validacao: {
        valido: resultado.valido,
        erros: resultado.totalErros,
        avisos: resultado.totalAvisos
      },
      radios
    };
  },

  gerarBancoEsp32(resultado) {
    const radios = this.emissoras
      .filter(
        (emissora) =>
          emissora.ativa !== false &&
          emissora.publica !== false
      )
     .map((emissora) => {
  const streams = Array.isArray(emissora.streams)
    ? emissora.streams
    : [];

  const principal =
    streams.find(
      (stream) => stream.principal === true
    ) ||
    streams[0] ||
    null;

  const enderecoStream = String(
    principal?.url || ""
  ).trim();

  if (!enderecoStream) {
    return null;
  }

  try {
    const urlStream = new URL(enderecoStream);
    const usaSsl = urlStream.protocol === "https:";

    const porta =
      Number(urlStream.port) ||
      (usaSsl ? 443 : 80);

    const caminho =
      `${urlStream.pathname || "/"}${urlStream.search || ""}`;

    return {
      id: emissora.id || "",
      nome: emissora.nome || "",
      cidade: emissora.localizacao?.cidade || "",
      estado: emissora.localizacao?.uf || "",
      categoria: emissora.categoriaPrincipal || "",
      host: urlStream.hostname,
      porta,
      caminho,
      ssl: usaSsl,
      ativa: emissora.ativa !== false
    };
  } catch (erro) {
    console.warn(
      `Stream inválido na emissora ${emissora.nome || emissora.id}:`,
      enderecoStream
    );

    return null;
  }
})
.filter(
  (radio) =>
    radio &&
    radio.nome &&
    radio.host &&
    radio.porta > 0
)
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );

    return {
      schemaVersion: CONFIG.ESP32_SCHEMA_VERSION,
      geradoEm: resultado.geradoEm,
      total: radios.length,
      radios
    };
  },

  exibirValidacao(resultado) {
    texto(
      "validation-status-title",
      resultado.valido
        ? "Banco pronto para exportação"
        : "Foram encontrados erros"
    );

    texto(
      "validation-summary",
      `${resultado.totalCadastradas} cadastrada(s), ` +
      `${resultado.totalPublicaveis} publicável(is), ` +
      `${resultado.totalErros} erro(s) e ` +
      `${resultado.totalAvisos} aviso(s).`
    );

    texto("validation-errors-count", resultado.totalErros);
    texto("validation-warnings-count", resultado.totalAvisos);
    texto(
      "validation-public-count",
      resultado.totalPublicaveis
    );

    const listaErros =
      document.getElementById("validation-errors-list");
    const listaAvisos =
      document.getElementById("validation-warnings-list");

    listaErros.innerHTML = resultado.erros.length
      ? resultado.erros.map((item) => `
          <li>
            <strong>${escaparHtml(item.emissora)}</strong>
            <span>${escaparHtml(item.campo)} — ${escaparHtml(item.mensagem)}</span>
          </li>
        `).join("")
      : '<li class="validation-ok">Nenhum erro encontrado.</li>';

    listaAvisos.innerHTML = resultado.avisos.length
      ? resultado.avisos.map((item) => `
          <li>
            <strong>${escaparHtml(item.emissora)}</strong>
            <span>${escaparHtml(item.campo)} — ${escaparHtml(item.mensagem)}</span>
          </li>
        `).join("")
      : '<li class="validation-ok">Nenhum aviso encontrado.</li>';

    document.getElementById(
      "download-official-json-button"
    ).disabled = !resultado.valido;

    document.getElementById(
      "download-esp32-json-button"
    ).disabled = !resultado.valido;

    const statusBadge =
      document.getElementById("validation-status-badge");

    statusBadge.className =
      `status-badge ${resultado.valido ? "success" : "error"}`;

    statusBadge.textContent =
      resultado.valido ? "Validação aprovada" : "Correções necessárias";

    document.getElementById("validation-modal-backdrop")
      .classList.remove("hidden");
  },

  fecharValidacao() {
    document.getElementById("validation-modal-backdrop")
      .classList.add("hidden");
  },

  baixarBancoOficial() {
    if (
      !this.ultimoRelatorioValidacao?.valido ||
      !this.ultimoBancoOficial
    ) {
      alert("Corrija os erros antes de gerar o banco oficial.");
      return;
    }

    baixarJson("radios.json", this.ultimoBancoOficial);
  },

  baixarBancoEsp32() {
    if (
      !this.ultimoRelatorioValidacao?.valido ||
      !this.ultimoBancoEsp32
    ) {
      alert("Corrija os erros antes de gerar o banco para o ESP32.");
      return;
    }

    baixarJson("radios-esp32.json", this.ultimoBancoEsp32);
  },

  baixarRelatorioValidacao() {
    if (!this.ultimoRelatorioValidacao) {
      alert("Execute a validação primeiro.");
      return;
    }

    baixarJson(
      "relatorio-validacao-radios.json",
      this.ultimoRelatorioValidacao
    );
  }
};

