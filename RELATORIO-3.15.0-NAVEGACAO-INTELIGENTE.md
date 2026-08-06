# Central Rádios Brasil — Relatório Admin 3.15.0

## Problema observado

Nas tabelas com muitas colunas, a parte direita ficava fora da área visível. Os comandos administrativos eram acessados somente depois de rolar horizontalmente e a barra inferior exigia descer até o fim de listas extensas. Nomes muito longos também aumentavam a largura e a altura das linhas.

## Solução adotada

Foi criado um mecanismo global e não destrutivo que identifica tabelas administrativas largas e adiciona navegação inteligente sem modificar os dados dos módulos.

### Identificação e ações permanentes

A coluna que melhor representa o registro — normalmente Emissora, Rádio, Interessado, Solicitação ou Protocolo — permanece fixa à esquerda. A coluna Ações permanece fixa à direita. Assim, o administrador mantém contexto e comandos durante todo o deslocamento lateral.

### Rolagem acessível

Cada tabela larga recebe uma barra horizontal superior sincronizada, botões de navegação lateral e suporte a Shift + roda do mouse. A barra inferior original continua disponível.

### Escalabilidade

Listas maiores que o tamanho escolhido recebem paginação automática. O administrador pode exibir 25, 50, 100 ou 200 registros por página. Esse tratamento é visual e não altera filtros, APIs ou banco.

### Personalização operacional

O modo Compacto e o seletor de colunas são independentes por tabela e ficam salvos no navegador. As colunas de identificação e ações não podem ser ocultadas.

### Preservação

Não houve alteração no Worker 1.20.0, no D1, no Site/PWA, nas rotas, nos registros ou nas regras administrativas. Os botões originais são apenas reorganizados visualmente e mantêm seus eventos e funções.
