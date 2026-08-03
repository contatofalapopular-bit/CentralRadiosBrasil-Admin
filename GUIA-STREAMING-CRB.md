# Gestão de Interessados — Streaming CRB

## Requisitos

- Worker principal Central Rádios Brasil na versão 1.10.0 ou superior.
- Binding `DB` conectado ao mesmo banco D1 utilizado pelo Portal.
- Sessão administrativa ativa no Painel.

## Publicação

1. Confirme em `/api` que o Worker informa a versão `1.10.0`.
2. Publique todo o conteúdo da pasta `CentralRadiosBrasil-Admin-main` na raiz do repositório do Painel Administrativo.
3. Use a mensagem de commit:

   `3.6.0 — Gestão de interessados do Streaming CRB`

4. Abra o Painel e faça login administrativo.
5. Entre na aba **Streaming CRB**.
6. Confirme que o pré-cadastro de teste aparece na lista.

## Funções

- Indicadores de total, novos, contatados, qualificados e convertidos.
- Pesquisa por nome, e-mail, projeto ou protocolo.
- Filtro por status comercial.
- Visualização dos dados completos enviados pelo interessado.
- Atalhos para e-mail e WhatsApp.
- Atualização do status comercial.
- Registro de observações administrativas.

## Estados comerciais

- `novo`: recebido e ainda não trabalhado.
- `contatado`: primeiro contato realizado.
- `qualificado`: interessado com necessidade e potencial confirmados.
- `convertido`: contratação ou adesão concluída.
- `arquivado`: sem continuidade neste momento.

As alterações são salvas diretamente na tabela `interesses_streaming` do D1 pelo Worker principal.
