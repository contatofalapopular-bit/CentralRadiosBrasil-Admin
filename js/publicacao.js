/**
 * Commit 21.1 — Ajustes finais da Publicação Inteligente
 * Fecha o módulo com rastreabilidade, histórico, status de sincronização e ações por emissora.
 */
let publicacaoEventosRegistrados = false;
const PUBLICADOR_URL = "https://broken-bar-45e2.contatofalapopular.workers.dev/publicar";
const PUBLICACAO_HISTORICO_KEY = "crb-admin-publicacao-historico-v1";
const PUBLICACAO_VALIDACAO_KEY = "crb-admin-publicacao-ultima-validacao-v1";

function iniciarPublicacao() {
  registrarEventosPublicacao();
  atualizarResumoPublicacao();
  renderizarMetadadosPublicacao();
  renderizarHistoricoPublicacao();
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
  atualizarSincronizacaoPublicacao();

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
  document.getElementById("publicacao-avaliacoes-list")?.addEventListener("click", (evento) => {
    if (evento.target.closest("[data-open-emissoras]")) window.location.hash = "#/emissoras";
  });
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
    salvarUltimaValidacao(resultado);
    ativarGeradoresPublicacao();
    definirTexto("publicacao-resumo", `${resultado.totalAptas} emissora(s) apta(s) serão incluídas. ${resultado.totalPendentes} pendente(s) e ${resultado.totalBloqueadas} bloqueada(s) ficarão fora dos arquivos.`);
  } else {
    salvarUltimaValidacao(resultado);
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

  const registroValidacao = obterUltimaValidacao();
  const metadados = `<div class="readiness-validation-meta"><div><span>Última validação</span><strong>${escaparHtml(formatarDataHora(registroValidacao?.data))}</strong></div><div><span>Status do catálogo</span><strong class="${registroValidacao?.valido ? "is-synced" : "is-pending"}">${registroValidacao?.valido ? "✓ Catálogo validado" : "Aguardando validação"}</strong></div></div>`;

  lista.innerHTML = metadados + avaliacoes.map((item) => {
    const rotulo = item.classificacao === "apta" ? "PRONTA PARA PUBLICAÇÃO" : item.classificacao === "pendente" ? "PENDENTE" : "BLOQUEADA";
    const classeFaixa = obterClasseProntidao(item.prontidao);
    const requisitos = montarRequisitosPublicacao(item);

    return `<article class="readiness-card readiness-card--${item.classificacao}">
      <div class="readiness-head">
        <div class="readiness-title"><span class="readiness-radio-icon" aria-hidden="true">📻</span><div><strong>${escaparHtml(item.nome)}</strong><span class="readiness-status readiness-status--${item.classificacao}"><span class="readiness-status-dot" aria-hidden="true"></span>${rotulo}</span></div></div>
        <div class="readiness-head-actions"><b>${item.prontidao}%</b><button type="button" class="secondary-button readiness-open-button readiness-open-button--top" data-open-emissoras="1">Ver cadastro</button></div>
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
  atualizarSincronizacaoPublicacao("publishing");
  try{
    const resposta=await fetch(PUBLICADOR_URL,{method:"POST",headers:{"Content-Type":"application/json","X-Publication-Key":chave.trim()},body:JSON.stringify({radios:EmissorasAdmin.ultimoBancoOficial,radiosEsp32:EmissorasAdmin.ultimoBancoEsp32,mensagem:"Commit 21 - Conclusão da Publicação Inteligente"})});
    const resultado=await resposta.json();
    if(!resposta.ok||!resultado.ok)throw new Error(resultado.erro||"Não foi possível concluir a publicação.");
    const aptas=EmissorasAdmin.ultimoRelatorioValidacao?.totalAptas||0;
    registrarHistoricoPublicacao({status:"success",aptas,mensagem:"radios.json e radios-esp32.json publicados no GitHub"});
    atualizarBadgePublicacao("success","Publicado com sucesso");
    atualizarSincronizacaoPublicacao("synced");
    renderizarHistoricoPublicacao();
    mostrarResultadoPublicacao(true, aptas);
  }
  catch(erro){
    console.error(erro);
    registrarHistoricoPublicacao({status:"error",aptas:0,mensagem:erro.message});
    atualizarBadgePublicacao("error","Falha na publicação");
    atualizarSincronizacaoPublicacao("error");
    renderizarHistoricoPublicacao();
    mostrarResultadoPublicacao(false,0,erro.message);
  }finally{if(botao){botao.textContent=original;}atualizarEstadoBotaoGithub();}
}

function salvarUltimaValidacao(resultado){
  const registro={data:new Date().toISOString(),valido:Boolean(resultado?.valido),aptas:resultado?.totalAptas||0,pendentes:resultado?.totalPendentes||0,bloqueadas:resultado?.totalBloqueadas||0};
  localStorage.setItem(PUBLICACAO_VALIDACAO_KEY,JSON.stringify(registro));
  renderizarMetadadosPublicacao();
  atualizarSincronizacaoPublicacao("validated");
}
function obterUltimaValidacao(){try{return JSON.parse(localStorage.getItem(PUBLICACAO_VALIDACAO_KEY)||"null");}catch{return null;}}
function formatarDataHora(iso){if(!iso)return "Ainda não realizada";const data=new Date(iso);if(Number.isNaN(data.getTime()))return "Data indisponível";return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(data);}
function renderizarMetadadosPublicacao(){const registro=obterUltimaValidacao();definirTexto("publicacao-ultima-validacao",formatarDataHora(registro?.data));}
function atualizarSincronizacaoPublicacao(estado){
  const el=document.getElementById("publicacao-sync-status");if(!el)return;
  const validado=Boolean(EmissorasAdmin?.ultimoRelatorioValidacao?.valido);
  const mapa={publishing:["syncing","Publicando arquivos..."],synced:["synced","Catálogo sincronizado"],error:["error","Falha na sincronização"],validated:["ready","Validado — aguardando publicação"]};
  const [classe,texto]=mapa[estado]||(!validado?["stale","Catálogo ainda não validado"]:["ready","Validado — aguardando publicação"]);
  el.className=`publication-sync publication-sync--${classe}`;el.textContent=texto;
}
function obterHistoricoPublicacao(){try{const dados=JSON.parse(localStorage.getItem(PUBLICACAO_HISTORICO_KEY)||"[]");return Array.isArray(dados)?dados:[];}catch{return [];}}
function registrarHistoricoPublicacao(item){const historico=obterHistoricoPublicacao();historico.unshift({...item,data:new Date().toISOString()});localStorage.setItem(PUBLICACAO_HISTORICO_KEY,JSON.stringify(historico.slice(0,8)));}
function renderizarHistoricoPublicacao(){
  const lista=document.getElementById("publicacao-historico-list");if(!lista)return;const historico=obterHistoricoPublicacao();
  if(!historico.length){lista.innerHTML='<div class="publication-history-empty">Nenhuma publicação registrada neste navegador.</div>';return;}
  lista.innerHTML=historico.map(item=>`<div class="publication-history-item publication-history-item--${item.status}"><span>${item.status==="success"?"✓":"!"}</span><div><strong>${item.status==="success"?`${item.aptas} emissora(s) publicada(s)`:"Publicação não concluída"}</strong><small>${escaparHtml(item.mensagem||"")} · ${formatarDataHora(item.data)}</small></div></div>`).join("");
}
function mostrarResultadoPublicacao(sucesso,aptas,erro=""){
  const painel=document.getElementById("publicacao-resultado-operacao");if(!painel)return;
  painel.className=`publication-result publication-result--${sucesso?"success":"error"}`;
  painel.innerHTML=sucesso?`<strong>✓ Publicação concluída</strong><span>✓ radios.json publicado</span><span>✓ radios-esp32.json publicado</span><span>✓ GitHub sincronizado</span><span>✓ ${aptas} emissora(s) incluída(s)</span>`:`<strong>✕ Publicação não concluída</strong><span>${escaparHtml(erro)}</span>`;
  painel.hidden=false;
}
