/**
 * Central de Publicação Oficial
 * Commit 14.1
 *
 * Este módulo reutiliza a validação e os geradores já existentes
 * no módulo de Emissoras, evitando duplicação de regras.
 */

let publicacaoEventosRegistrados = false;

/**
 * Inicializa a página de Publicação.
 *
 * Esta função é chamada pelo app.js na primeira abertura da rota.
 */
function iniciarPublicacao() {
  registrarEventosPublicacao();
  atualizarResumoPublicacao();
}

/**
 * Atualiza os números e o estado visual da Central de Publicação.
 */
function atualizarResumoPublicacao() {
  const resumo = obterResumoPublicacao();

  definirTexto(
    "publicacao-total-emissoras",
    resumo.totalEmissoras
  );

  definirTexto(
    "publicacao-total-publicaveis",
    resumo.totalPublicaveis
  );

  definirTexto(
    "publicacao-total-erros",
    resumo.totalErros
  );

  definirTexto(
    "publicacao-total-avisos",
    resumo.totalAvisos
  );

  atualizarStatusPublicacao(resumo);
}

/**
 * Obtém os dados disponíveis no painel e no armazenamento local.
 */
function obterResumoPublicacao() {
  const emissoras = obterEmissorasPublicacao();

  const totalEmissorasPainel = obterNumeroElemento(
    "emissoras-total-count"
  );

  const totalErros = obterNumeroElemento(
    "validation-errors-count"
  );

  const totalAvisos = obterNumeroElemento(
    "validation-warnings-count"
  );

  const totalPublicaveisModal = obterNumeroElemento(
    "validation-public-count"
  );

  const totalEmissoras =
    totalEmissorasPainel > 0
      ? totalEmissorasPainel
      : emissoras.length;

  const totalPublicaveis =
    totalPublicaveisModal > 0
      ? totalPublicaveisModal
      : Math.max(totalEmissoras - totalErros, 0);

  return {
    totalEmissoras,
    totalPublicaveis,
    totalErros,
    totalAvisos
  };
}

/**
 * Procura o banco de emissoras salvo no navegador.
 */
function obterEmissorasPublicacao() {
  const chavesPossiveis = [
    CONFIG.EMISSORAS_STORAGE_KEY,
    CONFIG.RADIOS_STORAGE_KEY,
    "centralRadiosBrasil_emissoras",
    "central-radios-brasil-emissoras",
    "crb-emissoras",
    "emissoras"
  ].filter(Boolean);

  for (const chave of chavesPossiveis) {
    try {
      const conteudoSalvo = localStorage.getItem(chave);

      if (!conteudoSalvo) {
        continue;
      }

      const dados = JSON.parse(conteudoSalvo);
      const emissoras = extrairListaEmissoras(dados);

      if (emissoras.length > 0) {
        return emissoras;
      }
    } catch (erro) {
      console.warn(
        `Não foi possível ler o banco salvo em "${chave}".`,
        erro
      );
    }
  }

  return [];
}

/**
 * Aceita bancos salvos como array ou dentro de um objeto.
 */
function extrairListaEmissoras(dados) {
  if (Array.isArray(dados)) {
    return dados;
  }

  if (!dados || typeof dados !== "object") {
    return [];
  }

  const propriedadesPossiveis = [
    "emissoras",
    "radios",
    "items",
    "dados"
  ];

  for (const propriedade of propriedadesPossiveis) {
    if (Array.isArray(dados[propriedade])) {
      return dados[propriedade];
    }
  }

  return [];
}

/**
 * Registra os eventos somente uma vez.
 */
function registrarEventosPublicacao() {
  if (publicacaoEventosRegistrados) {
    return;
  }

  publicacaoEventosRegistrados = true;

  const atualizarButton = document.getElementById(
    "publicacao-refresh-button"
  );

  const validarButton = document.getElementById(
    "publicacao-validar-button"
  );

  const gerarRadiosButton = document.getElementById(
    "publicacao-gerar-radios-button"
  );

  const gerarEsp32Button = document.getElementById(
    "publicacao-gerar-esp32-button"
  );

  atualizarButton?.addEventListener("click", () => {
    atualizarResumoPublicacao();
  });

  validarButton?.addEventListener("click", () => {
    executarValidacaoPublicacao();
  });

  gerarRadiosButton?.addEventListener("click", () => {
    acionarGeradorExistente(
      "download-official-json-button",
      "radios.json"
    );
  });

  gerarEsp32Button?.addEventListener("click", () => {
    acionarGeradorExistente(
      "download-esp32-json-button",
      "radios-esp32.json"
    );
  });
}

/**
 * Reutiliza a validação já implementada no módulo de Emissoras.
 */
function executarValidacaoPublicacao() {
  const botaoValidacaoExistente = document.getElementById(
    "export-emissoras-button"
  );

  atualizarBadgePublicacao(
    "loading",
    "Validando banco"
  );

  definirTexto(
    "publicacao-resumo",
    "A validação do banco oficial está sendo executada."
  );

  limparProblemasPublicacao();

  if (!botaoValidacaoExistente) {
    atualizarBadgePublicacao(
      "error",
      "Validação indisponível"
    );

    adicionarProblemaPublicacao(
      "O botão de validação do módulo de Emissoras não foi encontrado."
    );

    desativarGeradoresPublicacao();
    return;
  }

  botaoValidacaoExistente.click();

  window.setTimeout(() => {
    concluirValidacaoPublicacao();
  }, 400);
}

