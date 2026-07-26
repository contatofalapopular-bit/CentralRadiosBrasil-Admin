const EstadosAdmin = {
  estadosPadrao: [
    { uf: "AC", nome: "Acre", regiao: "Norte", ativa: true },
    { uf: "AL", nome: "Alagoas", regiao: "Nordeste", ativa: true },
    { uf: "AP", nome: "Amapá", regiao: "Norte", ativa: true },
    { uf: "AM", nome: "Amazonas", regiao: "Norte", ativa: true },
    { uf: "BA", nome: "Bahia", regiao: "Nordeste", ativa: true },
    { uf: "CE", nome: "Ceará", regiao: "Nordeste", ativa: true },
    { uf: "DF", nome: "Distrito Federal", regiao: "Centro-Oeste", ativa: true },
    { uf: "ES", nome: "Espírito Santo", regiao: "Sudeste", ativa: true },
    { uf: "GO", nome: "Goiás", regiao: "Centro-Oeste", ativa: true },
    { uf: "MA", nome: "Maranhão", regiao: "Nordeste", ativa: true },
    { uf: "MT", nome: "Mato Grosso", regiao: "Centro-Oeste", ativa: true },
    { uf: "MS", nome: "Mato Grosso do Sul", regiao: "Centro-Oeste", ativa: true },
    { uf: "MG", nome: "Minas Gerais", regiao: "Sudeste", ativa: true },
    { uf: "PA", nome: "Pará", regiao: "Norte", ativa: true },
    { uf: "PB", nome: "Paraíba", regiao: "Nordeste", ativa: true },
    { uf: "PR", nome: "Paraná", regiao: "Sul", ativa: true },
    { uf: "PE", nome: "Pernambuco", regiao: "Nordeste", ativa: true },
    { uf: "PI", nome: "Piauí", regiao: "Nordeste", ativa: true },
    { uf: "RJ", nome: "Rio de Janeiro", regiao: "Sudeste", ativa: true },
    { uf: "RN", nome: "Rio Grande do Norte", regiao: "Nordeste", ativa: true },
    { uf: "RS", nome: "Rio Grande do Sul", regiao: "Sul", ativa: true },
    { uf: "RO", nome: "Rondônia", regiao: "Norte", ativa: true },
    { uf: "RR", nome: "Roraima", regiao: "Norte", ativa: true },
    { uf: "SC", nome: "Santa Catarina", regiao: "Sul", ativa: true },
    { uf: "SP", nome: "São Paulo", regiao: "Sudeste", ativa: true },
    { uf: "SE", nome: "Sergipe", regiao: "Nordeste", ativa: true },
    { uf: "TO", nome: "Tocantins", regiao: "Norte", ativa: true }
  ],

  estados: [],
  eventosRegistrados: false,

  iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }

    const salvo = localStorage.getItem(CONFIG.ESTADOS_STORAGE_KEY);
    this.estados = salvo ? JSON.parse(salvo) : structuredClone(this.estadosPadrao);
    this.renderizar();
  },

  registrarEventos() {
    document.getElementById("estado-search")
      .addEventListener("input", () => this.renderizar());

    document.getElementById("estado-region-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("export-estados-button")
      .addEventListener("click", () => this.exportar());

    document.getElementById("reset-estados-button")
      .addEventListener("click", () => this.restaurar());
  },

  filtrados() {
    const busca = normalizar(document.getElementById("estado-search").value);
    const regiao = document.getElementById("estado-region-filter").value;

    return this.estados.filter((estado) => {
      const correspondeBusca =
        !busca ||
        normalizar(`${estado.uf} ${estado.nome} ${estado.regiao}`).includes(busca);

      return correspondeBusca && (!regiao || estado.regiao === regiao);
    });
  },

  renderizar() {
    const tbody = document.getElementById("estados-table-body");
    const lista = this.filtrados();

    texto("estados-visible-count", lista.length);
    texto("estados-total-count", this.estados.length);
    texto("estados-active-count", this.estados.filter((e) => e.ativa !== false).length);

    tbody.innerHTML = lista.map((estado) => `
      <tr>
        <td><strong>${escaparHtml(estado.uf)}</strong></td>
        <td>${escaparHtml(estado.nome)}</td>
        <td>${escaparHtml(estado.regiao)}</td>
        <td>
          <span class="state-status ${estado.ativa !== false ? "active" : "inactive"}">
            ${estado.ativa !== false ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td class="actions-cell">
          <button class="table-button"
            onclick="EstadosAdmin.editar('${escaparHtml(estado.uf)}')">
            Editar
          </button>
          <button class="table-button"
            onclick="EstadosAdmin.alternar('${escaparHtml(estado.uf)}')">
            ${estado.ativa !== false ? "Desativar" : "Ativar"}
          </button>
        </td>
      </tr>
    `).join("");
  },

  editar(uf) {
    const estado = this.estados.find((item) => item.uf === uf);
    if (!estado) return;

    const novoNome = prompt("Nome do estado:", estado.nome);
    if (novoNome === null) return;

    const novaRegiao = prompt(
      "Região: Norte, Nordeste, Centro-Oeste, Sudeste ou Sul",
      estado.regiao
    );

    if (novaRegiao === null) return;

    const regioesValidas = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

    if (!novoNome.trim() || !regioesValidas.includes(novaRegiao.trim())) {
      alert("Nome ou região inválidos.");
      return;
    }

    estado.nome = novoNome.trim();
    estado.regiao = novaRegiao.trim();
    this.salvar();
  },

  alternar(uf) {
    const estado = this.estados.find((item) => item.uf === uf);
    if (!estado) return;

    estado.ativa = estado.ativa === false;
    this.salvar();
  },

  salvar() {
    localStorage.setItem(
      CONFIG.ESTADOS_STORAGE_KEY,
      JSON.stringify(this.estados)
    );
    this.renderizar();
  },

  restaurar() {
    const confirmou = confirm(
      "Restaurar a lista oficial dos 26 estados e do Distrito Federal?"
    );

    if (!confirmou) return;

    this.estados = structuredClone(this.estadosPadrao);
    localStorage.removeItem(CONFIG.ESTADOS_STORAGE_KEY);
    this.renderizar();
  },

  exportar() {
    baixarJson("estados.json", {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      total: this.estados.length,
      estados: this.estados
    });
  }
};
