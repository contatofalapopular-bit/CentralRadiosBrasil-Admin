const CidadesAdmin = {
  cidades: [],
  eventosRegistrados: false,
  carregando: false,

  async iniciar() {
    if (!this.eventosRegistrados) {
      this.registrarEventos();
      this.eventosRegistrados = true;
    }

    await this.carregar();
  },

  registrarEventos() {
    document.getElementById("cidade-search")
      .addEventListener("input", () => this.renderizar());

    document.getElementById("cidade-uf-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("cidade-region-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("reload-cidades-button")
      .addEventListener("click", () => this.carregar(true));

    document.getElementById("export-cidades-button")
      .addEventListener("click", () => this.exportar());
  },

  async carregar(forcarAtualizacao = false) {
    if (this.carregando) return;
    this.carregando = true;

    this.estado("loading", "Carregando municípios do IBGE");

    try {
      const cache = localStorage.getItem(CONFIG.CIDADES_STORAGE_KEY);

      if (cache && !forcarAtualizacao) {
        const documento = JSON.parse(cache);
        this.cidades = documento.cidades || [];
        this.preencherFiltros();
        this.renderizar();
        this.estado("success", "Municípios carregados do cache local");
        texto(
          "cidades-source-note",
          `Cache salvo em ${formatarData(documento.generatedAt)}`
        );
        return;
      }

      const resposta = await fetch(CONFIG.IBGE_MUNICIPIOS_URL, {
        cache: "no-store"
      });

      if (!resposta.ok) {
        throw new Error(`IBGE respondeu com erro ${resposta.status}`);
      }

      const dados = await resposta.json();

      this.cidades = dados.map((municipio) => {
        const microrregiao = municipio.microrregiao || {};
        const mesorregiao = microrregiao.mesorregiao || {};
        const uf =
          mesorregiao.UF ||
          municipio["regiao-imediata"]?.["regiao-intermediaria"]?.UF ||
          {};

        const regiao = uf.regiao || {};

        return {
          id: municipio.id,
          nome: municipio.nome,
          uf: uf.sigla || "",
          estado: uf.nome || "",
          regiao: regiao.nome || "",
          regiaoSigla: regiao.sigla || "",
          ativa: true
        };
      }).sort((a, b) => {
        const estado = a.uf.localeCompare(b.uf, "pt-BR");
        return estado || a.nome.localeCompare(b.nome, "pt-BR");
      });

      const documento = {
        schemaVersion: "1.0.0",
        source: "IBGE - API de Localidades",
        sourceUrl: CONFIG.IBGE_MUNICIPIOS_URL,
        generatedAt: new Date().toISOString(),
        total: this.cidades.length,
        cidades: this.cidades
      };

      localStorage.setItem(
        CONFIG.CIDADES_STORAGE_KEY,
        JSON.stringify(documento)
      );

      this.preencherFiltros();
      this.renderizar();
      this.estado("success", "Municípios carregados do IBGE");
      texto(
        "cidades-source-note",
        `Atualizado em ${formatarData(documento.generatedAt)}`
      );
    } catch (erro) {
      console.error(erro);

      const cache = localStorage.getItem(CONFIG.CIDADES_STORAGE_KEY);

      if (cache) {
        const documento = JSON.parse(cache);
        this.cidades = documento.cidades || [];
        this.preencherFiltros();
        this.renderizar();
        this.estado("loading", "IBGE indisponível; usando cache local");
        texto(
          "cidades-source-note",
          `Cache salvo em ${formatarData(documento.generatedAt)}`
        );
      } else {
        this.estado("error", "Não foi possível carregar os municípios");
        texto("cidades-source-note", erro.message);

        document.getElementById("cidades-table-body").innerHTML = `
          <tr>
            <td colspan="6" class="empty-state">
              Não foi possível consultar a API do IBGE.<br>
              <small>${escaparHtml(erro.message)}</small>
            </td>
          </tr>
        `;
      }
    } finally {
      this.carregando = false;
    }
  },

  estado(tipo, mensagem) {
    const badge = document.getElementById("cidades-status-badge");
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  },

  preencherFiltros() {
    const ufSelect = document.getElementById("cidade-uf-filter");
    const regiaoSelect = document.getElementById("cidade-region-filter");
    const ufAtual = ufSelect.value;
    const regiaoAtual = regiaoSelect.value;

    const estados = [...new Map(
      this.cidades
        .filter((cidade) => cidade.uf)
        .map((cidade) => [cidade.uf, cidade.estado])
    ).entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

    ufSelect.innerHTML = '<option value="">Todos os estados</option>';

    estados.forEach(([uf, nome]) => {
      const option = document.createElement("option");
      option.value = uf;
      option.textContent = `${uf} — ${nome}`;
      ufSelect.appendChild(option);
    });

    const regioes = [...new Set(
      this.cidades.map((cidade) => cidade.regiao).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));

    regiaoSelect.innerHTML = '<option value="">Todas as regiões</option>';

    regioes.forEach((regiao) => {
      const option = document.createElement("option");
      option.value = regiao;
      option.textContent = regiao;
      regiaoSelect.appendChild(option);
    });

    if ([...ufSelect.options].some((o) => o.value === ufAtual)) {
      ufSelect.value = ufAtual;
    }

    if ([...regiaoSelect.options].some((o) => o.value === regiaoAtual)) {
      regiaoSelect.value = regiaoAtual;
    }
  },

  filtradas() {
    const busca = normalizar(document.getElementById("cidade-search").value);
    const uf = document.getElementById("cidade-uf-filter").value;
    const regiao = document.getElementById("cidade-region-filter").value;

    return this.cidades.filter((cidade) => {
      const correspondeBusca =
        !busca ||
        normalizar(
          `${cidade.nome} ${cidade.uf} ${cidade.estado} ${cidade.regiao} ${cidade.id}`
        ).includes(busca);

      return (
        correspondeBusca &&
        (!uf || cidade.uf === uf) &&
        (!regiao || cidade.regiao === regiao)
      );
    });
  },

  renderizar() {
    const tbody = document.getElementById("cidades-table-body");
    const listaCompleta = this.filtradas();
    const limite = 250;
    const lista = listaCompleta.slice(0, limite);

    texto("cidades-visible-count", listaCompleta.length);
    texto("cidades-total-count", this.cidades.length);
    texto(
      "cidades-table-note",
      listaCompleta.length > limite
        ? `Mostrando os primeiros ${limite}. Use a busca ou os filtros para refinar.`
        : `Mostrando ${listaCompleta.length} município(s).`
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            Nenhum município encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((cidade) => `
      <tr>
        <td><strong>${escaparHtml(cidade.nome)}</strong></td>
        <td>${escaparHtml(cidade.uf)}</td>
        <td>${escaparHtml(cidade.estado)}</td>
        <td>${escaparHtml(cidade.regiao)}</td>
        <td><code>${escaparHtml(cidade.id)}</code></td>
        <td>
          <span class="state-status active">Oficial</span>
        </td>
      </tr>
    `).join("");
  },

  exportar() {
    if (!this.cidades.length) {
      alert("A lista de municípios ainda não foi carregada.");
      return;
    }

    baixarJson("cidades.json", {
      schemaVersion: "1.0.0",
      source: "IBGE - API de Localidades",
      sourceUrl: CONFIG.IBGE_MUNICIPIOS_URL,
      generatedAt: new Date().toISOString(),
      total: this.cidades.length,
      cidades: this.cidades
    });
  }
};
