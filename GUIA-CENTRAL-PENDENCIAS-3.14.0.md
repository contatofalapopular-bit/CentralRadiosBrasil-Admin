# Admin 3.14.0 + Worker 1.20.0 — Central de Alertas e Pendências

## Objetivo

Facilitar o trabalho administrativo reunindo, em uma única fila, os itens que exigem atenção nos módulos da Central Rádios Brasil.

## Fontes consolidadas

- Solicitações de cadastro pendentes ou em análise;
- Solicitações de alteração pendentes ou em análise;
- Ocorrências novas ou em análise;
- Novos interessados e leads qualificados do Streaming CRB;
- E-mails recebidos ainda não lidos;
- Rádios classificadas como Observar ou Revisar na Auditoria de Audiência;
- Emissoras em Atenção ou Crítica na Gestão de Qualidade;
- Streams instáveis, offline, retirados do portal ou suspensos.

## Fluxo de trabalho

Cada pendência recebe:

- prioridade sugerida: Baixa, Média, Alta ou Urgente;
- status administrativo: Pendente, Em análise, Monitorando, Resolvida ou Ignorada;
- observação administrativa;
- data da primeira e da última detecção;
- histórico de decisões;
- atalho para o módulo responsável.

A prioridade sugerida pode ser substituída manualmente. A opção “Automática” volta a usar a prioridade calculada pela origem.

## Sincronização

Ao abrir a Central pela primeira vez ou clicar em **Sincronizar tudo**, o navegador consulta os módulos disponíveis e envia apenas os indicadores consolidados para o Worker protegido.

Quando uma pendência deixa de aparecer na origem, ela é encerrada automaticamente e o histórico é preservado. Caso volte a ocorrer, é reaberta automaticamente, exceto quando havia sido encerrada manualmente pelo administrador.

Se uma das fontes estiver temporariamente indisponível, a Central mostra um aviso e não encerra as pendências daquela fonte.

## Segurança

- Todas as rotas exigem sessão administrativa Bearer;
- nenhum IP ou hash de audiência é exibido ou armazenado na fila;
- nenhuma emissora é suspensa, removida ou publicada automaticamente;
- marcar uma pendência como resolvida organiza a fila, mas a correção operacional continua no módulo de origem;
- as tabelas D1 são criadas automaticamente pelo Worker.

## Instalação

1. Publique primeiro o `worker.js` da versão 1.20.0 no Cloudflare.
2. Confirme na rota `/api` que aparece `"versao": "1.20.0"` e que o editor mostra zero problemas.
3. Extraia o ZIP do Admin 3.14.0.
4. Envie todos os arquivos internos para a raiz do repositório `CentralRadiosBrasil-Admin`.
5. Aguarde o GitHub Pages finalizar.
6. Atualize o painel com `Ctrl + Shift + R`.
7. Confirme `v3.14.0` no rodapé.
8. Abra **🧭 Central** e clique em **Sincronizar tudo**.

Não é necessário executar SQL manual.

## Teste recomendado

- verificar se o badge da Central aparece no menu;
- confirmar os totais de Abertas e Urgentes;
- filtrar por origem e prioridade;
- abrir uma pendência e alterar para Em análise;
- salvar uma observação;
- abrir o módulo responsável;
- exportar CSV;
- voltar ao Dashboard e confirmar o card Central.

## Rollback

1. Reimplante o Worker/API 1.19.1 incluído na pasta de rollback.
2. Reenvie o Admin 3.13.1 incluído na pasta de rollback.
3. As tabelas novas podem permanecer no D1 sem afetar as versões anteriores.
