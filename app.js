let radiosInicializadas = false;
let estadosInicializados = false;
let categoriasInicializadas = false;
let cidadesInicializadas = false;
let streamsInicializados = false;

document.addEventListener("DOMContentLoaded", () => {
  texto("app-version", `v${CONFIG.VERSION}`);
  document.body.dataset.appVersion = CONFIG.VERSION;
  console.info(`${CONFIG.APP_NAME} — Base Oficial v${CONFIG.VERSION}`);

  document.getElementById("refresh-button").addEventListener("click", () => {
    if (rotaAtual() === "dashboard") {
      carregarDashboard(true);
    } else if (rotaAtual() === "radios") {
      RadiosAdmin.carregar();
    } else if (rotaAtual() === "estados") {
      EstadosAdmin.renderizar();
    } else if (rotaAtual() === "categorias") {
      CategoriasAdmin.renderizar();
    } else if (rotaAtual() === "cidades") {
      CidadesAdmin.carregar(true);
    } else if (rotaAtual() === "streams") {
      StreamsAdmin.renderizar();
    }
  });

  document.getElementById("retry-button").addEventListener("click", () => {
    carregarDashboard(true);
  });

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

async function renderizarRota() {
  const rota = rotaAtual();
  const dashboard = document.getElementById("dashboard-page");
  const radios = document.getElementById("radios-page");
  const estados = document.getElementById("estados-page");
  const categorias = document.getElementById("categorias-page");
  const cidades = document.getElementById("cidades-page");
  const streams = document.getElementById("streams-page");

  const rotaValida = ["dashboard", "radios", "estados", "categorias", "cidades", "streams"].includes(rota);
  const rotaFinal = rotaValida ? rota : "dashboard";

  if (!rotaValida) {
    window.location.hash = "#/dashboard";
    return;
  }

  dashboard.classList.toggle("hidden", rotaFinal !== "dashboard");
  radios.classList.toggle("hidden", rotaFinal !== "radios");
  estados.classList.toggle("hidden", rotaFinal !== "estados");
  categorias.classList.toggle("hidden", rotaFinal !== "categorias");
  cidades.classList.toggle("hidden", rotaFinal !== "cidades");
  streams.classList.toggle("hidden", rotaFinal !== "streams");

  document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === rotaFinal);
  });

  if (rotaFinal === "streams") {
    texto("page-title", "Streams");
    texto("page-subtitle", "Cadastro e verificação dos links de transmissão");

    if (!streamsInicializados) {
      streamsInicializados = true;
      await StreamsAdmin.iniciar();
    } else {
      StreamsAdmin.renderizar();
    }
  } else if (rotaFinal === "cidades") {
    texto("page-title", "Cidades");
    texto("page-subtitle", "Base nacional de municípios brasileiros");

    if (!cidadesInicializadas) {
      cidadesInicializadas = true;
      await CidadesAdmin.iniciar();
    } else {
      CidadesAdmin.renderizar();
    }
  } else if (rotaFinal === "categorias") {
    texto("page-title", "Categorias");
    texto("page-subtitle", "Cadastro e organização das categorias de rádio");

    if (!categoriasInicializadas) {
      categoriasInicializadas = true;
      CategoriasAdmin.iniciar();
    } else {
      CategoriasAdmin.renderizar();
    }
  } else if (rotaFinal === "estados") {
    texto("page-title", "Estados");
    texto("page-subtitle", "Cadastro e organização dos estados brasileiros");

    if (!estadosInicializados) {
      estadosInicializados = true;
      EstadosAdmin.iniciar();
    } else {
      EstadosAdmin.renderizar();
    }
  } else if (rotaFinal === "radios") {
    texto("page-title", "Rádios");
    texto("page-subtitle", "Gerenciamento do catálogo de emissoras");

    if (!radiosInicializadas) {
      radiosInicializadas = true;
      await RadiosAdmin.iniciar();
    } else {
      RadiosAdmin.renderizar();
    }
  } else {
    texto("page-title", "Dashboard");
    texto("page-subtitle", "Dados oficiais do ecossistema Central Rádios Brasil");
    carregarDashboard();
  }
}
