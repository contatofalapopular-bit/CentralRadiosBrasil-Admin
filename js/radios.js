const RadiosAdmin = {
  radiosOriginais: [],
  radiosTrabalho: [],
  documentoOriginal: null,
  radioEditandoId: null,
  audioTeste: null,
  timeoutTeste: null,
  eventosRegistrados: false,

  async iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }

    await this.carregar();
  },

  registrarEventos() {
    document.getElementById("radio-search")
      .addEventListener("input", () => this.renderizar());

    document.getElementById("radio-uf-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("radio-category-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("radio-status-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("new-radio-button")
      .addEventListener("click", () => this.abrirFormulario());

    document.getElementById("export-radios-button")
      .addEventListener("click", () => this.exportar());

    document.getElementById("import-radios-input")
      .addEventListener("change", (evento) => this.importar(evento));

    document.getElementById("discard-draft-button")
      .addEventListener("click", () => this.descartarRascunho());

    document.getElementById("radio-form")
      .addEventListener("submit", (evento) => this.salvar(evento));

    document.getElementById("cancel-radio-form")
      .addEventListener("click", () => this.fecharFormulario());

    document.getElementById("test-form-stream-button")
      .addEventListener("click", () => {
        const url = document.getElementById("radio-stream").value.trim();
        this.testarStream(url, "form-stream-result");
      });

    document.getElementById("stop-form-stream-button")
      .addEventListener("click", () => this.pararTeste("form-stream-result"));

    document.getElementById("radio-modal-backdrop")
      .addEventListener("click", (evento) => {
        if (evento.target.id === "radio-modal-backdrop") {
          this.fecharFormulario();
        }
      });
  },

  async carregar() {
    this.estado("loading", "Carregando rádios");

    try {
      this.documentoOriginal = await API.carregar("radios.json", true);
      this.radiosOriginais = this.extrairLista(this.documentoOriginal);

      const rascunho = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
      this.radiosTrabalho = rascunho
        ? JSON.parse(rascunho)
        : structuredClone(this.radiosOriginais);

      this.atualizarFiltros();
      this.renderizar();
      this.atualizarAvisoRascunho();
      this.estado("success", "Catálogo carregado");
    } catch (erro) {
      console.error(erro);
      this.estado("error", "Erro ao carregar rádios");

      document.getElementById("radios-table-body").innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            Não foi possível carregar radios.json.<br>
            <small>${escaparHtml(erro.message)}</small>
          </td>
        </tr>
      `;
    }
  },

  extrairLista(documento) {
    if (Array.isArray(documento)) return documento;
    if (Array.isArray(documento?.radios)) return documento.radios;
    return [];
  },

  estado(tipo, mensagem) {
    const badge = document.getElementById("radios-status-badge");
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  },

  atualizarFiltros() {
    this.preencherFiltro(
      "radio-uf-filter",
      "Todos os estados",
      this.radiosTrabalho.map((radio) =>
        String(radio.localizacao?.uf ?? radio.uf ?? "").toUpperCase()
      )
    );

    this.preencherFiltro(
      "radio-category-filter",
      "Todas as categorias",
      this.radiosTrabalho.flatMap((radio) => {
        const valores = [];
        if (radio.categoriaPrincipal) valores.push(radio.categoriaPrincipal);
        if (Array.isArray(radio.categorias)) valores.push(...radio.categorias);
        return valores;
      })
    );
  },

  preencherFiltro(id, rotuloPadrao, valores) {
    const select = document.getElementById(id);
    const valorAtual = select.value;

    const unicos = [...new Set(
      valores
        .map((valor) => String(valor || "").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));

    select.innerHTML = `<option value="">${rotuloPadrao}</option>`;

    unicos.forEach((valor) => {
      const option = document.createElement("option");
      option.value = valor;
      option.textContent = valor;
      select.appendChild(option);
    });

    if (unicos.includes(valorAtual)) select.value = valorAtual;
  },

  radiosFiltradas() {
    const busca = normalizar(document.getElementById("radio-search").value);
    const ufFiltro = document.getElementById("radio-uf-filter").value;
    const categoriaFiltro = document.getElementById("radio-category-filter").value;
    const statusFiltro = document.getElementById("radio-status-filter").value;

    return this.radiosTrabalho.filter((radio) => {
      const cidade = radio.localizacao?.cidade ?? radio.cidade ?? "";
      const uf = String(radio.localizacao?.uf ?? radio.uf ?? "").toUpperCase();
      const categorias = [
        radio.categoriaPrincipal,
        ...(Array.isArray(radio.categorias) ? radio.categorias : [])
      ].filter(Boolean);

      const stream = radio.streams?.[0] ?? {};
      const status =
        stream.monitoramento?.status ??
        stream.status ??
        radio.status ??
        "nao_testado";

      const textoPesquisa = normalizar([
        radio.nome,
        cidade,
        uf,
        categorias.join(" "),
        radio.site,
        stream.url
      ].join(" "));

      return (
        (!busca || textoPesquisa.includes(busca)) &&
        (!ufFiltro || uf === ufFiltro) &&
        (!categoriaFiltro || categorias.includes(categoriaFiltro)) &&
        (!statusFiltro || status === statusFiltro)
      );
    });
  },

  renderizar() {
    const tbody = document.getElementById("radios-table-body");
    const radios = this.radiosFiltradas();

    texto("radios-visible-count", radios.length);
    texto("radios-total-count", this.radiosTrabalho.length);

    if (!radios.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            Nenhuma rádio encontrada com os filtros informados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = radios.map((radio) => {
      const localizacao = radio.localizacao || {};
      const stream = radio.streams?.[0] || {};
      const status =
        stream.monitoramento?.status ??
        stream.status ??
        radio.status ??
        "nao_testado";

      const statusTexto = {
        online: "Online",
        offline: "Offline",
        nao_testado: "Não testado",
        testando: "Testando"
      }[status] || status;

      const categoria =
        radio.categoriaPrincipal ??
        radio.categorias?.[0] ??
        "—";

      return `
        <tr>
          <td>
            <div class="radio-name-cell">
              ${
                radio.logo
                  ? `<img src="${escaparHtml(radio.logo)}" alt=""
                       onerror="this.style.display='none'">`
                  : `<span class="radio-placeholder">📻</span>`
              }
              <div>
                <strong>${escaparHtml(radio.nome || "Sem nome")}</strong>
                <small>${escaparHtml(radio.id || "")}</small>
              </div>
            </div>
          </td>

          <td>${escaparHtml(localizacao.cidade ?? radio.cidade ?? "—")}</td>
          <td>${escaparHtml(localizacao.uf ?? radio.uf ?? "—")}</td>
          <td>${escaparHtml(categoria)}</td>

          <td>
            <span class="stream-status ${escaparHtml(status)}">
              ${escaparHtml(statusTexto)}
            </span>
          </td>

          <td>${radio.verificada === true ? "✅ Sim" : "— Não"}</td>

          <td class="stream-url-cell">
            <small title="${escaparHtml(stream.url || "")}">
              ${escaparHtml(stream.url || "—")}
            </small>
          </td>

          <td class="actions-cell">
            <button class="table-button"
              onclick="RadiosAdmin.testarRadio('${escaparHtml(radio.id)}')">
              ▶ Testar
            </button>

            <button class="table-button"
              onclick="RadiosAdmin.editar('${escaparHtml(radio.id)}')">
              Editar
            </button>

            <button class="table-button danger"
              onclick="RadiosAdmin.excluir('${escaparHtml(radio.id)}')">
              Excluir
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  abrirFormulario(radio = null) {
    this.pararTeste("form-stream-result");
    this.radioEditandoId = radio?.id ?? null;

    texto(
      "radio-modal-title",
      radio ? "Editar rádio" : "Cadastrar nova rádio"
    );

    const form = document.getElementById("radio-form");
    form.reset();

    if (radio) {
      const localizacao = radio.localizacao || {};
      const stream = radio.streams?.[0] || {};

      document.getElementById("radio-name").value = radio.nome ?? "";
      document.getElementById("radio-city").value =
        localizacao.cidade ?? radio.cidade ?? "";
      document.getElementById("radio-state").value =
        localizacao.uf ?? radio.uf ?? "";
      document.getElementById("radio-category").value =
        radio.categoriaPrincipal ?? radio.categorias?.[0] ?? "";
      document.getElementById("radio-extra-categories").value =
        (radio.categorias || [])
          .filter((categoria) => categoria !== radio.categoriaPrincipal)
          .join(", ");
      document.getElementById("radio-stream").value = stream.url ?? "";
      document.getElementById("radio-site").value = radio.site ?? "";
      document.getElementById("radio-logo").value = radio.logo ?? "";
      document.getElementById("radio-instagram").value =
        radio.redesSociais?.instagram ?? radio.instagram ?? "";
      document.getElementById("radio-facebook").value =
        radio.redesSociais?.facebook ?? radio.facebook ?? "";
      document.getElementById("radio-whatsapp").value =
        radio.contato?.whatsapp ?? radio.whatsapp ?? "";
      document.getElementById("radio-description").value =
        radio.descricao ?? "";
      document.getElementById("radio-verified").checked =
        radio.verificada === true;
      document.getElementById("radio-active").checked =
        radio.ativa !== false;
    } else {
      document.getElementById("radio-active").checked = true;
    }

    document.getElementById("radio-modal-backdrop")
      .classList.remove("hidden");

    document.getElementById("radio-name").focus();
  },

  fecharFormulario() {
    this.pararTeste("form-stream-result");
    document.getElementById("radio-modal-backdrop").classList.add("hidden");
    this.radioEditandoId = null;
  },

  editar(id) {
    const radio = this.radiosTrabalho.find((item) => item.id === id);
    if (radio) this.abrirFormulario(radio);
  },

  salvar(evento) {
    evento.preventDefault();

    const nome = document.getElementById("radio-name").value.trim();
    const cidade = document.getElementById("radio-city").value.trim();
    const uf = document.getElementById("radio-state").value.trim().toUpperCase();
    const categoriaPrincipal =
      document.getElementById("radio-category").value.trim();
    const categoriasExtras =
      document.getElementById("radio-extra-categories").value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const streamUrl = document.getElementById("radio-stream").value.trim();
    const site = document.getElementById("radio-site").value.trim();
    const logo = document.getElementById("radio-logo").value.trim();
    const instagram = document.getElementById("radio-instagram").value.trim();
    const facebook = document.getElementById("radio-facebook").value.trim();
    const whatsapp = document.getElementById("radio-whatsapp").value.trim();
    const descricao = document.getElementById("radio-description").value.trim();
    const verificada = document.getElementById("radio-verified").checked;
    const ativa = document.getElementById("radio-active").checked;

    if (!nome || !cidade || !uf || !categoriaPrincipal || !streamUrl) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (uf.length !== 2) {
      alert("O estado deve ser informado com duas letras, por exemplo: GO.");
      return;
    }

    if (!validarUrlHttp(streamUrl)) {
      alert("A URL do stream deve começar com http:// ou https://.");
      return;
    }

    for (const [rotulo, url] of [
      ["site", site],
      ["logotipo", logo],
      ["Instagram", instagram],
      ["Facebook", facebook]
    ]) {
      if (url && !validarUrlHttp(url)) {
        alert(`A URL de ${rotulo} não é válida.`);
        return;
      }
    }

    const radioAnterior = this.radioEditandoId
      ? this.radiosTrabalho.find((item) => item.id === this.radioEditandoId)
      : null;

    const categorias = [...new Set([
      categoriaPrincipal,
      ...categoriasExtras
    ])];

    const streamAnterior = radioAnterior?.streams?.[0] || {};

    const radioAtualizado = {
      ...(radioAnterior || {}),
      id: radioAnterior?.id ?? criarIdRadio(nome),
      slug: radioAnterior?.slug ?? gerarSlug(nome),
      nome,
      descricao,
      categoriaPrincipal,
      categorias,
      localizacao: { cidade, uf },
      site,
      logo,
      redesSociais: {
        ...(radioAnterior?.redesSociais || {}),
        instagram,
        facebook
      },
      contato: {
        ...(radioAnterior?.contato || {}),
        whatsapp
      },
      verificada,
      ativa,
      streams: [{
        ...streamAnterior,
        id: streamAnterior.id ?? `${gerarSlug(nome)}-principal`,
        nome: streamAnterior.nome ?? "Principal",
        url: streamUrl,
        principal: true,
        monitoramento: {
          ...(streamAnterior.monitoramento || {}),
          status:
            streamAnterior.monitoramento?.status ??
            streamAnterior.status ??
            "nao_testado",
          ultimaVerificacao:
            streamAnterior.monitoramento?.ultimaVerificacao ?? null
        }
      }],
      atualizadoEm: new Date().toISOString()
    };

    if (radioAnterior) {
      const indice = this.radiosTrabalho.findIndex(
        (item) => item.id === radioAnterior.id
      );
      this.radiosTrabalho[indice] = radioAtualizado;
    } else {
      this.radiosTrabalho.push(radioAtualizado);
    }

    this.salvarRascunho();
    this.atualizarFiltros();
    this.renderizar();
    this.fecharFormulario();
  },

  excluir(id) {
    const radio = this.radiosTrabalho.find((item) => item.id === id);
    if (!radio) return;

    const confirmou = confirm(
      `Excluir "${radio.nome}" do rascunho local?\n\n` +
      "O arquivo publicado no GitHub ainda não será alterado."
    );

    if (!confirmou) return;

    this.radiosTrabalho = this.radiosTrabalho.filter(
      (item) => item.id !== id
    );

    this.salvarRascunho();
    this.atualizarFiltros();
    this.renderizar();
  },

  testarRadio(id) {
    const radio = this.radiosTrabalho.find((item) => item.id === id);
    const url = radio?.streams?.[0]?.url;

    if (!url) {
      alert("Esta rádio não possui um stream principal cadastrado.");
      return;
    }

    this.testarStream(url);
  },

  testarStream(url, resultadoId = null) {
    this.pararTeste(resultadoId);

    if (!validarUrlHttp(url)) {
      this.mostrarResultadoTeste(
        resultadoId,
        "error",
        "Informe uma URL de stream válida."
      );
      return;
    }

    this.mostrarResultadoTeste(
      resultadoId,
      "loading",
      "Tentando reproduzir o stream…"
    );

    const audio = new Audio();
    this.audioTeste = audio;
    audio.preload = "none";
    audio.src = url;
    audio.volume = 0.35;

    const sucesso = () => {
      clearTimeout(this.timeoutTeste);
      this.mostrarResultadoTeste(
        resultadoId,
        "success",
        "Stream reproduzindo. Clique em parar quando terminar o teste."
      );
    };

    const falha = () => {
      clearTimeout(this.timeoutTeste);
      this.pararAudioInterno();
      this.mostrarResultadoTeste(
        resultadoId,
        "error",
        "O navegador não conseguiu reproduzir este stream. Isso pode ser falha do link, formato incompatível ou bloqueio do servidor."
      );
    };

    audio.addEventListener("playing", sucesso, { once: true });
    audio.addEventListener("error", falha, { once: true });
    audio.addEventListener("stalled", falha, { once: true });

    this.timeoutTeste = setTimeout(falha, 12000);

    audio.play().catch(falha);
  },

  pararTeste(resultadoId = null) {
    clearTimeout(this.timeoutTeste);
    this.pararAudioInterno();

    if (resultadoId) {
      this.mostrarResultadoTeste(
        resultadoId,
        "neutral",
        "Teste parado."
      );
    }
  },

  pararAudioInterno() {
    if (!this.audioTeste) return;

    try {
      this.audioTeste.pause();
      this.audioTeste.removeAttribute("src");
      this.audioTeste.load();
    } catch {
      // Sem ação.
    }

    this.audioTeste = null;
  },

  mostrarResultadoTeste(id, tipo, mensagem) {
    if (!id) {
      if (tipo === "success") {
        alert("O stream começou a reproduzir. Para interromper, abra outra rádio ou recarregue a página.");
      } else if (tipo === "error") {
        alert(mensagem);
      }
      return;
    }

    const elemento = document.getElementById(id);
    elemento.className = `stream-test-result ${tipo}`;
    elemento.textContent = mensagem;
  },

  salvarRascunho() {
    localStorage.setItem(
      CONFIG.LOCAL_STORAGE_KEY,
      JSON.stringify(this.radiosTrabalho)
    );

    this.atualizarAvisoRascunho();
  },

  atualizarAvisoRascunho() {
    const temRascunho =
      localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY) !== null;

    document.getElementById("draft-banner")
      .classList.toggle("hidden", !temRascunho);

    document.getElementById("discard-draft-button").disabled =
      !temRascunho;
  },

  descartarRascunho() {
    const confirmou = confirm(
      "Descartar todas as alterações locais e recarregar os dados publicados no GitHub?"
    );

    if (!confirmou) return;

    localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
    this.radiosTrabalho = structuredClone(this.radiosOriginais);
    this.atualizarFiltros();
    this.renderizar();
    this.atualizarAvisoRascunho();
  },

  async importar(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";

    if (!arquivo) return;

    try {
      const documento = await lerArquivoJson(arquivo);
      const lista = this.extrairLista(documento);

      if (!lista.length && !Array.isArray(documento)) {
        throw new Error("O JSON não possui uma lista radios válida.");
      }

      const confirmou = confirm(
        `Importar ${lista.length} rádio(s) para o rascunho local?\n\n` +
        "Isso substituirá o rascunho atual."
      );

      if (!confirmou) return;

      this.documentoOriginal = documento;
      this.radiosTrabalho = structuredClone(lista);
      this.salvarRascunho();
      this.atualizarFiltros();
      this.renderizar();

      alert("Arquivo importado para o rascunho local.");
    } catch (erro) {
      alert(erro.message);
    }
  },

  exportar() {
    const documento = Array.isArray(this.documentoOriginal)
      ? this.radiosTrabalho
      : {
          ...(this.documentoOriginal || {}),
          schemaVersion:
            this.documentoOriginal?.schemaVersion ?? "1.0.0",
          generatedAt: new Date().toISOString(),
          total: this.radiosTrabalho.length,
          radios: this.radiosTrabalho
        };

    baixarJson("radios.json", documento);
  }
};
