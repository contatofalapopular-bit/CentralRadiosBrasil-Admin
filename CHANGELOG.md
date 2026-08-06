## 3.13.1 — Layout Amplo Global (2026-08-06)

- Menu lateral reduzido para aumentar a área de trabalho.
- Conteúdo principal passa a utilizar toda a largura disponível.
- Margens do cabeçalho e dos módulos compactadas.
- Tabelas de Qualidade e Audiência otimizadas para telas de notebook e desktop.
- Menor necessidade de rolagem horizontal, preservando a barra inferior como fallback.
- Nenhuma alteração no Worker, D1, regras de audiência ou Portal Público.

# Changelog

## 3.11.1 — Dashboard reorganizado e Gestão Comercial removida

- Corrige espaçamentos e quebra de texto dos cards da fila operacional.
- Remove o menu, página, modal, JavaScript, CSS e chamadas da Gestão Comercial no Admin.
- Remove alertas, atividades e filas comerciais do Dashboard.
- Preserva Worker, D1 e demais repositórios sem alterações.

## 3.11.0 — Usuários reais e permissões no servidor

- adiciona botão **Usuários** em Gestão Comercial > Clientes;
- lista usuários individuais do Portal do Cliente;
- cria contas com senha temporária;
- edita perfil, áreas e status;
- redefine senha;
- protege a conta principal;
- usa exclusivamente sessão administrativa Bearer;
- preserva todos os módulos anteriores.

## 3.10.1 — Diagnóstico do módulo de solicitações

- Painel confirmado na mesma API utilizada pelo Portal Público.
- Mensagens de rede melhoradas para diferenciar falha de conexão, tempo excedido e erro retornado pelo Worker.
- Versão dos arquivos atualizada para impedir carregamento de JavaScript antigo pelo navegador.

# Changelog

## 3.10.1 — Início do Portal do Cliente

- instala o primeiro modelo oficial “Rádio Essencial”;
- cria e redefine o acesso individual de cada cliente;
- exibe a senha temporária somente no momento da criação;
- adiciona rascunho, histórico de versões e solicitação de publicação;
- permite revisar e publicar o site pelo Painel Administrativo;
- preserva contratos, faturas, pagamentos e regras validadas do Commit 22.17.1.

## 3.9.3 — Regra correta de faturas

- adiciona tipo de cobrança às faturas;
- permite vencimentos e valores iguais quando os serviços são diferentes;
- bloqueia a mesma mensalidade para o mesmo contrato e competência;
- diferencia cobranças manuais por tipo e descrição;
- exibe mensagens claras quando uma cobrança duplicada é detectada;
- preserva pagamentos, contratos, clientes, sites e infraestrutura.

## 3.9.1 — Correção dos botões da Gestão Comercial

- Corrige a abertura dos formulários de novos registros.
- Valida os botões Novo cliente, Novo plano, Novo contrato, Nova fatura, Novo modelo, Preparar site e Nova infraestrutura.
- Evita erro JavaScript ao montar formulários sem registro existente.
- Preserva Worker 1.13.0, dados, rotas e demais módulos do Painel.

## 3.8.0 — Dashboard Operacional e Alertas

- Nova visão operacional logo após o login.
- Contadores clicáveis para solicitações, ocorrências, Streaming CRB, e-mails e streams.
- Alertas numéricos no menu lateral.
- Atividade recente consolidada em ordem cronológica.
- Resumo das filas e atalhos para cada módulo.
- Mantida a visão do catálogo oficial, cobertura, categorias e saúde técnica.
- Dashboard funciona em modo público com dados do catálogo e libera os alertas após a sessão administrativa.

## 3.7.0 — Ocorrências, Suporte e Confiabilidade

- Nova aba Ocorrências com indicadores, filtros, prioridades e histórico.
- Detalhes completos do relato, emissora relacionada e contato.
- Estados nova, em análise, resolvida e arquivada.
- Prioridades normal, alta e crítica.
- Observações administrativas e resolução armazenadas no D1.

