# Central Rádios Brasil — Painel Administrativo

Painel oficial para gerenciamento do ecossistema Central Rádios Brasil.

## Versão atual

`0.1.0`

## Situação

Commit 1: estrutura inicial do projeto.

## Objetivos futuros

- exibir o Dashboard com dados reais;
- gerenciar rádios;
- gerenciar categorias;
- gerenciar estados e cidades;
- validar streams;
- gerar `radios.json`;
- gerar `radios-esp32.json`;
- publicar dados no GitHub.

## Tecnologias

- HTML5;
- CSS3;
- JavaScript;
- GitHub Pages.

O projeto não usa frameworks nesta fase.

## Estrutura

```text
CentralRadiosBrasil-Admin
├── index.html
├── style.css
├── app.js
├── config.js
├── assets/
│   └── icons/
├── css/
│   └── dashboard.css
├── js/
│   ├── api.js
│   ├── dashboard.js
│   ├── router.js
│   └── utils.js
└── pages/
    └── dashboard.html
```

## Repositório de dados

O painel utilizará os arquivos publicados no repositório:

`contatofalapopular-bit/CentralRadiosBrasil-Dados`

## Segurança

Tokens, senhas e outras credenciais nunca devem ser armazenados em arquivos
públicos do repositório.
