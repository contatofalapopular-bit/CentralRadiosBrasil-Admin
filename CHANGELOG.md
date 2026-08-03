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
