# Admin 3.15.0 — Navegação Inteligente das Listagens

## Objetivo

Preparar o Painel Administrativo para operar com dezenas ou centenas de emissoras sem esconder comandos importantes e sem exigir que o administrador desça até o fim da página para mover a tabela lateralmente.

## Recursos adicionados

- barra de rolagem horizontal também no topo da tabela, sincronizada com a inferior;
- botões para ir ao início, mover à esquerda, mover à direita e ir ao fim;
- suporte a `Shift + roda do mouse` para deslocamento lateral;
- coluna principal de identificação fixada à esquerda;
- coluna de ações fixada à direita;
- ações reorganizadas em grade compacta, mantendo todos os comandos acessíveis;
- modo `Compacto` independente por tabela;
- menu `Colunas` para ocultar informações secundárias;
- paginação automática com 25, 50, 100 ou 200 registros por página;
- nomes e textos longos limitados a duas linhas, com texto integral ao posicionar o mouse;
- preferências salvas localmente no navegador.

## Módulos abrangidos

O mecanismo é aplicado automaticamente às listagens largas de:

- Central;
- Audiência;
- Qualidade;
- Solicitações e alterações;
- Ocorrências;
- Streaming CRB;
- Emissoras;
- Rádios;
- Streams;
- Estados, cidades e categorias quando a tabela possuir largura excedente.

Tabelas pequenas de detalhes, formulários e modais são preservadas.

## Instalação

1. Faça backup do repositório atual do Admin 3.14.0.
2. Extraia o ZIP `CentralRadiosBrasil-Admin-v3.15.0-NAVEGACAO-INTELIGENTE-GITHUB.zip`.
3. Envie todos os arquivos internos para a raiz do repositório `CentralRadiosBrasil-Admin`.
4. Faça o commit e aguarde o GitHub Pages concluir a publicação.
5. Atualize o painel com `Ctrl + Shift + R`.
6. Confirme `v3.15.0` no rodapé.

## Testes recomendados

1. Abra Emissoras e confirme que a identificação permanece visível ao rolar lateralmente.
2. Confirme que a coluna Ações permanece visível no lado direito.
3. Use a barra horizontal superior e confira a sincronização com a inferior.
4. Teste as setas `←` e `→`, além de `⇤` e `⇥`.
5. Ative `Compacto`, recarregue a página e confira se a preferência foi preservada.
6. Abra `Colunas`, oculte uma coluna secundária e recarregue a página.
7. Repita em Streams, Qualidade, Central e Ocorrências.

## Compatibilidade

- Worker/API 1.20.0: sem alteração;
- D1: sem alteração;
- Site/PWA 22.18.0: sem alteração;
- dados, filtros, ações e permissões existentes: preservados.

## Rollback

Extraia e publique o ZIP `CentralRadiosBrasil-Admin-v3.14.0-ROLLBACK.zip`. Não há migração de banco para desfazer.
