const EmissorasAdmin = {
  emissoras: [],
  eventosRegistrados: false,

  async iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }

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

    document.getElementById("cancel-emissora-form")
      .addEventListener("click", () => this.fecharFormulario());

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
      return;
    }

    try {
      const documento = await API.carregar("radios.json", true);
      const radios = Array.isArray(documento)
        ? documento
        : (documento.radios || []);

      this.emissoras = radios.map((radio) => ({
        id: radio.id || gerarSlug(radio.nome || "radio"),
        nome: radio.nome || "Sem nome",
        tipo: radio.tipo || radio.modalidade || "Web",
        frequencia: radio.frequencia || "",
        cidade: radio.localizacao?.cidade || radio.cidade || "",
        uf: radio.localizacao?.uf || radio.uf || "",
        categoria:
          radio.categoriaPrincipal ||
          radio.categorias?.[0] ||
          "Sem categoria",
        ativa: radio.ativa !== false,
        verificada: radio.verificada === true,
        streams: Array.isArray(radio.streams) ? radio.streams.length : 0
      }));

      this.preencherFiltros();
      this.renderizar();
    } catch (erro) {
      console.error(erro);
      this.emissoras = [];
      this.renderizar();
    }
  },

  preencherFiltros() {
    const select = document.getElementById("emissora-uf-filter");
    const atual = select.value;

    const ufs = [...new Set(
      this.emissoras.map((item) => item.uf).filter(Boolean)
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
      const correspondeBusca =
        !busca ||
        normalizar(
          `${emissora.nome} ${emissora.cidade} ${emissora.uf} ${emissora.categoria} ${emissora.frequencia}`
        ).includes(busca);

      const correspondeStatus =
        !status ||
        (status === "ativa" && emissora.ativa !== false) ||
        (status === "inativa" && emissora.ativa === false);

      return (
        correspondeBusca &&
        (!uf || emissora.uf === uf) &&
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

    tbody.innerHTML = lista.map((emissora) => `
      <tr>
        <td>
          <strong>${escaparHtml(emissora.nome)}</strong>
          <small>${escaparHtml(emissora.id)}</small>
        </td>
        <td>${escaparHtml(emissora.tipo)}</td>
        <td>${escaparHtml(emissora.frequencia || "—")}</td>
        <td>${escaparHtml(emissora.cidade || "—")}</td>
        <td>${escaparHtml(emissora.uf || "—")}</td>
        <td>${escaparHtml(emissora.categoria || "—")}</td>
        <td>${emissora.streams ?? 0}</td>
        <td>
          <span class="state-status ${emissora.ativa !== false ? "active" : "inactive"}">
            ${emissora.ativa !== false ? "Ativa" : "Inativa"}
          </span>
        </td>
        <td class="actions-cell">
          <button class="table-button" disabled title="Disponível no Commit 12.2">
            Editar
          </button>
          <button class="table-button" disabled title="Disponível no Commit 12.4">
            Streams
          </button>
        </td>
      </tr>
    `).join("");
  },

  abrirFormulario() {
    document.getElementById("emissora-form").reset();
    document.getElementById("emissora-active").checked = true;
    document.getElementById("emissora-modal-backdrop")
      .classList.remove("hidden");
    document.getElementById("emissora-name").focus();
  },

  fecharFormulario() {
    document.getElementById("emissora-modal-backdrop")
      .classList.add("hidden");
  }
};
