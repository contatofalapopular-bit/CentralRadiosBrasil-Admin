const CONFIG = Object.freeze({
  APP_NAME: "Central Rádios Brasil",
  VERSION: "3.11.1",
  GITHUB_OWNER: "contatofalapopular-bit",
  DADOS_REPO: "CentralRadiosBrasil-Dados",
  DADOS_BRANCH: "main",
  WORKER_URL:
    "https://broken-bar-45e2.contatofalapopular.workers.dev",
  EMAIL_WORKER_URL:
    "https://crb-email.contatofalapopular.workers.dev",
  CLIENT_PORTAL_URL:
    "https://cliente.centralradiosbrasil.com.br",
  ADMIN_KEY_SESSION_STORAGE:
    "crb-admin-token-sessao-v2",
  REQUEST_TIMEOUT_MS: 15000,
  LOCAL_STORAGE_KEY: "crb-admin-radios-rascunho-v1",
  ESTADOS_STORAGE_KEY: "crb-admin-estados-rascunho-v1",
  CATEGORIAS_STORAGE_KEY: "crb-admin-categorias-rascunho-v1",
  CIDADES_STORAGE_KEY: "crb-admin-cidades-cache-v1",
  IBGE_MUNICIPIOS_URL:
    "https://servicodados.ibge.gov.br/api/v1/localidades/municipios",
  STREAMS_STORAGE_KEY: "crb-admin-streams-rascunho-v1",
  EMISSORAS_STORAGE_KEY: "crb-admin-emissoras-rascunho-v1",
  RADIOS_SCHEMA_VERSION: "3.1.4",
  ESP32_SCHEMA_VERSION: "1.0.0"
});
