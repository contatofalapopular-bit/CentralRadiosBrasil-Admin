# Central Rádios Brasil — Admin 3.14.0 + Worker 1.20.0

## Entrega

A Central de Alertas e Pendências reúne em uma fila administrativa os itens que exigem atenção em Solicitações, Alterações, Ocorrências, Streaming CRB, E-mails, Auditoria de Audiência, Gestão de Qualidade e Monitoramento de Streams.

## Recursos

- prioridades sugeridas e ajuste manual;
- estados Pendente, Em análise, Monitorando, Resolvida e Ignorada;
- observações e histórico persistidos no D1;
- sincronização com encerramento e reabertura automáticos quando a origem muda;
- preservação de pendências de uma fonte quando essa fonte falha durante a sincronização;
- pesquisa, filtros, paginação e CSV;
- atalho para o módulo responsável;
- card no Dashboard e badge no menu.

## Segurança operacional

A Central não publica, remove, suspende ou modifica emissoras automaticamente. Ela organiza o trabalho; a correção continua sendo confirmada no módulo responsável. As rotas exigem sessão administrativa e não expõem IPs ou hashes de audiência.

## Compatibilidade

- base anterior: Admin 3.13.1 e Worker 1.19.1;
- nova base: Admin 3.14.0 e Worker 1.20.0;
- Site/PWA 22.18.0 não foi alterado;
- não há SQL manual: as tabelas são criadas automaticamente.

## Validação executada

Foram executadas verificações de sintaxe de todos os JavaScript, verificação TypeScript do Worker, validação de HTML/IDs, JSON, testes de mapeamento das oito fontes e testes SQLite do schema, UPSERT, reabertura e filtros. A validação visual deve ser feita após a publicação no navegador real.
