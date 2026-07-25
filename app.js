/**
 * Ponto de entrada do Painel Administrativo.
 */

document.addEventListener("DOMContentLoaded", () => {
  inicializarAplicacao();
});

function inicializarAplicacao() {
  const versionElement = document.getElementById("app-version");
  const menuToggle = document.getElementById("menu-toggle");
  const themeToggle = document.getElementById("theme-toggle");

  if (versionElement) {
    versionElement.textContent = `v${CONFIG.VERSION}`;
  }

  menuToggle?.addEventListener("click", () => {
    document.body.classList.toggle("menu-open");
  });

  themeToggle?.addEventListener("click", alternarTema);

  aplicarTemaSalvo();
  inicializarRouter();

  console.info(`${CONFIG.APP_NAME} ${CONFIG.VERSION} iniciado.`);
}

function alternarTema() {
  const escuroAtivo = document.body.classList.toggle("dark-theme");
  localStorage.setItem("crb-theme", escuroAtivo ? "dark" : "light");
  atualizarTextoTema(escuroAtivo);
}

function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem("crb-theme");
  const escuroAtivo = temaSalvo === "dark";

  document.body.classList.toggle("dark-theme", escuroAtivo);
  atualizarTextoTema(escuroAtivo);
}

function atualizarTextoTema(escuroAtivo) {
  const themeToggle = document.getElementById("theme-toggle");

  if (!themeToggle) {
    return;
  }

  themeToggle.textContent = escuroAtivo
    ? "☀️ Tema claro"
    : "🌙 Tema escuro";
}
