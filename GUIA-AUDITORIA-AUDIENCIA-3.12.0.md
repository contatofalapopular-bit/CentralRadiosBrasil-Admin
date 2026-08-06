# Central Rádios Brasil — Auditoria de Audiência

## Versões
- Worker/API 1.19.0
- Painel Administrativo 3.12.0

## Recursos
- Reproduções válidas por período.
- Redes únicas sem exposição de IPs ou hashes.
- Tentativas duplicadas bloqueadas.
- Picos em janelas de 10 minutos.
- Comparação com o período anterior.
- Níveis Normal, Observar e Revisar.
- Detalhes por rádio e exportação CSV.

## Interpretação
Os indicadores são sinais para revisão humana. Nenhum alerta isolado comprova fraude. Antes de suspender uma emissora, compare o histórico, campanhas de divulgação e origem do tráfego.

## Instalação
1. Publique primeiro o Worker/API 1.19.0.
2. Confirme `versao: 1.19.0` na rota `/api`.
3. Publique o Painel Administrativo 3.12.0 no GitHub Pages.
4. Entre no painel e abra **Audiência**.

## Banco D1
Não há SQL manual. O módulo utiliza as tabelas de audiência já existentes e preserva todos os registros.
