let carregando = false;

async function carregarDashboard(semCache = false) {
  if (carregando) return;
  carregando = true;
  estado("loading", "Carregando dados do GitHub");
  document.getElementById("refresh-button").disabled = true;
  document.getElementById("error-panel").classList.add("hidden");

  try {
    const [docRadios, docCategorias, docVersao] = await Promise.all([
      API.carregar("radios.json", semCache),
      API.carregar("categorias.json", semCache),
      API.carregar("versao.json", semCache)
    ]);

    const radios = Array.isArray(docRadios) ? docRadios : (docRadios.radios || []);
    const cidades = new Set();
    const estados = new Set();
    const categorias = new Set();
    let streams = 0, online = 0, offline = 0, verificadas = 0;

    radios.forEach(radio => {
      const cidade = radio.localizacao?.cidade ?? radio.cidade ?? "";
      const uf = radio.localizacao?.uf ?? radio.uf ?? "";
      if (cidade) cidades.add(normalizar(cidade));
      if (uf) estados.add(String(uf).toUpperCase());
      if (radio.categoriaPrincipal) categorias.add(normalizar(radio.categoriaPrincipal));
      (radio.categorias || []).forEach(c => categorias.add(normalizar(c)));
      if (radio.verificada === true) verificadas++;
      const lista = Array.isArray(radio.streams) ? radio.streams : [];
      streams += lista.length;
      lista.forEach(stream => {
        const status = stream.monitoramento?.status ?? stream.status ?? radio.status ?? "nao_testado";
        if (status === "online") online++;
        if (status === "offline") offline++;
      });
    });

    const categoriasOficiais = (docCategorias.categorias || []).filter(c => c.ativa !== false).length;

    texto("total-radios", radios.length);
    texto("total-cidades", cidades.size);
    texto("total-estados", estados.size);
    texto("total-categorias", categorias.size || categoriasOficiais);
    texto("total-streams", streams);
    texto("total-online", online);
    texto("total-offline", offline);
    texto("total-verificadas", verificadas);
    texto("dataset-version", docVersao.datasetVersion ?? docRadios.schemaVersion ?? "1.0.0");
    texto("last-update", `Última atualização: ${formatarData(docVersao.generatedAt ?? docRadios.generatedAt)}`);

    estado("success", "Banco de dados conectado");
  } catch (erro) {
    console.error(erro);
    estado("error", "Falha na conexão");
    texto("error-message", `${erro.message}. Verifique se o repositório de dados está público e se a branch configurada está correta.`);
    document.getElementById("error-panel").classList.remove("hidden");
  } finally {
    carregando = false;
    const botao = document.getElementById("refresh-button");
    botao.disabled = false;
    botao.textContent = "↻ Atualizar dados";
  }
}

function estado(tipo, mensagem) {
  const badge = document.getElementById("connection-badge");
  badge.className = `status-badge ${tipo}`;
  badge.textContent = mensagem;
}
