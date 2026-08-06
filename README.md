# Central Rádios Brasil — Painel Administrativo v3.14.0

Esta versão reorganiza o Dashboard operacional e remove da interface o módulo **Gestão Comercial**, que não será mais utilizado neste Painel Administrativo.


## v3.14.0 — Central de Alertas e Pendências

A nova opção **🧭 Central** reúne em uma única fila as tarefas que exigem atenção administrativa. Ela sincroniza os módulos existentes, preserva as decisões no D1 e oferece prioridade, status, observações, histórico, filtros, paginação, CSV e atalho para o módulo responsável.

A Central não executa ações destrutivas. Resolver uma pendência na fila não suspende rádio, não altera cadastro e não remove audiência; a ação operacional continua sendo feita no módulo de origem.

## Módulos ativos

- Dashboard
- Central de Alertas e Pendências
- Auditoria de Audiência
- Gestão de Emissoras e Qualidade
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

Esta versão utiliza o **Worker/API 1.20.0** para persistir a fila e o histórico no D1. As tabelas são criadas automaticamente, sem SQL manual. O Site/PWA 22.18.0, o banco público de rádios e o firmware não são alterados. As rotas anteriores permanecem compatíveis.



## v3.13.1 — Layout Amplo Global

- Reduz a largura do menu lateral no computador.
- Remove o limite central de 1600 px e aproxima o conteúdo da lateral.
- Reduz margens internas em todos os módulos.
- Ajusta as tabelas de Qualidade e Audiência para exibir mais colunas sem rolagem.
- Mantém integralmente as funções da v3.13.0.

## v3.13.0 — Gestão de Emissoras e Qualidade

Novo módulo **🛡️ Qualidade** com score de 0 a 100, completude dos campos essenciais, saúde técnica dos streams, filtros, revisão por grupos, exportação CSV e atalhos seguros para edição e preparação de suspensão. A disponibilidade real de sites externos não é testada; apenas presença e formato das URLs. O monitoramento de stream continua vindo do Worker/API 1.19.1.
