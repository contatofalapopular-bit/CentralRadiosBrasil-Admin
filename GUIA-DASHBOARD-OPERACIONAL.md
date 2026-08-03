# Guia — Dashboard Operacional v3.8.0

## Ordem de implantação

1. Publique o Worker principal v1.12.0.
2. Confirme em `/api` a rota `GET /api/admin/dashboard`.
3. Publique o Admin v3.8.0.
4. Abra o Dashboard e entre com a sessão administrativa.
5. Confira os alertas do menu e a atividade recente.

## Dados consolidados

A rota usa o mesmo D1 e consulta somente tabelas já existentes. Se algum módulo ainda não tiver tabela ou registros, seu contador retorna zero sem impedir o restante do Dashboard.
