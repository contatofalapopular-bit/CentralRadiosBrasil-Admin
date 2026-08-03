# Módulo de E-mail — Admin v3.5.0

A nova aba **E-mails** usa o endereço:

`suporte@centralradiosbrasil.com.br`

## Dependência

A aba só funciona depois que o Worker `crb-email` for publicado e configurado na Cloudflare.

A URL esperada em `config.js` é:

`https://crb-email.contatofalapopular.workers.dev`

Caso a Cloudflare gere outra URL, altere apenas `CONFIG.EMAIL_WORKER_URL`.

## Login

O módulo reutiliza o mesmo token temporário do Painel Administrativo. Portanto, entre primeiro pela aba **Solicitações** ou por qualquer fluxo que abra a sessão administrativa.

## Modo inicial

O Worker vem em modo de testes e só permite enviar para:

`centralradiosbrasil@gmail.com`

O recebimento em `suporte@centralradiosbrasil.com.br`, a leitura, o arquivamento e a organização funcionam normalmente.
