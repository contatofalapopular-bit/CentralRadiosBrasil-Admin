let radiosInicializadas = false;
let estadosInicializados = false;
let categoriasInicializadas = false;
let cidadesInicializadas = false;
let streamsInicializados = false;
let emissorasInicializadas = false;
let publicacaoInicializada = false;
let solicitacoesInicializadas = false;
let emailsInicializados = false;
let streamingInteressesInicializados = false;
let ocorrenciasInicializadas = false;
let audienciaInicializada = false;
let qualidadeInicializada = false;
let centralInicializada = false;

document.addEventListener("DOMContentLoaded", () => {
  texto("app-version", `v${CONFIG.VERSION}`);
  document.body.dataset.appVersion = CONFIG.VERSION;
  console.info(
    `${CONFIG.APP_NAME} — Base Oficial v${CONFIG.VERSION}`
  );

  document
    .getElementById("refresh-button")
    .addEventListener("click", () => {
      if (rotaAtual() === "dashboard") {
        carregarDashboard(true);
      } else if (rotaAtual() === "central") {
        CentralPendenciasAdmin.carregar(true);
      } else if (rotaAtual() === "audiencia") {
        AudienciaAdmin.carregar(true);
      } else if (rotaAtual() === "qualidade") {
        QualidadeAdmin.carregar(true);
      } else if (rotaAtual() === "solicitacoes") {
        SolicitacoesAdmin.carregar();
      } else if (rotaAtual() === "emails") {
        EmailsAdmin.carregar();
      } else if (rotaAtual() === "streaming-interesses") {
        StreamingInteressesAdmin.carregar();
      } else if (rotaAtual() === "ocorrencias") {
        OcorrenciasAdmin.carregar();
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
      } else if (rotaAtual() === "emissoras") {
        EmissorasAdmin.renderizar();
      } else if (rotaAtual() === "publicacao") {
        atualizarResumoPublicacao();
      }
    });

  document
    .getElementById("retry-button")
    .addEventListener("click", () => {
      carregarDashboard(true);
    });

  document
    .getElementById("theme-toggle")
    .addEventListener("click", () => {
      const escuro =
        document.body.classList.toggle("dark-theme");

      localStorage.setItem(
        "crb-theme",
        escuro ? "dark" : "light"
      );

      atualizarTema();
    });

  if (localStorage.getItem("crb-theme") === "dark") {
    document.body.classList.add("dark-theme");
  }

  atualizarTema();

  window.addEventListener(
    "hashchange",
    renderizarRota
  );

  renderizarRota();
});

function atualizarTema() {
  document.getElementById("theme-toggle").textContent =
    document.body.classList.contains("dark-theme")
      ? "☀️ Tema claro"
      : "🌙 Tema escuro";
}

function rotaAtual() {
  return (
    window.location.hash.replace("#/", "") ||
    "dashboard"
  );
}

