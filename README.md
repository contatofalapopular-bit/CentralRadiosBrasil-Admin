# Central Rádios Brasil — Painel Administrativo v3.4.0

## Etapa 2.1 — Sessão administrativa segura

- A chave `ADMIN_KEY` é usada somente no momento do login.
- O navegador armazena apenas um token temporário na aba atual.
- A sessão expira automaticamente em 2 horas.
- O botão do módulo Solicitações permite encerrar a sessão imediatamente.
- A API bloqueia temporariamente tentativas repetidas com chave errada.
- O D1 registra auditoria de login bem-sucedido e falho.

## Publicação

1. Publique primeiro o Worker v1.7.0.
2. Publique este Painel v3.4.0.
3. Entre no módulo Solicitações e teste a sessão.
4. No Worker, crie a variável de texto `ADMIN_SESSION_REQUIRED` com valor `true`.

Não revele nem salve a chave administrativa em arquivos do repositório.
