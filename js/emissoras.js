const EmissorasAdmin = {
  emissoras: [],
  documentoOriginal: null,
  editandoId: null,
  eventosRegistrados: false,
  cidadesCache: [],

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

    document.getElementById("discard-emissoras-draft-button")
      .addEventListener("click", () => this.descartarRascunho());

    document.getElementById("emissora-form")
      .addEventListener("submit", (evento) => this.salvar(evento));

    document.getElementById("cancel-emissora-form")
      .addEventListener("click", () => this.fecharFormulario());

    document.getElementById("emissora-state")
      .addEventListener("change", () => this.atualizarCidadesFormulario());

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
    const estados = window.EstadosAdmin?.estadosPadrao || [];

    select.innerHTML = '<option value="">Selecione o estado</option>';

    estados.forEach((estado) => {
      const option = document.createElement("option");
      option.value = estado.uf;
      option.textContent = `${estado.uf} — ${estado.nome}`;
      select.appendChild(option);
    });
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
    const cache = localStorage.getItem(CONFIG.CIDADES_STORAGE_KEY);

    if (cache) {
      try {
        this.cidadesCache = JSON.parse(cache).cidades || [];
        return;
      } catch {}
    }

    try {
      const resposta = await fetch(CONFIG.IBGE_MUNICIPIOS_URL);
      if (!resposta.ok) return;

      const dados = await resposta.json();

      this.cidadesCache = dados.map((municipio) => {
        const uf =
          municipio.microrregiao?.mesorregiao?.UF ||
          municipio["regiao-imediata"]?.["regiao-intermediaria"]?.UF ||
          {};

        return {
          id: municipio.id,
          nome: municipio.nome,
          uf: uf.sigla || ""
        };
      });
    } catch {
      this.cidadesCache = [];
    }
  },

  atualizarCidadesFormulario(cidadeSelecionada = "") {
    const uf = document.getElementById("emissora-state").value;
    const select = document.getElementById("emissora-city");

    select.innerHTML = '<option value="">Selecione a cidade</option>';

    this.cidadesCache
      .filter((cidade) => cidade.uf === uf)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .forEach((cidade) => {
        const option = document.createElement("option");
        option.value = cidade.nome;
        option.textContent = cidade.nome;
        select.appendChild(option);
      });

    if (cidadeSelecionada) {
      const existe = [...select.options]
        .some((option) => option.value === cidadeSelecionada);

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

    return this.emissoras.filter((emissora) => {
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
          emissora.frequencia
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
  },

  renderizar() {
    const tbody = document.getElementById("emissoras-table-body");
    const lista = this.filtradas();

    texto("emissoras-visible-count", lista.length);
    texto("emissoras-total-count", this.emissoras.length);

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
              onclick="EmissorasAdmin.alternar('${escaparHtml(emissora.id)}')">
              ${emissora.ativa !== false ? "Desativar" : "Ativar"}
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

      document.getElementById("emissora-state").value =
        localizacao.uf || "";
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
      this.atualizarCidadesFormulario();
    }

    document.getElementById("emissora-modal-backdrop")
      .classList.remove("hidden");

    document.getElementById("emissora-name").focus();
  },

  fecharFormulario() {
    this.editandoId = null;
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
      streams: anterior?.streams || [],
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
