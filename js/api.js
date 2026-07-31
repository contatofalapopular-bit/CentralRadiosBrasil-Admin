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
    const chave = String(valor || "").trim();

    if (chave) {
      sessionStorage.setItem(
        CONFIG.ADMIN_KEY_SESSION_STORAGE,
        chave
      );
    } else {
      sessionStorage.removeItem(
        CONFIG.ADMIN_KEY_SESSION_STORAGE
      );
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

  async worker(caminho, opcoes = {}) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT_MS
    );

    const headers = new Headers(opcoes.headers || {});
    const chave = this.chaveAdmin();

    if (chave) {
      headers.set("X-Admin-Key", chave);
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
        throw new Error(
          "A API administrativa demorou mais que o permitido."
        );
      }

      throw erro;
    } finally {
      clearTimeout(timer);
    }
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
  }
};
