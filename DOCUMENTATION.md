# Hiléia Comercial Analytics

## Visão geral

O **Hiléia Comercial Analytics** é um aplicativo interno para importar, classificar, conciliar e analisar movimentos comerciais com rastreabilidade. O MVP preserva o arquivo original no armazenamento de objetos, mantém o hash de origem do lote e registra eventos críticos de importação, reversão, regras e cadastros na trilha de auditoria.

> **Princípio operacional:** um movimento sem regra compatível não é promovido a venda ou bonificação. Ele permanece em **Outros**, com status **Pendente**, até revisão autorizada.

| Área | Capacidades implementadas | Observação operacional |
|---|---|---|
| Acesso | Perfis Administrador, Gerência Comercial, Analista e Consulta | O proprietário do projeto recebe Administrador automaticamente. |
| Importação | Excel, CSV, hash antirrepetição, prévia, mapeamento salvo, validação, relatório de erros e reversão | O limite atual é de 15 MB por arquivo. |
| Classificação | Venda, Devolução, Bonificação, Outros e Cancelado | Regras são priorizadas e auditáveis. |
| Conciliação | Totais, peso, NF, dia, cliente, setor e responsável | A diferença não classificada permanece segregada. |
| Relatórios | Catálogo comercial e exportação Excel, CSV e PDF quando a cobertura é suficiente | A interface mostra exatamente **Dados insuficientes** quando faltam campos. |
| Território | Setores e Rotas com carga inicial, regras por setor e exceções por cliente | A regra de cliente tem prioridade operacional sobre a regra de setor. |

## Instalação e execução

O projeto utiliza React, TypeScript, Express, tRPC, Drizzle ORM e banco MySQL/TiDB provisionado pela plataforma. No diretório do projeto, execute `pnpm install` e em seguida `pnpm dev`. A aplicação exige as variáveis de ambiente disponibilizadas pela plataforma para autenticação, banco e armazenamento; elas não devem ser incluídas no repositório.

Antes de alterações de esquema, atualize `drizzle/schema.ts`, gere a migration com `pnpm drizzle-kit generate`, revise o SQL e aplique a migration no banco. Para validar alterações, use `pnpm check` e `pnpm test`.

## Dicionário mínimo de dados

O mapeamento interno aceita filial, NF, série, datas, tipo de movimento, CFOP, natureza, situação, cliente, produto, grupo, setor, região, responsáveis, peso, valores, devolução, bonificação, NF de origem e campanha. Nem todos os arquivos de origem precisam trazer todos esses campos.

| Resultado | Campos indispensáveis |
|---|---|
| Faturamento líquido | Data, valor líquido ou valor dos produtos, e classificação de movimento. |
| Análise por setor ou região | Setor ou região comercial. |
| Análise por produto | Código ou descrição do produto e grupo. |
| ABC de clientes | Cliente e valor ou peso. |
| Bonificação com evidência | Tipo de movimento, CFOP ou natureza, conforme regra aprovada. |
| Mapa comercial | Município/UF ou endereço geocodificado aprovado. |

Quando um relatório depende de campo não disponível, a interface exibe **Dados insuficientes** e não inventa produto, CFOP, natureza, setor ou região.

## Fórmulas comerciais

| Indicador | Fórmula |
|---|---|
| Faturamento bruto | Soma dos movimentos classificados como Venda. |
| Faturamento líquido | Vendas menos devoluções. |
| Peso líquido | Peso de vendas menos peso devolvido. |
| Bonificações | Soma segregada de bonificações em R$ e kg. |
| Movimento físico consolidado | Peso de vendas mais peso bonificado menos peso devolvido. |
| Clientes atendidos | Clientes distintos com venda líquida positiva. |
| Ticket médio | Faturamento líquido dividido por NFs de venda válidas. |
| Valor médio por kg | Faturamento líquido dividido por peso líquido. |
| Taxa de devolução | Devoluções divididas pelo faturamento bruto. |
| Taxa de bonificação | Bonificações divididas pelo faturamento bruto. |

## Segurança, privacidade e recuperação

O aplicativo exige autenticação e aplica procedimentos protegidos por perfil. O arquivo original é mantido no armazenamento de objetos e o banco guarda apenas suas chaves e metadados. As reversões desativam movimentos associados ao lote e preservam histórico, arquivo e auditoria. Não há exclusão física automática de arquivos de origem.

Dados comerciais não devem ser copiados para serviços externos sem autorização. Administradores devem revisar regras de classificação, exceções territoriais e permissões periodicamente. Para recuperação, utilize o histórico de versões do projeto e o histórico de lotes da aplicação; para nova publicação, gere primeiro uma versão salva do projeto.

## Premissas e limitações atuais

Os arquivos anexados são relatórios operacionais e podem não conter CFOP, natureza, produto ou todas as dimensões necessárias. Por isso, a classificação automática só ocorre quando existir regra aprovada; os demais movimentos permanecem em revisão. O caso de agosto de 2026 é validado por cálculo de referência nos testes, sem qualquer valor comercial fixado na lógica do aplicativo.

O módulo de verbas mantém a política inicial parametrizável de seis meses e 1%, com não acúmulo, vínculo exclusivo ao cliente e proibição de uso como redução direta de preço. O indicador de eficiência de ação promocional permanece como **Definição pendente** até aprovação de fórmula de negócio.
