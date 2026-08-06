# Gestão de Emissoras e Qualidade — Admin 3.13.0

## Acesso

Abra o Painel Administrativo e clique em **🛡️ Qualidade**.

## O que o módulo analisa

- identidade e logomarca;
- estado, cidade e categoria;
- descrição e contato;
- presença e formato de site e redes sociais;
- stream principal, HTTPS, codec e bitrate;
- saúde técnica vinda do monitoramento do Worker;
- coerência entre atividade, publicação e fluxo cadastral;
- situação do Selo Oficial.

## Níveis

- **Saudável:** sem pendência relevante;
- **Atenção:** revisão recomendada;
- **Crítica:** impedimento de identidade, stream ou publicação.

O score orienta a revisão humana. Ele não suspende, publica ou exclui uma emissora automaticamente.

## Suspensão segura

O botão **Suspender** abre o formulário da emissora e prepara os campos `status = suspensa`, `ativa = não` e `pública = não`. Nada é salvo automaticamente. O administrador precisa revisar e clicar em **Salvar**.

## Limite da verificação de links

Sites e redes sociais são verificados quanto à presença e ao formato HTTP/HTTPS. A disponibilidade real desses endereços não é testada para evitar bloqueios de navegador e riscos de requisições arbitrárias. O stream usa o monitoramento protegido do Worker.
