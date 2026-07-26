# Central Rádios Brasil — Painel Administrativo

## Versão 1.1.0 — Commit 6

Cadastro completo de rádios construído sobre a Base Oficial v1.0.0.

### Funcionalidades

- listar rádios;
- pesquisar por nome, cidade, estado, categoria, site ou stream;
- filtrar por estado, categoria e status;
- cadastrar nova rádio;
- editar rádio;
- excluir do rascunho local;
- testar a reprodução do stream no navegador;
- parar o teste de áudio;
- importar `radios.json`;
- exportar `radios.json`;
- validar campos obrigatórios e URLs;
- cadastrar site, logotipo, redes sociais, WhatsApp e descrição;
- marcar rádio como verificada ou ativa.

### Observação sobre o teste de stream

O teste usa o reprodutor de áudio do navegador. Alguns servidores podem
bloquear a reprodução por formato, HTTPS, CORS ou políticas próprias. Portanto,
uma falha no navegador não prova sozinha que a rádio está fora do ar.

### Segurança

Nenhum token ou senha do GitHub é colocado no site. As alterações ficam em
rascunho local até o arquivo `radios.json` ser exportado e publicado.
