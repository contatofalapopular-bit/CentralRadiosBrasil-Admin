const RadiosAdmin = {
  radiosOriginais: [],
  radiosTrabalho: [],
  documentoOriginal: null,
  radioEditandoId: null,

  async iniciar() {
    this.registrarEventos();
    await this.carregar();
  },

  registrarEventos() {
    document.getElementById("radio-search").addEventListener("input", () => this.renderizar());
    document.getElementById("radio-uf-filter").addEventListener("change", () => this.renderizar());
    document.getElementById("radio-status-filter").addEventListener("change", () => this.renderizar());
    document.getElementById("new-radio-button").addEventListener("click", () => this.abrirFormulario());
    document.getElementById("export-radios-button").addEventListener("click", () => this.exportar());
    document.getElementById("discard-draft-button").addEventListener("click", () => this.descartarRascunho());
    document.getElementById("radio-form").addEventListener("submit", (evento) => this.salvar(evento));
    document.getElementById("cancel-radio-form").addEventListener("click", () => this.fecharFormulario());
    document.getElementById("radio-modal-backdrop").addEventListener("click", (evento) => {
      if (evento.target.id === "radio-modal-backdrop") this.fecharFormulario();
    });
  },

  async carregar() {
    this.estado("loading", "Carregando rádios");

    try {
      this.documentoOriginal = await API.carregar("radios.json", true);
      this.radiosOriginais = Array.isArray(this.documentoOriginal)
        ? this.documentoOriginal
        : (this.documentoOriginal.radios || []);

      const rascunho = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
      this.radiosTrabalho = rascunho
        ? JSON.parse(rascunho)
        : structuredClone(this.radiosOriginais);

      this.preencherFiltroEstados();
      this.renderizar();
      this.atualizarAvisoRascunho();
      this.estado("success", "Catálogo carregado");
    } catch (erro) {
      console.error(erro);
      this.estado("error", "Erro ao carregar rádios");
      document.getElementById("radios-table-body").innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Não foi possível carregar radios.json.<br>
            <small>${escaparHtml(erro.message)}</small>
          </td>
        </tr>
      `;
    }
  },

  estado(tipo, mensagem) {
    const badge = document.getElementById("radios-status-badge");
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  },

  preencherFiltroEstados() {
    const select = document.getElementById("radio-uf-filter");
    const estados = [...new Set(
      this.radiosTrabalho
        .map((radio) => radio.localizacao?.uf ?? radio.uf ?? "")
        .filter(Boolean)
        .map((uf) => String(uf).toUpperCase())
    )].sort();

    select.innerHTML = '<option value="">Todos os estados</option>';
    estados.forEach((uf) => {
      const option = document.createElement("option");
      option.value = uf;
      option.textContent = uf;
      select.appendChild(option);
    });
  },

  radiosFiltradas() {
    const busca = normalizar(document.getElementById("radio-search").value);
    const uf = document.getElementById("radio-uf-filter").value;
    const status = document.getElementById("radio-status-filter").value;

    return this.radiosTrabalho.filter((radio) => {
      const cidade = radio.localizacao?.cidade ?? radio.cidade ?? "";
      const estado = String(radio.localizacao?.uf ?? radio.uf ?? "").toUpperCase();
      const categoria = radio.categoriaPrincipal ?? (radio.categorias || []).join(" ");
      const nome = radio.nome ?? "";
      const stream = radio.streams?.[0] ?? {};
      const streamStatus =
        stream.monitoramento?.status ??
        stream.status ??
        radio.status ??
        "nao_testado";

      const correspondeBusca =
        !busca ||
        normalizar(`${nome} ${cidade} ${estado} ${categoria}`).includes(busca);

      return correspondeBusca &&
        (!uf || estado === uf) &&
        (!status || streamStatus === status);
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
          <td colspan="7" class="empty-state">
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
        nao_testado: "Não testado"
      }[status] || status;

      return `
        <tr>
          <td>
            <div class="radio-name-cell">
              ${radio.logo
                ? `<img src="${escaparHtml(radio.logo)}" alt="" onerror="this.style.display='none'">`
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
          <td>${escaparHtml(radio.categoriaPrincipal ?? radio.categorias?.[0] ?? "—")}</td>
          <td><span class="stream-status ${escaparHtml(status)}">${escaparHtml(statusTexto)}</span></td>
          <td>${radio.verificada === true ? "✅ Sim" : "— Não"}</td>
          <td class="actions-cell">
            <button class="table-button" onclick="RadiosAdmin.editar('${escaparHtml(radio.id)}')">Editar</button>
            <button class="table-button danger" onclick="RadiosAdmin.excluir('${escaparHtml(radio.id)}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join("");
  },

  abrirFormulario(radio = null) {
    this.radioEditandoId = radio?.id ?? null;
    texto("radio-modal-title", radio ? "Editar rádio" : "Cadastrar nova rádio");

    const form = document.getElementById("radio-form");
    form.reset();

    if (radio) {
      document.getElementById("radio-name").value = radio.nome ?? "";
      document.getElementById("radio-city").value = radio.localizacao?.cidade ?? radio.cidade ?? "";
      document.getElementById("radio-state").value = radio.localizacao?.uf ?? radio.uf ?? "";
      document.getElementById("radio-category").value =
        radio.categoriaPrincipal ?? radio.categorias?.[0] ?? "";
      document.getElementById("radio-stream").value = radio.streams?.[0]?.url ?? "";
      document.getElementById("radio-site").value = radio.site ?? "";
      document.getElementById("radio-logo").value = radio.logo ?? "";
      document.getElementById("radio-verified").checked = radio.verificada === true;
    }

    document.getElementById("radio-modal-backdrop").classList.remove("hidden");
    document.getElementById("radio-name").focus();
  },

  fecharFormulario() {
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
    const categoria = document.getElementById("radio-category").value.trim();
    const streamUrl = document.getElementById("radio-stream").value.trim();
    const site = document.getElementById("radio-site").value.trim();
    const logo = document.getElementById("radio-logo").value.trim();
    const verificada = document.getElementById("radio-verified").checked;

    if (!nome || !cidade || !uf || !categoria || !streamUrl) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    const radioAnterior = this.radioEditandoId
      ? this.radiosTrabalho.find((item) => item.id === this.radioEditandoId)
      : null;

    const novoRadio = {
      ...(radioAnterior || {}),
      id: radioAnterior?.id ?? criarIdRadio(nome),
      nome,
      categoriaPrincipal: categoria,
      categorias: [categoria],
      localizacao: { cidade, uf },
      site,
      logo,
      verificada,
      streams: [{
        ...(radioAnterior?.streams?.[0] || {}),
        url: streamUrl,
        principal: true,
        monitoramento: {
          ...(radioAnterior?.streams?.[0]?.monitoramento || {}),
          status:
            radioAnterior?.streams?.[0]?.monitoramento?.status ??
            radioAnterior?.streams?.[0]?.status ??
            "nao_testado"
        }
      }],
      atualizadoEm: new Date().toISOString()
    };

    if (radioAnterior) {
      const indice = this.radiosTrabalho.findIndex(
        (item) => item.id === radioAnterior.id
      );
      this.radiosTrabalho[indice] = novoRadio;
    } else {
      this.radiosTrabalho.push(novoRadio);
    }

    this.salvarRascunho();
    this.preencherFiltroEstados();
    this.renderizar();
    this.fecharFormulario();
  },

  excluir(id) {
    const radio = this.radiosTrabalho.find((item) => item.id === id);
    if (!radio) return;

    const confirmou = confirm(
      `Excluir "${radio.nome}" do rascunho local?\n\nO arquivo publicado no GitHub ainda não será alterado.`
    );

    if (!confirmou) return;

    this.radiosTrabalho = this.radiosTrabalho.filter((item) => item.id !== id);
    this.salvarRascunho();
    this.preencherFiltroEstados();
    this.renderizar();
  },

  salvarRascunho() {
    localStorage.setItem(
      CONFIG.LOCAL_STORAGE_KEY,
      JSON.stringify(this.radiosTrabalho)
    );
    this.atualizarAvisoRascunho();
  },

  atualizarAvisoRascunho() {
    const temRascunho = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY) !== null;
    document.getElementById("draft-banner").classList.toggle("hidden", !temRascunho);
    document.getElementById("discard-draft-button").disabled = !temRascunho;
  },

  descartarRascunho() {
    const confirmou = confirm(
      "Descartar todas as alterações locais e recarregar os dados publicados no GitHub?"
    );

    if (!confirmou) return;

    localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
    this.radiosTrabalho = structuredClone(this.radiosOriginais);
    this.preencherFiltroEstados();
    this.renderizar();
    this.atualizarAvisoRascunho();
  },

  exportar() {
    const documento = Array.isArray(this.documentoOriginal)
      ? this.radiosTrabalho
      : {
          ...this.documentoOriginal,
          schemaVersion: this.documentoOriginal?.schemaVersion ?? "1.0.0",
          generatedAt: new Date().toISOString(),
          radios: this.radiosTrabalho
        };

    baixarJson("radios.json", documento);
  }
};
