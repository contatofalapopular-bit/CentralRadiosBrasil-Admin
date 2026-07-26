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

  emissoras: [],
  documentoOriginal: null,
  editandoId: null,
  eventosRegistrados: false,
  cidadesCache: [],
  streamsTemporarios: [],
  streamEditandoId: null,

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
  },

  async carregar() {
    const salvo = localStorage.getItem(CONFIG.EMISSORAS_STORAGE_KEY);

    if (salvo) {
      this.emissoras = JSON.parse(salvo);
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

      const correspondeStatus =
        !status ||
        (status === "ativa" && emissora.ativa !== false) ||
        (status === "inativa" && emissora.ativa === false);

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
            <span class="state-status ${emissora.ativa !== false ? "active" : "inactive"}">
              ${emissora.ativa !== false ? "Ativa" : "Inativa"}
            </span>
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
    copia.verificada = false;
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
    baixarJson("radios.json", {
      schemaVersion: "2.0.0",
      generatedAt: new Date().toISOString(),
      total: this.emissoras.length,
      radios: this.emissoras
    });
  }
};
