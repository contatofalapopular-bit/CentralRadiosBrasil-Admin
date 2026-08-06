const API = {
  baseUrl() {
    return `https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.DADOS_REPO}/${CONFIG.DADOS_BRANCH}`;
  },

  workerUrl() {
    return String(CONFIG.WORKER_URL || "").replace(/\/+$/, "");
  },

  chaveAdmin() {
    return sessionStorage.getItem(
      CONFIG.ADMIN_KEY_SESSION_STORAGE
    ) || "";
  },

  definirChaveAdmin(valor) {
    const token = String(valor || "").trim();

    if (token) {
      sessionStorage.setItem(
        CONFIG.ADMIN_KEY_SESSION_STORAGE,
        token
      );
    } else {
      sessionStorage.removeItem(
        CONFIG.ADMIN_KEY_SESSION_STORAGE
      );
    }
  },

  async loginAdmin(chave) {
    const resposta = await this.workerSemSessao(
      "/api/admin/login",
      {
        method: "POST",
        body: JSON.stringify({ chave })
      }
    );

    if (!resposta?.token) {
      throw new Error(
        "A API não retornou o token da sessão administrativa."
      );
    }

    this.definirChaveAdmin(resposta.token);
    return resposta;
  },

  validarSessaoAdmin() {
    return this.worker(
      "/api/admin/session"
    );
  },

  async logoutAdmin() {
    try {
      if (this.chaveAdmin()) {
        await this.worker(
          "/api/admin/logout",
          { method: "POST" }
        );
      }
    } finally {
      this.definirChaveAdmin("");
    }
  },

  async carregar(nome, semCache = false) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT_MS
    );

    try {
      const sufixo = semCache ? `?t=${Date.now()}` : "";
      const resposta = await fetch(
        `${this.baseUrl()}/${nome}${sufixo}`,
        {
          cache: semCache ? "no-store" : "default",
          signal: controller.signal
        }
      );

      if (!resposta.ok) {
        throw new Error(`${nome}: erro ${resposta.status}`);
      }

      return await resposta.json();
    } catch (erro) {
      if (erro.name === "AbortError") {
        throw new Error(`${nome}: tempo de resposta excedido`);
      }

      throw erro;
    } finally {
      clearTimeout(timer);
    }
  },

  async workerSemSessao(caminho, opcoes = {}) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT_MS
    );

    const headers = new Headers(opcoes.headers || {});

    if (
      opcoes.body &&
      !(opcoes.body instanceof FormData) &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const resposta = await fetch(
        `${this.workerUrl()}${caminho}`,
        {
          ...opcoes,
          headers,
          cache: "no-store",
          signal: controller.signal
        }
      );

      let dados = null;
      try {
        dados = await resposta.json();
      } catch {
        dados = null;
      }

      if (!resposta.ok || dados?.ok === false) {
        const erro = new Error(
          dados?.erro ||
          `A API respondeu com HTTP ${resposta.status}.`
        );
        erro.status = resposta.status;
        erro.dados = dados;
        throw erro;
      }

      return dados;
    } catch (erro) {
      if (erro.name === "AbortError") {
        const falha = new Error(
          "A API administrativa demorou mais que o permitido."
        );
        falha.status = 0;
        throw falha;
      }

      if (erro instanceof TypeError) {
        const falha = new Error(
          "Não foi possível conectar ao Worker da Central Rádios Brasil. Verifique a internet e confirme se a API está publicada."
        );
        falha.status = 0;
        throw falha;
      }

      throw erro;
    } finally {
      clearTimeout(timer);
    }
  },

  async worker(caminho, opcoes = {}) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT_MS
    );

    const headers = new Headers(opcoes.headers || {});
    const chave = this.chaveAdmin();

    if (chave) {
      headers.set("Authorization", `Bearer ${chave}`);
    }

    if (
      opcoes.body &&
      !(opcoes.body instanceof FormData) &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const resposta = await fetch(
        `${this.workerUrl()}${caminho}`,
        {
          ...opcoes,
          headers,
          cache: "no-store",
          signal: controller.signal
        }
      );

      let dados = null;

      try {
        dados = await resposta.json();
      } catch {
        dados = null;
      }

      if (!resposta.ok || dados?.ok === false) {
        const erro = new Error(
          dados?.erro ||
          `A API respondeu com HTTP ${resposta.status}.`
        );

        erro.status = resposta.status;
        erro.dados = dados;
        throw erro;
      }

      return dados;
    } catch (erro) {
      if (erro.name === "AbortError") {
        const falha = new Error(
          "A API administrativa demorou mais que o permitido."
        );
        falha.status = 0;
        throw falha;
      }

      if (erro instanceof TypeError) {
        const falha = new Error(
          "Não foi possível conectar ao Worker da Central Rádios Brasil. Verifique a internet e confirme se a API está publicada."
        );
        falha.status = 0;
        throw falha;
      }

      throw erro;
    } finally {
      clearTimeout(timer);
    }
  },

  resumoDashboard() {
    return this.worker(
      "/api/admin/dashboard"
    );
  },

  listarSolicitacoes() {
    return this.worker(
      "/api/admin/solicitacoes?limit=200"
    );
  },

  detalharSolicitacao(protocolo) {
    return this.worker(
      `/api/admin/solicitacoes/${encodeURIComponent(protocolo)}`
    );
  },

  atualizarSolicitacao(protocolo, dados) {
    return this.worker(
      `/api/admin/solicitacoes/${encodeURIComponent(protocolo)}`,
      {
        method: "PATCH",
        body: JSON.stringify(dados)
      }
    );
  },

  listarAlteracoes() {
    return this.worker(
      "/api/admin/alteracoes?limit=200"
    );
  },

  detalharAlteracao(id) {
    return this.worker(
      `/api/admin/alteracoes/${encodeURIComponent(id)}`
    );
  },

  atualizarAlteracao(id, dados) {
    return this.worker(
      `/api/admin/alteracoes/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(dados)
      }
    );
  },

  listarInteressesStreaming({ status = "", busca = "", limit = 500 } = {}) {
    const parametros = new URLSearchParams({ limit: String(limit) });
    if (status) parametros.set("status", status);
    if (busca) parametros.set("busca", busca);

    return this.worker(
      `/api/admin/streaming/interesses?${parametros.toString()}`
    );
  },

  atualizarInteresseStreaming(id, dados) {
    return this.worker(
      `/api/admin/streaming/interesses/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(dados)
      }
    );
  },

  listarOcorrencias({ status = "", tipo = "", prioridade = "", busca = "", limit = 500 } = {}) {
    const parametros = new URLSearchParams({ limit: String(limit) });
    if (status) parametros.set("status", status);
    if (tipo) parametros.set("tipo", tipo);
    if (prioridade) parametros.set("prioridade", prioridade);
    if (busca) parametros.set("busca", busca);
    return this.worker(`/api/admin/ocorrencias?${parametros.toString()}`);
  },

  detalharOcorrencia(id) {
    return this.worker(`/api/admin/ocorrencias/${encodeURIComponent(id)}`);
  },

  atualizarOcorrencia(id, dados) {
    return this.worker(`/api/admin/ocorrencias/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(dados)
    });
  },

  listarAuditoriaAudiencia({ periodo = "24h" } = {}) {
    const parametros = new URLSearchParams({ periodo });
    return this.worker(`/api/admin/audiencia/radios?${parametros.toString()}`);
  },

  detalharAuditoriaAudiencia(radioId, { periodo = "24h" } = {}) {
    const parametros = new URLSearchParams({ periodo });
    return this.worker(
      `/api/admin/audiencia/radios/${encodeURIComponent(radioId)}?${parametros.toString()}`
    );
  },

  resumoAuditoriaAudiencia({ periodo = "24h" } = {}) {
    const parametros = new URLSearchParams({ periodo });
    return this.worker(`/api/admin/audiencia/resumo?${parametros.toString()}`);
  },

  sincronizarPendencias(dados) {
    return this.worker(
      "/api/admin/pendencias/sincronizar",
      {
        method: "POST",
        body: JSON.stringify(dados || {})
      }
    );
  },

  listarPendencias({ status = "abertas", prioridade = "", origem = "", busca = "", ativas = "1", page = 1, limit = 50 } = {}) {
    const parametros = new URLSearchParams({
      status,
      ativas,
      page: String(page),
      limit: String(limit)
    });
    if (prioridade) parametros.set("prioridade", prioridade);
    if (origem) parametros.set("origem", origem);
    if (busca) parametros.set("busca", busca);
    return this.worker(`/api/admin/pendencias?${parametros.toString()}`);
  },

  resumoPendencias() {
    return this.worker("/api/admin/pendencias/resumo");
  },

  detalharPendencia(id) {
    return this.worker(`/api/admin/pendencias/${encodeURIComponent(id)}`);
  },

  atualizarPendencia(id, dados) {
    return this.worker(`/api/admin/pendencias/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(dados || {})
    });
  },

  listarMonitoramentoStreams() {
    return this.worker(
      "/api/admin/streams/status"
    );
  },

  executarMonitoramentoStreams() {
    return this.worker(
      "/api/admin/streams/monitorar",
      { method: "POST" }
    );
  },

  emailWorkerUrl() {
    return String(CONFIG.EMAIL_WORKER_URL || "").replace(/\/+$/, "");
  },

  async emailWorker(caminho, opcoes = {}) {
    if (!this.emailWorkerUrl()) {
      throw new Error("A URL do Worker de e-mail ainda não foi configurada.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    const headers = new Headers(opcoes.headers || {});
    const token = this.chaveAdmin();

    if (!token) {
      throw new Error("Entre no Painel Administrativo antes de acessar os e-mails.");
    }

    headers.set("Authorization", `Bearer ${token}`);

    if (opcoes.body && !(opcoes.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const resposta = await fetch(`${this.emailWorkerUrl()}${caminho}`, {
        ...opcoes,
        headers,
        cache: "no-store",
        signal: controller.signal
      });

      const tipo = resposta.headers.get("Content-Type") || "";
      if (!tipo.includes("application/json")) {
        if (!resposta.ok) throw new Error(`O módulo de e-mail respondeu com HTTP ${resposta.status}.`);
        return resposta;
      }

      const dados = await resposta.json();
      if (!resposta.ok || dados?.ok === false) {
        const erro = new Error(dados?.erro || `O módulo de e-mail respondeu com HTTP ${resposta.status}.`);
        erro.status = resposta.status;
        erro.dados = dados;
        throw erro;
      }
      return dados;
    } catch (erro) {
      if (erro.name === "AbortError") {
        throw new Error("O módulo de e-mail demorou mais que o permitido.");
      }
      throw erro;
    } finally {
      clearTimeout(timer);
    }
  },

  resumoEmails() {
    return this.emailWorker("/api/admin/emails/resumo");
  },

  listarEmails({ caixa = "entrada", busca = "" } = {}) {
    const params = new URLSearchParams({ caixa, limit: "150" });
    if (busca) params.set("busca", busca);
    return this.emailWorker(`/api/admin/emails?${params.toString()}`);
  },

  detalharEmail(id) {
    return this.emailWorker(`/api/admin/emails/${encodeURIComponent(id)}`);
  },

  atualizarEmail(id, dados) {
    return this.emailWorker(`/api/admin/emails/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(dados)
    });
  },

  enviarEmail(formData) {
    return this.emailWorker("/api/admin/emails/enviar", {
      method: "POST",
      body: formData
    });
  },

  async baixarAnexo(mensagemId, anexoId) {
    const resposta = await this.emailWorker(
      `/api/admin/emails/${encodeURIComponent(mensagemId)}/anexos/${encodeURIComponent(anexoId)}`
    );
    const blob = await resposta.blob();
    const disposition = resposta.headers.get("Content-Disposition") || "";
    const nome = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "anexo";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};
