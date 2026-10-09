# Orbit

Seu espaço pessoal para notas, projetos e tarefas. Self-host no seu computador,
com React, Next.js e SQLite. Cada instalação começa vazia.

## O que tem

- Páginas e subpáginas, favoritos, busca e lixeira com restauração.
- Editor visual com texto formatado, tabelas e checklists clicáveis. Markdown fica em uma aba própria e continua disponível na exportação e no MCP.
- Diagramas Mermaid: fluxograma, mapa mental, sequência e exportação SVG.
- Tarefas em lista ou Kanban, com prioridade, prazo e página relacionada.
- Agenda com horário, fuso, repetição e lembretes enquanto o app está aberto.
- Timer de foco que continua contando ao reabrir o app.
- Prévias de links YouTube e Vimeo.
- Importação e exportação Markdown e backup JSON.
- MCP HTTP para assistentes consultarem e atualizarem páginas, tarefas e timer.
- Inter Variable e ícones Lucide SVG, sem emojis.

## Instalar no computador

Requisitos: **Node.js 24 ou superior**, npm e Git. Windows, macOS ou Linux.

```bash
git clone https://github.com/SENPedroVitor/Orbit.git
cd Orbit
npm ci
npm run setup
npm run build
npm start
```

Abra **http://127.0.0.1:3000**. O setup mostra uma senha aleatória uma única vez.
Guarde-a para entrar. Executar o setup novamente preserva a instalação existente.
Para desenvolvimento, use `npm run dev` no lugar de build e start.

Opcionalmente copie `.env.example` para `.env.local` e configure sua própria
`ORBIT_PASSWORD` antes do primeiro setup. Use pelo menos 12 caracteres.
Após a primeira configuração, o hash salvo é a fonte de verdade; editar essa
variável não troca a senha de uma instalação existente.

## Docker

Com Docker e Docker Compose:

```bash
git clone https://github.com/SENPedroVitor/Orbit.git
cd Orbit
docker compose build
docker compose run --rm orbit node scripts/setup.mjs
docker compose up -d
```

Abra **http://127.0.0.1:3000** com a senha exibida pelo setup. O volume
`orbit_data` guarda o banco e a autenticação. `docker compose down` preserva
esse volume; adicionar `-v` apaga os dados.

## Seus dados

No modo Node, os dados ficam em `data/`, fora do Git. `orbit.sqlite` guarda o
conteúdo; `auth.json` guarda o hash da senha, o segredo das sessões e o token MCP.
No Docker, os mesmos arquivos ficam no volume persistente.

O repositório não inclui notas, bancos, backups, contas, senhas, tokens nem
identificadores de uma instalação hospedada. SQLite substitui o serviço de
banco remoto. Não é necessário Sites, Cloudflare ou login no ChatGPT.

Use **Configurações → Exportar backup** para exportar páginas e tarefas como JSON.
Para preservar toda a instalação, pare o servidor e copie a pasta `data/`
inteira. No Docker, pare o serviço antes de copiar o volume. Importar um JSON
adiciona conteúdo sem apagar páginas existentes.

Se esquecer a senha, pare o servidor, mantenha uma cópia de `auth.json`, remova
apenas esse arquivo e execute o setup novamente. Isso preserva `orbit.sqlite`,
mas invalida sessões e gera um novo token MCP.

## Conectar ao Codex

Com o Orbit rodando, obtenha seu token no terminal:

```bash
npm run token
# Docker:
docker compose exec orbit node scripts/token.mjs
```

Defina `ORBIT_MCP_TOKEN` no ambiente usado para iniciar o Codex e adicione:

```bash
codex mcp add orbit --url http://127.0.0.1:3000/mcp --bearer-token-env-var ORBIT_MCP_TOKEN
```

O token dá acesso ao conteúdo desta instalação. Guarde-o localmente e não o
adicione ao Git. Ferramentas: `list_pages`, `read_page`, `save_page`, `list_tasks`,
`save_task`, `get_timer` e `save_timer`. Escritas exigem a revisão retornada pela
leitura mais recente, protegendo alterações feitas em outro navegador.

Cada máquina tem seu próprio banco. Para acessar o mesmo Orbit em outra máquina,
aponte o cliente para a instalação que contém seus dados; copiar apenas o código
não sincroniza conteúdo.

## Acesso pela rede

Por padrão, o servidor Node e a porta Docker ficam restritos ao próprio
computador. Para disponibilizar em rede, configure um proxy HTTPS, defina
`ORBIT_PUBLIC_URL` com a origem exata e `ORBIT_SECURE_COOKIE=1`. Configure a
escuta/porta explicitamente para a rede que deseja usar. Não exponha o banco
nem a pasta `data/` como arquivos públicos.

## Desenvolvimento e limites

```bash
npm test
npm run typecheck
npm run build
```

Esta versão é para **um usuário por instalação**. Não inclui colaboração em
tempo real, anexos ou editor de blocos arrastáveis. Checklists são editados no
Markdown. Diagramas são editados por código com prévia, sem arrastar nós.
Lembretes e som precisam do Orbit aberto; não há push com o app fechado.
Vídeos dependem de permissão de incorporação e conexão com o provedor.

Licença MIT para o código do Orbit. Fontes e dependências mantêm suas próprias
licenças; veja `THIRD_PARTY_NOTICES.md` e `public/fonts/OFL.txt`.
