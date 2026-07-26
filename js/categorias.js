const CategoriasAdmin = {
  categoriasPadrao: [
    { id: "noticias", nome: "Notícias", descricao: "Jornalismo, informação e atualidades.", ativa: true },
    { id: "popular", nome: "Popular", descricao: "Programação musical e comunicativa popular.", ativa: true },
    { id: "comunitaria", nome: "Comunitária", descricao: "Emissoras comunitárias e locais.", ativa: true },
    { id: "gospel", nome: "Gospel", descricao: "Música e conteúdo evangélico.", ativa: true },
    { id: "catolica", nome: "Católica", descricao: "Conteúdo religioso católico.", ativa: true },
    { id: "sertanejo", nome: "Sertanejo", descricao: "Música sertaneja e variedades.", ativa: true },
    { id: "forro", nome: "Forró", descricao: "Forró e ritmos nordestinos.", ativa: true },
    { id: "mpb", nome: "MPB", descricao: "Música Popular Brasileira.", ativa: true },
    { id: "pop", nome: "Pop", descricao: "Música pop nacional e internacional.", ativa: true },
    { id: "rock", nome: "Rock", descricao: "Rock e estilos relacionados.", ativa: true },
    { id: "pagode", nome: "Pagode", descricao: "Pagode e samba.", ativa: true },
    { id: "esportes", nome: "Esportes", descricao: "Cobertura esportiva e futebol.", ativa: true },
    { id: "flashback", nome: "Flashback", descricao: "Sucessos de décadas passadas.", ativa: true },
    { id: "eletronica", nome: "Eletrônica", descricao: "Música eletrônica e dance.", ativa: true },
    { id: "universitaria", nome: "Universitária", descricao: "Emissoras ligadas a universidades.", ativa: true },
    { id: "educativa", nome: "Educativa", descricao: "Conteúdo educativo e cultural.", ativa: true },
    { id: "infantil", nome: "Infantil", descricao: "Conteúdo para o público infantil.", ativa: true },
    { id: "web-radio", nome: "Web Rádio", descricao: "Emissoras exclusivamente on-line.", ativa: true },
    { id: "ecletica", nome: "Eclética", descricao: "Programação musical variada.", ativa: true }
  ],

  categorias: [],
  editandoId: null,
  eventosRegistrados: false,

  iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }

    const salvo = localStorage.getItem(CONFIG.CATEGORIAS_STORAGE_KEY);
    this.categorias = salvo
      ? JSON.parse(salvo)
      : structuredClone(this.categoriasPadrao);

    this.renderizar();
  },

  registrarEventos() {
    document.getElementById("categoria-search")
      .addEventListener("input", () => this.renderizar());

    document.getElementById("categoria-status-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("new-category-button")
      .addEventListener("click", () => this.abrirFormulario());

    document.getElementById("export-categorias-button")
      .addEventListener("click", () => this.exportar());

    document.getElementById("reset-categorias-button")
      .addEventListener("click", () => this.restaurar());

    document.getElementById("categoria-form")
      .addEventListener("submit", (evento) => this.salvar(evento));

    document.getElementById("cancel-categoria-form")
      .addEventListener("click", () => this.fecharFormulario());

    document.getElementById("categoria-modal-backdrop")
      .addEventListener("click", (evento) => {
        if (evento.target.id === "categoria-modal-backdrop") {
          this.fecharFormulario();
        }
      });
  },

  filtradas() {
    const busca = normalizar(document.getElementById("categoria-search").value);
    const status = document.getElementById("categoria-status-filter").value;

    return this.categorias.filter((categoria) => {
      const correspondeBusca =
        !busca ||
        normalizar(`${categoria.nome} ${categoria.descricao} ${categoria.id}`)
          .includes(busca);

      const correspondeStatus =
        !status ||
        (status === "ativa" && categoria.ativa !== false) ||
        (status === "inativa" && categoria.ativa === false);

      return correspondeBusca && correspondeStatus;
    });
  },

  renderizar() {
    const tbody = document.getElementById("categorias-table-body");
    const lista = this.filtradas();

    texto("categorias-visible-count", lista.length);
    texto("categorias-total-count", this.categorias.length);
    texto(
      "categorias-active-count",
      this.categorias.filter((categoria) => categoria.ativa !== false).length
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            Nenhuma categoria encontrada.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((categoria) => `
      <tr>
        <td><strong>${escaparHtml(categoria.nome)}</strong></td>
        <td><code>${escaparHtml(categoria.id)}</code></td>
        <td>${escaparHtml(categoria.descricao || "—")}</td>
        <td>
          <span class="state-status ${categoria.ativa !== false ? "active" : "inactive"}">
            ${categoria.ativa !== false ? "Ativa" : "Inativa"}
          </span>
        </td>
        <td class="actions-cell">
          <button class="table-button"
            onclick="CategoriasAdmin.editar('${escaparHtml(categoria.id)}')">
            Editar
          </button>
          <button class="table-button"
            onclick="CategoriasAdmin.alternar('${escaparHtml(categoria.id)}')">
            ${categoria.ativa !== false ? "Desativar" : "Ativar"}
          </button>
          <button class="table-button danger"
            onclick="CategoriasAdmin.excluir('${escaparHtml(categoria.id)}')">
            Excluir
          </button>
        </td>
      </tr>
    `).join("");
  },

  abrirFormulario(categoria = null) {
    this.editandoId = categoria?.id ?? null;

    texto(
      "categoria-modal-title",
      categoria ? "Editar categoria" : "Nova categoria"
    );

    document.getElementById("categoria-form").reset();

    if (categoria) {
      document.getElementById("categoria-name").value = categoria.nome ?? "";
      document.getElementById("categoria-description").value =
        categoria.descricao ?? "";
      document.getElementById("categoria-active").checked =
        categoria.ativa !== false;
    } else {
      document.getElementById("categoria-active").checked = true;
    }

    document.getElementById("categoria-modal-backdrop")
      .classList.remove("hidden");

    document.getElementById("categoria-name").focus();
  },

  fecharFormulario() {
    this.editandoId = null;
    document.getElementById("categoria-modal-backdrop")
      .classList.add("hidden");
  },

  editar(id) {
    const categoria = this.categorias.find((item) => item.id === id);
    if (categoria) this.abrirFormulario(categoria);
  },

  salvar(evento) {
    evento.preventDefault();

    const nome = document.getElementById("categoria-name").value.trim();
    const descricao =
      document.getElementById("categoria-description").value.trim();
    const ativa = document.getElementById("categoria-active").checked;

    if (!nome) {
      alert("Informe o nome da categoria.");
      return;
    }

    const idGerado = gerarSlug(nome);

    const duplicada = this.categorias.find((categoria) => {
      if (categoria.id === this.editandoId) return false;
      return normalizar(categoria.nome) === normalizar(nome);
    });

    if (duplicada) {
      alert(`A categoria "${nome}" já existe.`);
      return;
    }

    if (this.editandoId) {
      const indice = this.categorias.findIndex(
        (categoria) => categoria.id === this.editandoId
      );

      this.categorias[indice] = {
        ...this.categorias[indice],
        nome,
        descricao,
        ativa
      };
    } else {
      this.categorias.push({
        id: idGerado,
        nome,
        descricao,
        ativa
      });
    }

    this.salvarLocal();
    this.fecharFormulario();
  },

  alternar(id) {
    const categoria = this.categorias.find((item) => item.id === id);
    if (!categoria) return;

    categoria.ativa = categoria.ativa === false;
    this.salvarLocal();
  },

  excluir(id) {
    const categoria = this.categorias.find((item) => item.id === id);
    if (!categoria) return;

    const confirmou = confirm(
      `Excluir a categoria "${categoria.nome}" do rascunho local?`
    );

    if (!confirmou) return;

    this.categorias = this.categorias.filter((item) => item.id !== id);
    this.salvarLocal();
  },

  salvarLocal() {
    this.categorias.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    localStorage.setItem(
      CONFIG.CATEGORIAS_STORAGE_KEY,
      JSON.stringify(this.categorias)
    );

    this.renderizar();
  },

  restaurar() {
    const confirmou = confirm(
      "Restaurar a lista oficial inicial de categorias?"
    );

    if (!confirmou) return;

    this.categorias = structuredClone(this.categoriasPadrao);
    localStorage.removeItem(CONFIG.CATEGORIAS_STORAGE_KEY);
    this.renderizar();
  },

  exportar() {
    baixarJson("categorias.json", {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      total: this.categorias.length,
      categorias: this.categorias
    });
  }
};
