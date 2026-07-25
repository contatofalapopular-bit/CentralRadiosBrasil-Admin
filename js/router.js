/**
 * Navegação inicial do painel.
 */

function inicializarRouter() {
  window.addEventListener("hashchange", processarRota);
  processarRota();
}

function processarRota() {
  const rota = window.location.hash.replace("#/", "") || CONFIG.DEFAULT_ROUTE;

  switch (rota) {
    case "dashboard":
      definirTituloPagina("Dashboard");
      carregarDashboard();
      break;

    default:
      window.location.hash = `#/${CONFIG.DEFAULT_ROUTE}`;
  }

  document.body.classList.remove("menu-open");
}

function definirTituloPagina(titulo) {
  const pageTitle = document.getElementById("page-title");

  if (pageTitle) {
    pageTitle.textContent = titulo;
  }

  document.title = `${titulo} — ${CONFIG.APP_NAME}`;
}
