# Central Rádios Brasil — Painel Administrativo

## Versão 0.3.1 — Commit 4 de consolidação

Este commit consolida a base existente sem reiniciar o projeto.

### Correções

- mantém o Dashboard funcional;
- ativa a opção **Rádios** no menu;
- preserva a leitura do repositório `CentralRadiosBrasil-Dados`;
- impede o registro repetido de eventos ao trocar de página;
- adiciona versão aos arquivos CSS e JavaScript para evitar cache antigo;
- exibe corretamente a versão `0.3.1`;
- mantém cadastro, edição, exclusão local e exportação de `radios.json`.

### Segurança

As alterações nas rádios continuam sendo guardadas como rascunho local.
Nenhum token ou senha do GitHub fica exposto no navegador.