/**
 * Lê o resultado produzido pela modal de validação existente.
 */
function concluirValidacaoPublicacao() {
  const resumo = obterResumoPublicacao();

  atualizarResumoPublicacao();
  importarProblemasDaValidacao();

  if (resumo.totalErros > 0) {
    atualizarBadgePublicacao(
      "error",
      "Banco com erros"
    );

    definirTexto(
      "publicacao-resumo",
      `${resumo.totalErros} erro(s) impedem a geração dos bancos oficiais.`
    );

    desativarGeradoresPublicacao();
    return;
  }

  atualizarBadgePublicacao(
    "success",
    "Banco validado"
  );

  definirTexto(
    "publicacao-resumo",
    resumo.totalAvisos > 0
      ? `Banco validado com ${resumo.totalAvisos} aviso(s) para revisão.`
      : "Banco validado com sucesso e pronto para gerar os arquivos oficiais."
  );

  ativarGeradoresPublicacao();
}

/**
 * Copia erros e avisos da validação existente para a nova página.
 */
function importarProblemasDaValidacao() {
  limparProblemasPublicacao();

  const listasOriginais = [
    document.getElementById("validation-errors-list"),
    document.getElementById("validation-warnings-list")
  ];

  let totalImportado = 0;

  listasOriginais.forEach((lista) => {
    if (!lista) {
      return;
    }

    lista.querySelectorAll("li").forEach((item) => {
      const mensagem = item.textContent.trim();

      if (!mensagem) {
        return;
      }

      adicionarProblemaPublicacao(mensagem);
      totalImportado += 1;
    });
  });

  if (totalImportado === 0) {
    adicionarProblemaPublicacao(
      "Nenhum problema impeditivo foi encontrado."
    );
  }
}

/**
 * Aciona os botões de download já existentes na modal.
 */
function acionarGeradorExistente(idBotao, nomeArquivo) {
  const botaoOriginal = document.getElementById(idBotao);

  if (!botaoOriginal) {
    atualizarBadgePublicacao(
      "error",
      "Gerador indisponível"
    );

    adicionarProblemaPublicacao(
      `O gerador de ${nomeArquivo} não foi encontrado.`
    );

    return;
  }

  botaoOriginal.click();

  atualizarBadgePublicacao(
    "success",
    "Arquivo preparado"
  );

  definirTexto(
    "publicacao-resumo",
    `${nomeArquivo} foi preparado para download.`
  );
}

/**
 * Atualiza o badge principal conforme os números conhecidos.
 */
function atualizarStatusPublicacao(resumo) {
  if (resumo.totalEmissoras === 0) {
    atualizarBadgePublicacao(
      "loading",
      "Aguardando verificação"
    );

    return;
  }

  if (resumo.totalErros > 0) {
    atualizarBadgePublicacao(
      "error",
      "Banco com erros"
    );

    desativarGeradoresPublicacao();
    return;
  }

  if (resumo.totalPublicaveis > 0) {
    atualizarBadgePublicacao(
      "success",
      "Banco disponível"
    );
  }
}

/**
 * Altera o texto e a classe do badge da página.
 */
function atualizarBadgePublicacao(tipo, mensagem) {
  const badge = document.getElementById(
    "publicacao-status-badge"
  );

  if (!badge) {
    return;
  }

  badge.classList.remove(
    "loading",
    "success",
    "error",
    "warning"
  );

  badge.classList.add(tipo);
  badge.textContent = mensagem;
}

function ativarGeradoresPublicacao() {
  const gerarRadiosButton = document.getElementById(
    "publicacao-gerar-radios-button"
  );

  const gerarEsp32Button = document.getElementById(
    "publicacao-gerar-esp32-button"
  );

  if (gerarRadiosButton) {
    gerarRadiosButton.disabled = false;
  }

  if (gerarEsp32Button) {
    gerarEsp32Button.disabled = false;
  }
}

function desativarGeradoresPublicacao() {
  const gerarRadiosButton = document.getElementById(
    "publicacao-gerar-radios-button"
  );

  const gerarEsp32Button = document.getElementById(
    "publicacao-gerar-esp32-button"
  );

  if (gerarRadiosButton) {
    gerarRadiosButton.disabled = true;
  }

  if (gerarEsp32Button) {
    gerarEsp32Button.disabled = true;
  }
}

function limparProblemasPublicacao() {
  const lista = document.getElementById(
    "publicacao-problemas-list"
  );

  if (lista) {
    lista.innerHTML = "";
  }
}

function adicionarProblemaPublicacao(mensagem) {
  const lista = document.getElementById(
    "publicacao-problemas-list"
  );

  if (!lista) {
    return;
  }

  const item = document.createElement("li");
  item.textContent = mensagem;
  lista.appendChild(item);
}

function obterNumeroElemento(id) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return 0;
  }

  const numero = Number.parseInt(
    elemento.textContent.replace(/\D/g, ""),
    10
  );

  return Number.isNaN(numero) ? 0 : numero;
}

function definirTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.textContent = String(valor);
  }
}
