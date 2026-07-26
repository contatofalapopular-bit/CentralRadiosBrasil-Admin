document.addEventListener("DOMContentLoaded", () => {
  texto("app-version", `v${CONFIG.VERSION}`);

  document.getElementById("refresh-button").addEventListener("click", () => {
    if (rotaAtual() === "dashboard") carregarDashboard(true);
    if (rotaAtual() === "radios") RadiosAdmin.carregar();
  });

  document.getElementById("retry-button").addEventListener("click", () => carregarDashboard(true));

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const escuro = document.body.classList.toggle("dark-theme");
    localStorage.setItem("crb-theme", escuro ? "dark" : "light");
    atualizarTema();
  });

  if (localStorage.getItem("crb-theme") === "dark") {
    document.body.classList.add("dark-theme");
  }

  atualizarTema();
  window.addEventListener("hashchange", renderizarRota);
  renderizarRota();
});

function atualizarTema() {
  document.getElementById("theme-toggle").textContent =
    document.body.classList.contains("dark-theme")
      ? "☀️ Tema claro"
      : "🌙 Tema escuro";
}

function rotaAtual() {
  return window.location.hash.replace("#/", "") || "dashboard";
}

function renderizarRota() {
  const rota = rotaAtual();
  const dashboard = document.getElementById("dashboard-page");
  const radios = document.getElementById("radios-page");

  dashboard.classList.toggle("hidden", rota !== "dashboard");
  radios.classList.toggle("hidden", rota !== "radios");

  document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === rota);
  });

  if (rota === "radios") {
    texto("page-title", "Rádios");
    texto("page-subtitle", "Gerenciamento do catálogo de emissoras");
    RadiosAdmin.iniciar();
  } else {
    texto("page-title", "Dashboard");
    texto("page-subtitle", "Dados oficiais do ecossistema Central Rádios Brasil");
    carregarDashboard();
  }
}
