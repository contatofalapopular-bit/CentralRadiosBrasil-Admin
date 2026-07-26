document.addEventListener("DOMContentLoaded", () => {
  texto("app-version", `v${CONFIG.VERSION}`);

  document.getElementById("refresh-button").addEventListener("click", () => carregarDashboard(true));
  document.getElementById("retry-button").addEventListener("click", () => carregarDashboard(true));
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const escuro = document.body.classList.toggle("dark-theme");
    localStorage.setItem("crb-theme", escuro ? "dark" : "light");
    atualizarTema();
  });

  if (localStorage.getItem("crb-theme") === "dark") document.body.classList.add("dark-theme");
  atualizarTema();
  carregarDashboard();
});

function atualizarTema() {
  document.getElementById("theme-toggle").textContent =
    document.body.classList.contains("dark-theme") ? "☀️ Tema claro" : "🌙 Tema escuro";
}
