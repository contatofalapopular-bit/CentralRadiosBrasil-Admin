# Regra de faturas — Admin 3.9.3 / Worker 1.13.2

## Permitido

- várias faturas para o mesmo cliente no mesmo mês;
- mesmo dia de vencimento;
- mesmo valor;
- serviços diferentes;
- contratos diferentes.

## Bloqueado

- mesma mensalidade para o mesmo contrato e competência;
- mesma taxa de implantação para o mesmo contrato e competência;
- cobrança manual com o mesmo tipo e a mesma descrição no mesmo contrato e competência, enquanto a anterior não estiver cancelada ou estornada.

O valor não é usado sozinho como identificador de duplicidade.
