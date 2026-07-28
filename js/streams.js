const StreamsAdmin = {
  streams: [],
  editandoId: null,
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
    document.getElementById("stream-search")
      .addEventListener("input", () => this.renderizar());

    document.getElementById("stream-status-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("stream-protocol-filter")
      .addEventListener("change", () => this.renderizar());

    document.getElementById("new-stream-button")
      .addEventListener("click", () => this.abrirFormulario());

    document.getElementById("export-streams-button")
      .addEventListener("click", () => this.exportar());

    document.getElementById("reset-streams-button")
      .addEventListener("click", () => this.restaurarDoBanco());

    document.getElementById("stream-form")
      .addEventListener("submit", (evento) => this.salvar(evento));

    document.getElementById("cancel-stream-form")
      .addEventListener("click", () => this.fecharFormulario());

    document.getElementById("test-stream-form-button")
      .addEventListener("click", () => {
        const url = document.getElementById("stream-url").value.trim();
        this.testarUrl(url, "stream-form-result");
      });

    document.getElementById("stop-stream-form-button")
      .addEventListener("click", () => this.pararTeste("stream-form-result"));

    document.getElementById("stream-modal-backdrop")
      .addEventListener("click", (evento) => {
        if (evento.target.id === "stream-modal-backdrop") {
          this.fecharFormulario();
        }
      });
  },

  async carregar() {
    const rascunho = localStorage.getItem(CONFIG.STREAMS_STORAGE_KEY);

    if (rascunho) {
      this.streams = JSON.parse(rascunho);
      this.renderizar();
      return;
    }

    await this.restaurarDoBanco(false);
  },

  async restaurarDoBanco(confirmar = true) {
    if (confirmar) {
      const confirmou = confirm(
        "Descartar o rascunho local e reconstruir a lista de streams a partir de radios.json?"
      );
      if (!confirmou) return;
    }

    this.estado("loading", "Carregando streams de radios.json");

    try {
      const documento = await API.carregar("radios.json", true);
      const radios = Array.isArray(documento)
        ? documento
        : (documento.radios || []);

      this.streams = [];

      radios.forEach((radio) => {
        const lista = Array.isArray(radio.streams) ? radio.streams : [];

        lista.forEach((stream, indice) => {
          const url = stream.url || "";
          const protocolo = url.startsWith("https://")
            ? "HTTPS"
            : url.startsWith("http://")
              ? "HTTP"
              : "Outro";

          this.streams.push({
            id: stream.id || `${radio.id || gerarSlug(radio.nome)}-${indice + 1}`,
            radioId: radio.id || "",
            radioNome: radio.nome || "Rádio sem nome",
            nome: stream.nome || (indice === 0 ? "Principal" : `Stream ${indice + 1}`),
            url,
            codec: stream.codec || "Não informado",
            bitrate: stream.bitrate || null,
            protocolo,
            principal: stream.principal === true || indice === 0,
            status:
              stream.monitoramento?.status ||
              stream.status ||
              "nao_testado",
            ultimaVerificacao:
              stream.monitoramento?.ultimaVerificacao || null,
            tempoRespostaMs:
              stream.monitoramento?.tempoRespostaMs || null
          });
        });
      });

      localStorage.removeItem(CONFIG.STREAMS_STORAGE_KEY);
      this.renderizar();
      this.estado("success", "Streams carregados");
    } catch (erro) {
      console.error(erro);
      this.estado("error", "Erro ao carregar streams");
      document.getElementById("streams-table-body").innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            Não foi possível carregar os streams.<br>
            <small>${escaparHtml(erro.message)}</small>
          </td>
        </tr>
      `;
    }
  },

  estado(tipo, mensagem) {
    const badge = document.getElementById("streams-status-badge");
    badge.className = `status-badge ${tipo}`;
    badge.textContent = mensagem;
  },

  filtrados() {
    const busca = normalizar(document.getElementById("stream-search").value);
    const status = document.getElementById("stream-status-filter").value;
    const protocolo = document.getElementById("stream-protocol-filter").value;

    return this.streams.filter((stream) => {
      const correspondeBusca =
        !busca ||
        normalizar(
          `${stream.radioNome} ${stream.nome} ${stream.url} ${stream.codec}`
        ).includes(busca);

      return (
        correspondeBusca &&
        (!status || stream.status === status) &&
        (!protocolo || stream.protocolo === protocolo)
      );
    });
  },

  renderizar() {
    const tbody = document.getElementById("streams-table-body");
    const lista = this.filtrados();

    texto("streams-visible-count", lista.length);
    texto("streams-total-count", this.streams.length);
    texto(
      "streams-online-count",
      this.streams.filter((s) => s.status === "online").length
    );
    texto(
      "streams-offline-count",
      this.streams.filter((s) => s.status === "offline").length
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            Nenhum stream encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((stream) => `
      <tr>
        <td>
          <strong>${escaparHtml(stream.radioNome)}</strong>
          <small>${escaparHtml(stream.nome)}</small>
        </td>
        <td class="stream-url-cell">
          <small title="${escaparHtml(stream.url)}">
            ${escaparHtml(stream.url)}
          </small>
        </td>
        <td>${escaparHtml(stream.protocolo)}</td>
        <td>${escaparHtml(stream.codec || "—")}</td>
        <td>${stream.bitrate ? `${escaparHtml(stream.bitrate)} kbps` : "—"}</td>
        <td>
          <span class="stream-status ${escaparHtml(stream.status)}">
            ${this.rotuloStatus(stream.status)}
          </span>
        </td>
        <td>${stream.tempoRespostaMs ? `${stream.tempoRespostaMs} ms` : "—"}</td>
        <td>${stream.ultimaVerificacao ? formatarData(stream.ultimaVerificacao) : "—"}</td>
        <td class="actions-cell">
          <button class="table-button"
            onclick="StreamsAdmin.testar('${escaparHtml(stream.id)}')">
            ▶ Testar
          </button>
          <button class="table-button"
            onclick="StreamsAdmin.editar('${escaparHtml(stream.id)}')">
            Editar
          </button>
          <button class="table-button danger"
            onclick="StreamsAdmin.excluir('${escaparHtml(stream.id)}')">
            Excluir
          </button>
        </td>
      </tr>
    `).join("");
  },

  rotuloStatus(status) {
    return {
      online: "Online",
      offline: "Offline",
      testando: "Testando",
      nao_testado: "Não testado"
    }[status] || status;
  },

  abrirFormulario(stream = null) {
    this.editandoId = stream?.id || null;
    texto("stream-modal-title", stream ? "Editar stream" : "Novo stream");

    document.getElementById("stream-form").reset();
    document.getElementById("stream-principal").checked = true;

    if (stream) {
      document.getElementById("stream-radio-name").value = stream.radioNome || "";
      document.getElementById("stream-name").value = stream.nome || "";
      document.getElementById("stream-url").value = stream.url || "";
      document.getElementById("stream-codec").value = stream.codec || "";
      document.getElementById("stream-bitrate").value = stream.bitrate || "";
      document.getElementById("stream-principal").checked = stream.principal === true;
    }

    document.getElementById("stream-modal-backdrop").classList.remove("hidden");
    document.getElementById("stream-radio-name").focus();
  },

  fecharFormulario() {
    this.pararTeste("stream-form-result");
    this.editandoId = null;
    document.getElementById("stream-modal-backdrop").classList.add("hidden");
  },

  editar(id) {
  const stream = this.streams.find(
    (item) => String(item.id) === String(id)
  );

  if (!stream) {
    alert("Não foi possível localizar este stream.");
    return;
  }

  this.abrirFormulario(stream);
},

 salvar(evento) {
  evento.preventDefault();

  const radioNome = document
    .getElementById("stream-radio-name")
    .value.trim();

  const nome = document
    .getElementById("stream-name")
    .value.trim();

  const url = document
    .getElementById("stream-url")
    .value.trim();

  const codec = document
    .getElementById("stream-codec")
    .value.trim();

  const bitrateValor = document
    .getElementById("stream-bitrate")
    .value.trim();

  const principal = document
    .getElementById("stream-principal")
    .checked;

  if (!radioNome || !nome || !url) {
    alert("Preencha os campos obrigatórios.");
    return;
  }

  if (!validarUrlHttp(url)) {
    alert("A URL deve começar com http:// ou https://.");
    return;
  }

  const indiceEdicao = this.editandoId !== null
    ? this.streams.findIndex(
        (item) => String(item.id) === String(this.editandoId)
      )
    : -1;

  const duplicado = this.streams.find((item, indice) => {
    if (indice === indiceEdicao) return false;

    return normalizar(item.url) === normalizar(url);
  });

  if (duplicado) {
    alert("Este endereço de stream já está cadastrado.");
    return;
  }

  if (this.editandoId !== null && indiceEdicao === -1) {
    alert(
      "O stream original não foi encontrado. " +
      "Atualize a página e tente novamente."
    );
    return;
  }

  const anterior =
    indiceEdicao >= 0
      ? this.streams[indiceEdicao]
      : null;

  const atualizado = {
    ...(anterior || {}),
    id: anterior?.id || `stream-${Date.now()}`,
    radioId: anterior?.radioId || "",
    radioNome,
    nome,
    url,
    codec: codec || "Não informado",
    bitrate: bitrateValor
      ? Number(bitrateValor)
      : null,
    protocolo: url.startsWith("https://")
      ? "HTTPS"
      : "HTTP",
    principal,
    status: anterior?.status || "nao_testado",
    ultimaVerificacao:
      anterior?.ultimaVerificacao || null,
    tempoRespostaMs:
      anterior?.tempoRespostaMs || null
  };

  if (indiceEdicao >= 0) {
    this.streams.splice(indiceEdicao, 1, atualizado);
  } else {
    this.streams.push(atualizado);
  }

  this.salvarLocal();
  this.fecharFormulario();
},

 excluir(id) {
  const stream = this.streams.find(
    (item) => String(item.id) === String(id)
  );

  if (!stream) {
    alert("Não foi possível localizar este stream.");
    return;
  }

  const confirmou = confirm(
    `Excluir o stream "${stream.nome}" de "${stream.radioNome}" do rascunho local?`
  );

  if (!confirmou) return;

  this.streams = this.streams.filter(
    (item) => String(item.id) !== String(id)
  );

  this.salvarLocal();
},
  salvarLocal() {
    localStorage.setItem(
      CONFIG.STREAMS_STORAGE_KEY,
      JSON.stringify(this.streams)
    );
    this.renderizar();
  },

  testar(id) {
const stream = this.streams.find(
  (item) => String(item.id) === String(id)
);
    if (!stream) return;

    stream.status = "testando";
    this.renderizar();

    const inicio = performance.now();

    this.testarUrl(stream.url, null, () => {
      stream.status = "online";
      stream.tempoRespostaMs = Math.round(performance.now() - inicio);
      stream.ultimaVerificacao = new Date().toISOString();
      this.salvarLocal();
    }, () => {
      stream.status = "offline";
      stream.tempoRespostaMs = Math.round(performance.now() - inicio);
      stream.ultimaVerificacao = new Date().toISOString();
      this.salvarLocal();
    });
  },

  testarUrl(url, resultadoId = null, aoSucesso = null, aoErro = null) {
    this.pararTeste(resultadoId);

    if (!validarUrlHttp(url)) {
      this.mostrarResultado(resultadoId, "error", "URL inválida.");
      if (aoErro) aoErro();
      return;
    }

    this.mostrarResultado(resultadoId, "loading", "Tentando reproduzir o stream…");

    const audio = new Audio();
    this.audioTeste = audio;
    audio.preload = "none";
    audio.src = url;
    audio.volume = 0.25;

    let finalizado = false;

    const concluir = (sucesso) => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(this.timeoutTeste);

      if (sucesso) {
        this.mostrarResultado(
          resultadoId,
          "success",
          "Stream reproduzindo corretamente."
        );
        if (aoSucesso) aoSucesso();
      } else {
        this.pararAudioInterno();
        this.mostrarResultado(
          resultadoId,
          "error",
          "O navegador não conseguiu reproduzir este stream."
        );
        if (aoErro) aoErro();
      }
    };

    audio.addEventListener("playing", () => concluir(true), { once: true });
    audio.addEventListener("error", () => concluir(false), { once: true });
    audio.addEventListener("stalled", () => concluir(false), { once: true });

    this.timeoutTeste = setTimeout(() => concluir(false), 12000);
    audio.play().catch(() => concluir(false));
  },

  pararTeste(resultadoId = null) {
    clearTimeout(this.timeoutTeste);
    this.pararAudioInterno();

    if (resultadoId) {
      this.mostrarResultado(resultadoId, "neutral", "Teste parado.");
    }
  },

  pararAudioInterno() {
    if (!this.audioTeste) return;

    try {
      this.audioTeste.pause();
      this.audioTeste.removeAttribute("src");
      this.audioTeste.load();
    } catch {}

    this.audioTeste = null;
  },

  mostrarResultado(id, tipo, mensagem) {
    if (!id) return;

    const elemento = document.getElementById(id);
    elemento.className = `stream-test-result ${tipo}`;
    elemento.textContent = mensagem;
  },

  exportar() {
    baixarJson("streams.json", {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      total: this.streams.length,
      streams: this.streams
    });
  }
};
