/**
 * Commit 19 — Publicação Inteligente
 * Classifica emissoras como aptas, pendentes ou bloqueadas e publica apenas as aptas.
 */
let publicacaoEventosRegistrados = false;
const PUBLICADOR_URL = "https://broken-bar-45e2.contatofalapopular.workers.dev/publicar";

function iniciarPublicacao() {
  registrarEventosPublicacao();
  atualizarResumoPublicacao();
}

function obterResultadoInteligente() {
  if (typeof EmissorasAdmin === "undefined") return null;
  if (!Array.isArray(EmissorasAdmin.emissoras) || !EmissorasAdmin.emissoras.length) return null;
  return EmissorasAdmin.validarBanco();
}

function atualizarResumoPublicacao(resultado = obterResultadoInteligente()) {
  const total = resultado?.totalCadastradas || 0;
  definirTexto("publicacao-total-emissoras", total);
  definirTexto("publicacao-total-aptas", resultado?.totalAptas || 0);
  definirTexto("publicacao-total-pendentes", resultado?.totalPendentes || 0);
  definirTexto("publicacao-total-bloqueadas", resultado?.totalBloqueadas || 0);
  definirTexto("publicacao-qualidade-media", `${resultado?.qualidadeMedia || 0}%`);
  renderizarAvaliacoesPublicacao(resultado);

  if (!total) atualizarBadgePublicacao("loading", "Aguardando dados");
  else if (resultado.totalAptas > 0) atualizarBadgePublicacao("success", "Publicação disponível");
  else atualizarBadgePublicacao("error", "Nenhuma emissora apta");
}

function registrarEventosPublicacao() {
  if (publicacaoEventosRegistrados) return;
  publicacaoEventosRegistrados = true;
  document.getElementById("publicacao-refresh-button")?.addEventListener("click", () => atualizarResumoPublicacao());
  document.getElementById("publicacao-validar-button")?.addEventListener("click", executarValidacaoPublicacao);
  document.getElementById("publicacao-gerar-radios-button")?.addEventListener("click", gerarBancoOficialPublicacao);
  document.getElementById("publicacao-gerar-esp32-button")?.addEventListener("click", gerarBancoEsp32Publicacao);
  criarBotaoPublicarGithub();
}

function executarValidacaoPublicacao() {
  if (typeof EmissorasAdmin === "undefined" || typeof EmissorasAdmin.exportar !== "function") {
    atualizarBadgePublicacao("error", "Validação indisponível");
    return;
  }
  atualizarBadgePublicacao("loading", "Analisando emissoras");
  EmissorasAdmin.exportar();
  const resultado = EmissorasAdmin.ultimoRelatorioValidacao;
  atualizarResumoPublicacao(resultado);
  renderizarAvaliacoesPublicacao(resultado);
  if (resultado?.valido) {
    ativarGeradoresPublicacao();
    definirTexto("publicacao-resumo", `${resultado.totalAptas} emissora(s) apta(s) serão incluídas. ${resultado.totalPendentes} pendente(s) e ${resultado.totalBloqueadas} bloqueada(s) ficarão fora dos arquivos.`);
  } else {
    desativarGeradoresPublicacao();
    definirTexto("publicacao-resumo", "Nenhuma emissora está apta. Corrija as pendências ou bloqueios antes de gerar os bancos oficiais.");
  }
}

function renderizarAvaliacoesPublicacao(resultado) {
  const lista = document.getElementById("publicacao-avaliacoes-list");
  if (!lista) return;
  const avaliacoes = resultado?.avaliacoes || [];
  if (!avaliacoes.length) {
    lista.innerHTML = '<div class="publicacao-empty">Nenhuma emissora disponível para análise.</div>';
    return;
  }
  lista.innerHTML = avaliacoes.map((item) => {
    const problemas = [...item.bloqueios, ...item.pendencias, ...item.avisos];
    const rotulo = item.classificacao === "apta" ? "Pronta" : item.classificacao === "pendente" ? "Pendente" : "Bloqueada";
    return `<article class="readiness-card readiness-card--${item.classificacao}">
      <div class="readiness-head"><div><strong>${escaparHtml(item.nome)}</strong><span>${rotulo}</span></div><b>${item.prontidao}%</b></div>
      <div class="readiness-track"><span style="width:${item.prontidao}%"></span></div>
      ${problemas.length ? `<ul>${problemas.map((p) => `<li><strong>${escaparHtml(p.campo)}:</strong> ${escaparHtml(p.mensagem)}</li>`).join("")}</ul>` : '<p class="readiness-ok">✓ Todos os requisitos de publicação foram atendidos.</p>'}
    </article>`;
  }).join("");
}

function gerarBancoOficialPublicacao() {
  if (!EmissorasAdmin?.ultimoRelatorioValidacao?.valido) return alert("Valide o banco primeiro.");
  EmissorasAdmin.baixarBancoOficial();
}
function gerarBancoEsp32Publicacao() {
  if (!EmissorasAdmin?.ultimoRelatorioValidacao?.valido) return alert("Valide o banco primeiro.");
  EmissorasAdmin.baixarBancoEsp32();
}
function atualizarBadgePublicacao(tipo, mensagem) {
  const badge=document.getElementById("publicacao-status-badge"); if(!badge)return;
  badge.className=`status-badge ${tipo}`; badge.textContent=mensagem;
}
function ativarGeradoresPublicacao(){["publicacao-gerar-radios-button","publicacao-gerar-esp32-button"].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=false;});}
function desativarGeradoresPublicacao(){["publicacao-gerar-radios-button","publicacao-gerar-esp32-button"].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=true;});}
function definirTexto(id,valor){const e=document.getElementById(id);if(e)e.textContent=String(valor);}

function criarBotaoPublicarGithub() {
  if (document.getElementById("publicacao-publicar-github-button")) return;
  const area=document.getElementById("publicacao-validar-button")?.parentElement;if(!area)return;
  const botao=document.createElement("button");botao.id="publicacao-publicar-github-button";botao.type="button";botao.className="primary-button";botao.textContent="🚀 Publicar no GitHub";
  botao.addEventListener("click", publicarBancosNoGithub);area.appendChild(botao);
}
async function publicarBancosNoGithub(){
  if(!EmissorasAdmin?.ultimoRelatorioValidacao?.valido||!EmissorasAdmin.ultimoBancoOficial||!EmissorasAdmin.ultimoBancoEsp32){alert("Primeiro valide o banco e confirme que existe ao menos uma emissora apta.");return;}
  const chave=window.prompt("Digite a chave de publicação criada na Cloudflare:");if(!chave?.trim())return;
  const botao=document.getElementById("publicacao-publicar-github-button");const original=botao?.textContent;if(botao){botao.disabled=true;botao.textContent="Publicando...";}
  try{const resposta=await fetch(PUBLICADOR_URL,{method:"POST",headers:{"Content-Type":"application/json","X-Publication-Key":chave.trim()},body:JSON.stringify({radios:EmissorasAdmin.ultimoBancoOficial,radiosEsp32:EmissorasAdmin.ultimoBancoEsp32,mensagem:"Commit 19 - Publicação inteligente"})});const resultado=await resposta.json();if(!resposta.ok||!resultado.ok)throw new Error(resultado.erro||"Não foi possível concluir a publicação.");atualizarBadgePublicacao("success","Publicado com sucesso");alert("Publicação concluída. Somente emissoras aptas foram enviadas.");}
  catch(erro){console.error(erro);atualizarBadgePublicacao("error","Falha na publicação");alert(`Falha na publicação:\n\n${erro.message}`);}finally{if(botao){botao.disabled=false;botao.textContent=original;}}
}
