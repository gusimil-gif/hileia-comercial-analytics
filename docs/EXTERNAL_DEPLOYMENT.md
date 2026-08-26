# Implantação externa sem custo inicial

## Arquitetura selecionada

O aplicativo pode ser executado fora da Manus usando **Render Free** para o servidor Node.js, **Aiven Free MySQL** para o banco relacional e **Cloudflare R2** para os arquivos originais. Essa combinação preserva o esquema MySQL atual, evita a expiração de 30 dias do PostgreSQL gratuito do Render e mantém arquivos em armazenamento compatível com S3.[1] [2] [3]

| Componente | Provedor | Observação |
|---|---|---|
| Aplicação Node.js | Render Free | A instância pode suspender após inatividade e reinicia quando recebe novo acesso.[1] |
| Banco MySQL | Aiven Free | 1 GB de armazenamento e 1 GB de RAM em nó único; pode ser desligado após longa inatividade.[2] |
| Arquivos | Cloudflare R2 | Cota mensal gratuita de 10 GB, 1 milhão de operações Classe A e 10 milhões Classe B.[3] |
| Autenticação | Aplicativo | E-mail e senha administrativos definidos exclusivamente como segredos no Render. |

> O plano gratuito é apropriado para uso interno inicial, homologação e cargas moderadas. Não oferece garantia de alta disponibilidade.

## Variáveis obrigatórias

| Variável | Origem |
|---|---|
| `DATABASE_URL` | URI MySQL fornecida pela Aiven com SSL. |
| `JWT_SECRET` | Gerada automaticamente pelo Render Blueprint. |
| `EXTERNAL_ADMIN_EMAIL` | E-mail escolhido pelo administrador. |
| `EXTERNAL_ADMIN_PASSWORD` | Senha forte escolhida pelo administrador. |
| `R2_ACCOUNT_ID` | Identificador da conta Cloudflare. |
| `R2_ACCESS_KEY_ID` | Token de acesso S3 do R2. |
| `R2_SECRET_ACCESS_KEY` | Segredo do token S3 do R2. |
| `R2_BUCKET` | Nome do bucket; padrão `hileia-importacoes`. |

## Ordem de implantação

Primeiro, crie o serviço MySQL gratuito na Aiven e aplique as migrations do diretório `drizzle`. Depois, crie o bucket R2 e um token com permissão de leitura e escrita. Por fim, conecte o repositório GitHub ao Render usando o arquivo `render.yaml` e informe os segredos solicitados pelo Blueprint.

Após a publicação, acesse o domínio do Render e entre com `EXTERNAL_ADMIN_EMAIL` e `EXTERNAL_ADMIN_PASSWORD`. O primeiro login cria ou atualiza o usuário local com o perfil **Administrador**.

## Referências

[1]: https://render.com/docs/free "Render — Deploy for Free"
[2]: https://aiven.io/free-mysql-database "Aiven — Free Managed MySQL Database"
[3]: https://developers.cloudflare.com/r2/pricing/ "Cloudflare R2 — Pricing"
