# Central Rádios Brasil — Painel Administrativo

## Versão 1.3.1 — Commit 8.1

Correção da tela de Estados.

### Correção realizada

- inclusão correta do arquivo `js/estados.js` no `index.html`;
- tabela com os 26 estados e o Distrito Federal passa a ser renderizada;
- botão Atualizar dados também redesenha a tela de Estados;
- todas as funcionalidades anteriores foram preservadas.

### Causa do problema

O arquivo `js/estados.js` existia no projeto, mas não estava sendo carregado
pela página principal.
