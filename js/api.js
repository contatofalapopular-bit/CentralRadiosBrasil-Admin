/**
 * Camada de acesso aos dados.
 * As funções reais serão implementadas no Commit 2.
 */

const API = Object.freeze({
  baseRawUrl() {
    return [
      "https://raw.githubusercontent.com",
      CONFIG.GITHUB_OWNER,
      CONFIG.DADOS_REPO,
      CONFIG.DADOS_BRANCH
    ].join("/");
  },

  async carregarRadios() {
    throw new Error("carregarRadios() será implementada no Commit 2.");
  },

  async carregarCategorias() {
    throw new Error("carregarCategorias() será implementada no Commit 2.");
  },

  async carregarEstados() {
    throw new Error("carregarEstados() será implementada no Commit 2.");
  }
});
