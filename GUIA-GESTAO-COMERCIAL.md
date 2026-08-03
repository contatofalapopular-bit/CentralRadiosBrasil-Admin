# Admin 3.9.0 — Gestão Comercial, Streaming e Sites

A nova área **Gestão Comercial** centraliza:

- clientes e prospects;
- planos próprios da Central Rádios Brasil;
- contratos, streaming e site contratado;
- vencimentos, faturas e baixa manual de pagamentos;
- pagamentos parciais e estornos;
- capacidade e custo da revenda;
- catálogo de futuros modelos de site;
- sites dos clientes, domínios, estados e campos permitidos;
- conversão de pré-cadastro do Streaming CRB em cliente.

## Ordem de implantação

1. Publicar o Worker principal 1.13.0.
2. Confirmar a versão em `/api`.
3. Publicar o Admin 3.9.0.
4. Criar primeiro a infraestrutura real da revenda e os planos reais.
5. Converter um interessado em cliente ou cadastrar um cliente manualmente.
6. Criar contrato e gerar a primeira fatura.

## O que fica para o Commit 22.18

- modelos visuais reais;
- Portal do Cliente;
- autenticação individual por cliente;
- editor de conteúdo;
- rascunho, prévia, publicação e restauração de versões.