async function renderizarRota() {
  const rota = rotaAtual();

  const paginas = {
    dashboard: document.getElementById("dashboard-page"),
    central: document.getElementById("central-page"),
    audiencia: document.getElementById("audiencia-page"),
    qualidade: document.getElementById("qualidade-page"),
    solicitacoes:
      document.getElementById("solicitacoes-page"),
    ocorrencias: document.getElementById("ocorrencias-page"),
    emails: document.getElementById("emails-page"),
    "streaming-interesses": document.getElementById("streaming-interesses-page"),
    radios: document.getElementById("radios-page"),
    estados: document.getElementById("estados-page"),
    categorias: document.getElementById("categorias-page"),
    cidades: document.getElementById("cidades-page"),
    streams: document.getElementById("streams-page"),
    emissoras: document.getElementById("emissoras-page"),
    publicacao: document.getElementById("publicacao-page"),
    configuracoes:
      document.getElementById("configuracoes-page")
  };

  const rotasValidas = Object.keys(paginas);
  const rotaValida = rotasValidas.includes(rota);
  const rotaFinal = rotaValida ? rota : "dashboard";

  if (!rotaValida) {
    window.location.hash = "#/dashboard";
    return;
  }

  Object.entries(paginas).forEach(
    ([nome, elemento]) => {
      elemento?.classList.toggle(
        "hidden",
        nome !== rotaFinal
      );
    }
  );

  document
    .querySelectorAll(".nav-link[data-route]")
    .forEach((link) => {
      link.classList.toggle(
        "active",
        link.dataset.route === rotaFinal
      );
    });

  if (rotaFinal === "central") {
    texto("page-title", "Central de Alertas e Pendências");
    texto("page-subtitle", "Fila consolidada, prioridades, decisões e atalhos operacionais");
    if (!centralInicializada) {
      centralInicializada = true;
      await CentralPendenciasAdmin.iniciar();
    } else {
      await CentralPendenciasAdmin.carregar(false);
    }
  } else if (rotaFinal === "qualidade") {
    texto("page-title", "Gestão de Emissoras e Qualidade");
    texto("page-subtitle", "Saúde técnica, completude cadastral e prontidão do catálogo");
    if (!qualidadeInicializada) {
      qualidadeInicializada = true;
      await QualidadeAdmin.iniciar();
    } else {
      await QualidadeAdmin.carregar();
    }
  } else if (rotaFinal === "audiencia") {
    texto("page-title", "Auditoria de Audiência");
    texto("page-subtitle", "Reproduções válidas, redes, duplicidades e sinais de anomalia");
    if (!audienciaInicializada) {
      audienciaInicializada = true;
      await AudienciaAdmin.iniciar();
    } else {
      await AudienciaAdmin.carregar();
    }
  } else if (rotaFinal === "ocorrencias") {
    texto("page-title", "Ocorrências");
    texto("page-subtitle", "Relatos públicos, suporte e confiabilidade do catálogo");
    if (!ocorrenciasInicializadas) {
      ocorrenciasInicializadas = true;
      await OcorrenciasAdmin.iniciar();
    } else {
      await OcorrenciasAdmin.carregar();
    }
  } else if (rotaFinal === "streaming-interesses") {
    texto("page-title", "Streaming CRB");

    texto(
      "page-subtitle",
      "Pré-cadastros e oportunidades comerciais do serviço de streaming"
    );

    if (!streamingInteressesInicializados) {
      streamingInteressesInicializados = true;
      await StreamingInteressesAdmin.iniciar();
    } else {
      await StreamingInteressesAdmin.carregar();
    }
  } else if (rotaFinal === "emails") {
    texto("page-title", "E-mails");

    texto(
      "page-subtitle",
      "Atendimento por suporte@centralradiosbrasil.com.br"
    );

    if (!emailsInicializados) {
      emailsInicializados = true;
      await EmailsAdmin.iniciar();
    } else {
      await EmailsAdmin.carregar();
    }
  } else if (rotaFinal === "solicitacoes") {
    texto("page-title", "Solicitações");

    texto(
      "page-subtitle",
      "Análise dos cadastros enviados pelo Portal da Emissora"
    );

    if (!solicitacoesInicializadas) {
      solicitacoesInicializadas = true;
      await SolicitacoesAdmin.iniciar();
    } else {
      await SolicitacoesAdmin.carregar();
    }
  } else if (rotaFinal === "configuracoes") {
    texto("page-title", "Configurações");

    texto(
      "page-subtitle",
      "Preferências e informações técnicas do painel"
    );
  } else if (rotaFinal === "publicacao") {
    texto("page-title", "Publicação");

    texto(
      "page-subtitle",
      "Validação e preparação do banco oficial"
    );

    if (!emissorasInicializadas) {
      emissorasInicializadas = true;
      await EmissorasAdmin.iniciar();
    }

    if (!publicacaoInicializada) {
      publicacaoInicializada = true;
      iniciarPublicacao();
    } else {
      atualizarResumoPublicacao();
    }
  } else if (rotaFinal === "emissoras") {
    texto("page-title", "Emissoras");

    texto(
      "page-subtitle",
      "Cadastro Nacional de Emissoras"
    );

    if (!emissorasInicializadas) {
      emissorasInicializadas = true;
      await EmissorasAdmin.iniciar();
    } else {
      EmissorasAdmin.renderizar();
    }
    QualidadeAdmin.aplicarAcaoPendenteEmissoras();
  } else if (rotaFinal === "streams") {
    texto("page-title", "Streams");

    texto(
      "page-subtitle",
      "Cadastro e verificação dos links de transmissão"
    );

    if (!streamsInicializados) {
      streamsInicializados = true;
      await StreamsAdmin.iniciar();
    } else {
      StreamsAdmin.renderizar();
    }
  } else if (rotaFinal === "cidades") {
    texto("page-title", "Cidades");

    texto(
      "page-subtitle",
      "Base nacional de municípios brasileiros"
    );

    if (!cidadesInicializadas) {
      cidadesInicializadas = true;
      await CidadesAdmin.iniciar();
    } else {
      CidadesAdmin.renderizar();
    }
  } else if (rotaFinal === "categorias") {
    texto("page-title", "Categorias");

    texto(
      "page-subtitle",
      "Cadastro e organização das categorias de rádio"
    );

    if (!categoriasInicializadas) {
      categoriasInicializadas = true;
      CategoriasAdmin.iniciar();
    } else {
      CategoriasAdmin.renderizar();
    }
  } else if (rotaFinal === "estados") {
    texto("page-title", "Estados");

    texto(
      "page-subtitle",
      "Cadastro e organização dos estados brasileiros"
    );

    if (!estadosInicializados) {
      estadosInicializados = true;
      EstadosAdmin.iniciar();
    } else {
      EstadosAdmin.renderizar();
    }
  } else if (rotaFinal === "radios") {
    texto("page-title", "Rádios");

    texto(
      "page-subtitle",
      "Gerenciamento do catálogo de emissoras"
    );

    if (!radiosInicializadas) {
      radiosInicializadas = true;
      await RadiosAdmin.iniciar();
    } else {
      RadiosAdmin.renderizar();
    }
  } else {
    texto("page-title", "Dashboard");

    texto(
      "page-subtitle",
      "Alertas, atividades e dados oficiais da operação"
    );

    carregarDashboard();
  }
}
