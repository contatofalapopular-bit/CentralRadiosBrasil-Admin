function texto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}
function normalizar(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}
function formatarData(valor) {
  if (!valor) return "Não informada";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? String(valor) :
    new Intl.DateTimeFormat("pt-BR", {dateStyle:"short", timeStyle:"short"}).format(data);
}
