/**
 * Módulo inicial da Central de Publicação Oficial.
 */

function carregarPublicacao() {
  const conteudo = document.getElementById("page-content");

  if (!conteudo) {
    console.error("Área principal do painel não encontrada.");
    return;
  }

  conteudo.innerHTML = `
    <section class="publicacao-page">
      <div class="publicacao-header">
        <div>
          <span class="status-badge loading">
            Aguardando verificação
          </span>

          <h2>Publicação Oficial</h2>

          <p>
            Valide e prepare os bancos oficiais utilizados pelo catálogo
            público e pelo ESP32.
          </p>
        </div>

        <div class="publicacao-actions">
          <button
            id="publicacao-validar-button"
            class="secondary-button"
            type="button"
          >
            ✓ Validar banco
          </button>

          <button
            id="publicacao-gerar-button"
            class="secondary-button"
            type="button"
            disabled
          >
            ⬇ Gerar arquivos
          </button>

          <button
            id="publicacao-publicar-button"
            class="primary-button"
            type="button"
            disabled
          >
            🚀 Publicar
          </button>
        </div>
      </div>

      <section class="publicacao-grid">
        <article class="publicacao-card">
          <span>Versão do painel</span>
          <strong>${CONFIG.VERSION || "2.4.0"}</strong>
        </article>

        <article class="publicacao-card">
          <span>Emissoras cadastradas</span>
          <strong id="publicacao-total-emissoras">0</strong>
        </article>

        <article class="publicacao-card">
          <span>Streams cadastrados</span>
          <strong id="publicacao-total-streams">0</strong>
        </article>

        <article class="publicacao-card">
          <span>Última validação</span>
          <strong id="publicacao-ultima-validacao">Nunca</strong>
        </article>
      </section>

      <section class="publicacao-status-panel">
        <h3>Status do banco</h3>

        <div class="publicacao-status-list">
          <div class="publicacao-status-item">
            <span>Validação geral</span>
            <strong>Não executada</strong>
          </div>

          <div class="publicacao-status-item">
            <span>radios.json oficial</span>
            <strong>Não gerado</strong>
          </div>

          <div class="publicacao-status-item">
            <span>radios-esp32.json</span>
            <strong>Não gerado</strong>
          </div>

          <div class="publicacao-status-item">
            <span>Publicação</span>
            <strong>Não publicada</strong>
          </div>
        </div>

        <div class="publicacao-note">
          <strong>Commit 14.1</strong>

          <p>
            Esta etapa prepara a Central de Publicação.
            A validação e a geração automática serão conectadas
            nas próximas partes.
          </p>
        </div>
      </section>
    </section>
  `;

  atualizarResumoPublicacao();
  registrarEventosPublicacao();
}

function atualizarResumoPublicacao() {
  const emissoras = obterEmissorasPublicacao();

  const totalStreams = emissoras.reduce((total, emissora) => {
    if (!Array.isArray(emissora.streams)) {
      return total;
    }

    return total + emissora.streams.length;
  }, 0);

  const totalEmissorasElemento = document.getElementById(
    "publicacao-total-emissoras"
  );

  const totalStreamsElemento = document.getElementById(
    "publicacao-total-streams"
  );

  if (totalEmissorasElemento) {
    totalEmissorasElemento.textContent = emissoras.length;
  }

  if (totalStreamsElemento) {
    totalStreamsElemento.textContent = totalStreams;
  }
}

function obterEmissorasPublicacao() {
  const chavesPossiveis = [
    CONFIG.EMISSORAS_STORAGE_KEY,
    "centralRadiosBrasil_emissoras",
    "emissoras"
  ].filter(Boolean);

  for (const chave of chavesPossiveis) {
    try {
      const conteudoSalvo = localStorage.getItem(chave);

      if (!conteudoSalvo) {
        continue;
      }

      const dados = JSON.parse(conteudoSalvo);

      if (Array.isArray(dados)) {
        return dados;
      }
    } catch (erro) {
      console.warn(
        `Não foi possível ler as emissoras da chave ${chave}.`,
        erro
      );
    }
  }

  return [];
}

function registrarEventosPublicacao() {
  const validarButton = document.getElementById(
    "publicacao-validar-button"
  );

  validarButton?.addEventListener("click", () => {
    alert(
      "A validação real será conectada na próxima parte do Commit 14.1."
    );
  });
}
