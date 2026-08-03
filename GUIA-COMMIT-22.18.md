# Commit 22.18 — Portal do Cliente e Modelo Rádio Essencial

## Entrega inicial

Esta versão inicia o Commit 22.18 sem alterar o fluxo financeiro já validado.

### Painel Administrativo 3.10.0

- botão **Instalar Rádio Essencial**;
- botão **Acesso** em cada cliente;
- criação/redefinição de senha temporária;
- acompanhamento do rascunho e das versões do site;
- publicação administrativa do conteúdo solicitado.

### Segurança

A senha do cliente é armazenada com PBKDF2/SHA-256, salt individual e 120.000 iterações. O Worker retorna a senha temporária apenas uma vez. As sessões possuem validade, revogação e vínculo ao navegador.

### Fluxo do piloto

1. Instalar o modelo Rádio Essencial.
2. Preparar o site do cliente e selecionar o modelo.
3. Criar o acesso do cliente.
4. Publicar o Portal do Cliente em um repositório separado.
5. Entrar com a senha temporária e criar nova senha.
6. Salvar o rascunho e solicitar publicação.
7. Revisar o conteúdo no Admin e publicar.
