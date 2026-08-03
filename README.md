# Central Rádios Brasil — Painel Administrativo v3.6.3

## Etapa 2.1 — Sessão administrativa segura

- A chave `ADMIN_KEY` é usada somente no momento do login.
- O navegador armazena apenas um token temporário na aba atual.
- A sessão expira automaticamente em 2 horas.
- O botão do módulo Solicitações permite encerrar a sessão imediatamente.
- A API bloqueia temporariamente tentativas repetidas com chave errada.
- O D1 registra auditoria de login bem-sucedido e falho.

## Publicação

1. Confirme que o Worker principal está na versão 1.10.0 ou superior.
2. Publique este Painel v3.6.3.
3. Entre no módulo Solicitações e teste a sessão.
4. No Worker, crie a variável de texto `ADMIN_SESSION_REQUIRED` com valor `true`.

Não revele nem salve a chave administrativa em arquivos do repositório.

## Módulo E-mails v3.5.0

- Nova aba E-mails para `suporte@centralradiosbrasil.com.br`.
- Caixa de entrada, enviados, arquivados e lixeira.
- Pesquisa, leitura, resposta e agrupamento por conversa.
- Usa a mesma sessão temporária do Painel Administrativo.
- Modo inicial de testes limitado a `centralradiosbrasil@gmail.com`.
- Depende do Worker separado `crb-email` v1.1.0 e do D1 atual; não exige R2.


## Gestão de interessados do Streaming CRB v3.6.2

- Nova aba **Streaming CRB** no menu administrativo.
- Lista os pré-cadastros gravados no D1 pela página `/streaming/`.
- Pesquisa por nome, e-mail, projeto e protocolo.
- Filtros por novo, contatado, qualificado, convertido e arquivado.
- Acesso rápido ao e-mail e WhatsApp do interessado.
- Registro de observações administrativas e atualização do estágio comercial.
- Depende das rotas administrativas do Worker principal v1.10.0.


## E-mail v3.6.2 — modo D1

- Guarda remetente, assunto, texto, estado e histórico no D1.
- Encaminha a mensagem completa e anexos ao Gmail de segurança.
- Exibe metadados dos anexos no Painel, sem download nesta fase.

## Correção v3.6.3 — contraste da Central de E-mails

- Corrige textos brancos sobre o fundo branco na caixa de entrada, lista e área de leitura.
- Corrige contraste do campo de pesquisa, remetente, assunto, conteúdo, conversa e metadados.
- Preserva o armazenamento D1 sem R2, o Streaming CRB e os demais módulos do Painel.
