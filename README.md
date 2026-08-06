# Central Rádios Brasil — Painel Administrativo v3.11.1

Esta versão reorganiza o Dashboard operacional e remove da interface o módulo **Gestão Comercial**, que não será mais utilizado neste Painel Administrativo.

## Módulos ativos

- Dashboard
- Solicitações
- Ocorrências
- Streaming CRB
- E-mails
- Emissoras
- Publicação
- Rádios
- Estados
- Cidades
- Categorias
- Streams
- Configurações

## Isolamento

A alteração é exclusiva do repositório do Admin. Worker, D1, Portal Público/PWA, Portal do Cliente e firmware não foram modificados. As rotas comerciais do Worker permanecem intactas para compatibilidade e eventual uso futuro por outros sistemas.


## v3.13.0 — Gestão de Emissoras e Qualidade

Novo módulo **🛡️ Qualidade** com score de 0 a 100, completude dos campos essenciais, saúde técnica dos streams, filtros, revisão por grupos, exportação CSV e atalhos seguros para edição e preparação de suspensão. A disponibilidade real de sites externos não é testada; apenas presença e formato das URLs. O monitoramento de stream continua vindo do Worker/API 1.19.1.
