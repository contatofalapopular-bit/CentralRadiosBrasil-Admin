/**
 * Commit 20 — Refinamentos da Publicação Inteligente
 * Melhora a experiência visual, detalha requisitos e protege a publicação sem validação.
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
  renderizarResumoExecutivo(resultado);
  atualizarEstadoBotaoGithub();

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
  desativarGeradoresPublicacao();
  atualizarEstadoBotaoGithub();
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
  renderizarResumoExecutivo(resultado);
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
    const rotulo = item.classificacao === "apta" ? "Pronta" : item.classificacao === "pendente" ? "Pendente" : "Bloqueada";
    const classeFaixa = obterClasseProntidao(item.prontidao);
    const requisitos = montarRequisitosPublicacao(item);

    return `<article class="readiness-card readiness-card--${item.classificacao}">
      <div class="readiness-head">
        <div><strong>${escaparHtml(item.nome)}</strong><span>${rotulo}</span></div>
        <b>${item.prontidao}%</b>
      </div>
      <div class="readiness-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.prontidao}" aria-label="Prontidão de ${escaparHtml(item.nome)}">
        <span class="${classeFaixa}" style="width:${item.prontidao}%"></span>
      </div>
      <div class="readiness-requirements">
        ${requisitos.map((requisito) => `<div class="requirement-item requirement-item--${requisito.tipo}"><span>${requisito.icone}</span><div><strong>${escaparHtml(requisito.titulo)}</strong><small>${escaparHtml(requisito.texto)}</small></div></div>`).join("")}
      </div>
    </article>`;
  }).join("");
}

function obterClasseProntidao(percentual) {
  if (percentual >= 90) return "progress-excellent";
  if (percentual >= 70) return "progress-good";
  if (percentual >= 50) return "progress-attention";
  return "progress-critical";
}

function montarRequisitosPublicacao(item) {
  const falhas = new Map();
  [...(item.bloqueios || []), ...(item.pendencias || []), ...(item.avisos || [])].forEach((problema) => {
    falhas.set(String(problema.campo || "").toLowerCase(), problema);
  });

  const padrao = [
    ["nome", "Nome da emissora"],
    ["estado", "Estado"],
    ["cidade", "Cidade"],
    ["categoria", "Categoria principal"],
    ["streams", "Pelo menos um stream"],
    ["stream principal", "Stream principal válido"],
    ["perfil", "Perfil mínimo"],
    ["status do cadastro", "Cadastro publicado"],
    ["situação", "Emissora ativa"],
    ["catálogo", "Catálogo público"]
  ];

  const itens = padrao.map(([chave, titulo]) => {
    const problema = falhas.get(chave);
    if (!problema) return { tipo: "ok", icone: "✓", titulo, texto: "Requisito atendido" };
    const bloqueado = (item.bloqueios || []).includes(problema);
    const pendente = (item.pendencias || []).includes(problema);
    return {
      tipo: bloqueado ? "error" : pendente ? "warning" : "notice",
      icone: bloqueado ? "✕" : "!",
      titulo,
      texto: problema.mensagem
    };
  });

  (item.avisos || []).forEach((aviso) => {
    if (!padrao.some(([chave]) => chave === String(aviso.campo || "").toLowerCase())) {
      itens.push({ tipo: "notice", icone: "i", titulo: aviso.campo || "Aviso", texto: aviso.mensagem });
    }
  });
  return itens;
}

function renderizarResumoExecutivo(resultado) {
  const painel = document.getElementById("publicacao-resumo-executivo");
  if (!painel) return;
  const total = resultado?.totalCadastradas || 0;
  if (!total) {
    painel.className = "publication-summary publication-summary--empty";
    painel.innerHTML = '<strong>Aguardando emissoras</strong><span>Cadastre ao menos uma emissora para iniciar a análise.</span>';
    return;
  }
  const aptas = resultado?.totalAptas || 0;
  const pendentes = resultado?.totalPendentes || 0;
  const bloqueadas = resultado?.totalBloqueadas || 0;
  const pronto = aptas > 0;
  painel.className = `publication-summary ${pronto ? "publication-summary--success" : "publication-summary--danger"}`;
  painel.innerHTML = `<div><span>${pronto ? "✓" : "!"}</span><div><strong>${pronto ? "Catálogo apto para publicação" : "Publicação bloqueada"}</strong><small>${pronto ? `${aptas} emissora(s) pronta(s) serão incluídas nos arquivos oficiais.` : "Nenhuma emissora atende aos requisitos mínimos."}</small></div></div><dl><div><dt>Analisadas</dt><dd>${total}</dd></div><div><dt>Prontas</dt><dd>${aptas}</dd></div><div><dt>Pendentes</dt><dd>${pendentes}</dd></div><div><dt>Bloqueadas</dt><dd>${bloqueadas}</dd></div></dl>`;
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
function ativarGeradoresPublicacao(){["publicacao-gerar-radios-button","publicacao-gerar-esp32-button"].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=false;});atualizarEstadoBotaoGithub();}
function desativarGeradoresPublicacao(){["publicacao-gerar-radios-button","publicacao-gerar-esp32-button"].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=true;});atualizarEstadoBotaoGithub();}
function definirTexto(id,valor){const e=document.getElementById(id);if(e)e.textContent=String(valor);}

function criarBotaoPublicarGithub() {
  if (document.getElementById("publicacao-publicar-github-button")) return;
  const area=document.getElementById("publicacao-validar-button")?.parentElement;if(!area)return;
  const botao=document.createElement("button");botao.id="publicacao-publicar-github-button";botao.type="button";botao.className="primary-button";botao.textContent="🚀 Publicar no GitHub";
  botao.disabled=true;botao.title="Execute a validação antes de publicar.";
  botao.addEventListener("click", publicarBancosNoGithub);area.appendChild(botao);
}
function atualizarEstadoBotaoGithub(){const botao=document.getElementById("publicacao-publicar-github-button");if(!botao)return;const pronto=Boolean(EmissorasAdmin?.ultimoRelatorioValidacao?.valido&&EmissorasAdmin?.ultimoBancoOficial&&EmissorasAdmin?.ultimoBancoEsp32);botao.disabled=!pronto;botao.title=pronto?"Publicar os bancos validados no GitHub.":"Execute Validar e preparar antes de publicar.";}
async function publicarBancosNoGithub(){
  if(!EmissorasAdmin?.ultimoRelatorioValidacao?.valido||!EmissorasAdmin.ultimoBancoOficial||!EmissorasAdmin.ultimoBancoEsp32){alert("Primeiro valide o banco e confirme que existe ao menos uma emissora apta.");return;}
  const chave=window.prompt("Digite a chave de publicação criada na Cloudflare:");if(!chave?.trim())return;
  const botao=document.getElementById("publicacao-publicar-github-button");const original=botao?.textContent;if(botao){botao.disabled=true;botao.textContent="Publicando...";}
  try{const resposta=await fetch(PUBLICADOR_URL,{method:"POST",headers:{"Content-Type":"application/json","X-Publication-Key":chave.trim()},body:JSON.stringify({radios:EmissorasAdmin.ultimoBancoOficial,radiosEsp32:EmissorasAdmin.ultimoBancoEsp32,mensagem:"Commit 20 - Refinamentos da publicação inteligente"})});const resultado=await resposta.json();if(!resposta.ok||!resultado.ok)throw new Error(resultado.erro||"Não foi possível concluir a publicação.");atualizarBadgePublicacao("success","Publicado com sucesso");alert("Publicação concluída. Somente emissoras aptas foram enviadas.");}
  catch(erro){console.error(erro);atualizarBadgePublicacao("error","Falha na publicação");alert(`Falha na publicação:\n\n${erro.message}`);}finally{if(botao){botao.textContent=original;}atualizarEstadoBotaoGithub();}
}
