# Central Rádios Brasil — Painel Administrativo

## Versão 1.5.0 — Commit 10

Cadastro Nacional de Cidades.

### Funcionalidades

- consulta à API oficial de Localidades do IBGE;
- municípios com código oficial;
- nome, estado, UF e região;
- busca instantânea;
- filtro por estado;
- filtro por região;
- cache local para melhorar o carregamento;
- atualização manual pelo IBGE;
- exportação de `cidades.json`.

A tabela limita a exibição inicial aos primeiros 250 resultados para manter
o navegador rápido. A busca e os filtros continuam abrangendo a lista inteira.
