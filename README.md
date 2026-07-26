# Central Rádios Brasil — Painel Administrativo

## Versão 2.3.1 — Commit 12.2.1 Corretivo

Correção do carregamento de Estados e Cidades no formulário de Emissoras.

### Correções

- os 26 estados e o Distrito Federal aparecem no campo Estado;
- a lista de cidades é carregada conforme o estado escolhido;
- o campo Cidade fica desabilitado até um estado ser selecionado;
- ao editar uma emissora, estado e cidade salvos são selecionados;
- trocar o estado atualiza imediatamente a lista de cidades;
- cache local de cidades e consulta à API do IBGE foram reforçados;
- todos os demais módulos e múltiplos streams foram preservados.
