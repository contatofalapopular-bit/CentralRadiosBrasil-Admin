const API = {
  baseUrl() {
    return `https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.DADOS_REPO}/${CONFIG.DADOS_BRANCH}`;
  },

  async carregar(nome, semCache = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    try {
      const sufixo = semCache ? `?t=${Date.now()}` : "";
      const resposta = await fetch(`${this.baseUrl()}/${nome}${sufixo}`, {
        cache: semCache ? "no-store" : "default",
        signal: controller.signal
      });

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
  }
};