## v3.7.0 — Correção de contraste da Central de E-mails

- Corrigido texto branco sobre fundo branco na lista e no leitor de mensagens.
- Corrigidos remetente, assunto, conteúdo, conversa, metadados e estado vazio.
- Corrigido contraste do campo de pesquisa e dos formulários de composição.
- Preservados D1 sem R2, encaminhamento ao Gmail, Streaming CRB e demais módulos.

## v3.6.2 — E-mail armazenado no D1 sem R2

- Remetente, assunto, texto, estados e histórico são armazenados no D1.
- Anexos recebidos continuam na cópia de segurança enviada ao Gmail.
- O Painel mostra os metadados dos anexos e informa sua localização.
- Envio de anexos pelo Painel fica desabilitado nesta fase.

# Changelog

## v3.6.2 — Correção visual do modal Streaming CRB

- Corrigido o contraste do campo Status comercial.
- Corrigida a visibilidade do texto em Observações administrativas.
- Campos agora usam fundo claro e texto escuro em todos os estados, inclusive foco e opções do seletor.
- Nenhuma alteração no Worker, no D1 ou no fluxo de atualização dos interessados.

## v3.6.0 — Gestão de Interessados do Streaming CRB

- Criada a aba Streaming CRB no Painel Administrativo.
- Listagem dos pré-cadastros recebidos pelo Portal 22.12.0.
- Indicadores de total, novos, contatados, qualificados e convertidos.
- Pesquisa e filtro por estágio comercial.
- Tela de detalhes com projeto, recursos desejados, contato e mensagem.
- Atualização de status e observações diretamente no D1.
- Atalhos para e-mail, WhatsApp e cópia do protocolo.

## v3.5.0 — Módulo Integrado de E-mail

- Criada a aba E-mails no Painel Administrativo.
- Caixa de entrada, enviados, arquivados e lixeira.
- Pesquisa por remetente, assunto e conteúdo.
- Leitura segura em texto, respostas e novos e-mails.
- Download protegido de anexos armazenados no R2.
- Reutilização da sessão administrativa atual.
- Modo de testes restrito ao Gmail previamente verificado.


## v3.4.0 — Sessão administrativa segura

- Login administrativo por sessão temporária.
- A chave não permanece armazenada no navegador.
- Token enviado pelo cabeçalho `Authorization: Bearer`.
- Validação automática da sessão existente.
- Encerramento de sessão pelo Painel.
- Mensagens atualizadas para sessão expirada ou ausente.

## v3.3.0

- Solicitações de alteração das emissoras.
- Monitoramento automático de streams.

## 3.9.0 — Gestão Comercial, Streaming e Sites dos Clientes

- Nova aba Gestão Comercial.
- Clientes, planos, contratos, faturas e pagamentos manuais.
- Pagamentos parciais e estornos.
- Controle de capacidade e custo da revenda.
- Catálogo de modelos de site em planejamento/desenvolvimento.
- Instâncias de site por cliente, domínio e campos editáveis permitidos.
- Conversão de interessados do Streaming CRB em clientes.
- Alertas comerciais integrados ao Dashboard Operacional.


## 3.12.0 — Auditoria de Audiência
- Novo módulo protegido de auditoria.
- KPIs, filtros, detalhes por rádio, picos e exportação CSV.
- Alertas integrados ao Dashboard.
- Nenhum IP ou hash técnico é exposto na interface.


## 3.13.0 — Gestão de Emissoras e Qualidade (2026-08-06)

- Nova rota e menu `#/qualidade`.
- Score de qualidade e completude por emissora.
- Consolidação do monitoramento protegido de streams.
- Filtros por risco, UF, categoria, stream e Selo Oficial.
- Detalhes por identidade, localização, conteúdo, contato, links, stream, publicação e confiança.
- Exportação CSV das pendências.
- Atalhos para editar e preparar suspensão sem salvar automaticamente.
- Card e badge de qualidade no Dashboard.
- Site/PWA 22.18.0 e Worker/API 1.19.1 permanecem inalterados.
