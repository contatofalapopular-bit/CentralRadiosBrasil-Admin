# Central Rádios Brasil — Painel Administrativo

## Versão 2.4.0 — Commit 13.3

Gerador definitivo do banco oficial de rádios.

### Funcionalidades

- validação completa antes da exportação;
- detecção de IDs e slugs duplicados;
- verificação de nome, estado, cidade e categoria;
- validação de streams e stream principal;
- avisos sobre HTTP, codec, frequência e logotipo;
- relatório detalhado de erros e avisos;
- geração do `radios.json` oficial;
- geração do `radios-esp32.json` compacto;
- totais automáticos de emissoras, streams, estados, cidades e categorias;
- exportação bloqueada enquanto existirem erros.

### Arquivos gerados

- `radios.json`: banco completo para o ecossistema;
- `radios-esp32.json`: banco compacto para o firmware;
- `relatorio-validacao-radios.json`: relatório técnico.

### Próxima etapa

Commit 13.4: validação final e publicação no repositório
`CentralRadiosBrasil-Dados`.
