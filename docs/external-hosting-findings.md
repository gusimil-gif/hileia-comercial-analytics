# Avaliação de hospedagem externa gratuita

## Fontes verificadas em 26/08/2026

O Render oferece serviço web gratuito para aplicações Node.js, mas suspende instâncias após inatividade. O banco PostgreSQL gratuito do próprio Render expira 30 dias após a criação e, por isso, não é adequado como armazenamento permanente do MVP.

Fonte: https://render.com/docs/free

O Supabase oferece no plano gratuito banco PostgreSQL de 500 MB, autenticação, 1 GB de arquivos, 5 GB de saída e até 50.000 usuários ativos mensais. Projetos gratuitos são pausados após uma semana sem atividade e há limite de dois projetos ativos.

Fonte: https://supabase.com/pricing

## Arquitetura candidata

Uma opção sem custo inicial é hospedar o servidor Node.js no Render e usar Supabase para PostgreSQL, autenticação e armazenamento. Essa solução exige migração do esquema atual MySQL para PostgreSQL e substituição dos serviços exclusivos do ambiente Manus.

## Alternativas MySQL compatíveis

O TiDB Cloud Starter concede mensalmente, para até cinco instâncias por organização, uma cota gratuita de 5 GiB de dados relacionais, 5 GiB de dados colunares e 50 milhões de Request Units por instância. A compatibilidade MySQL permite preservar o esquema Drizzle atual e reduz o risco de migração.

Fonte: https://www.pingcap.com/tidb-cloud-starter-pricing-details/

A Aiven oferece MySQL gratuito sem prazo fixo, com nó único, 1 GB de armazenamento e 1 GB de RAM. O serviço pode ser desligado após inatividade e não é recomendado para tráfego elevado, mas é suficiente para uma implantação interna inicial e reduz ainda mais as mudanças no banco.

Fonte: https://aiven.io/free-mysql-database

## Recomendação atual

Para minimizar adaptações, a arquitetura preferencial é **Render Free para o servidor Node.js + Aiven Free MySQL para o banco + armazenamento externo compatível com S3**. A autenticação Manus precisa ser substituída por autenticação própria do aplicativo ou por um provedor externo. O Render Postgres gratuito foi descartado porque expira em 30 dias.
