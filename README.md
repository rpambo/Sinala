# SINALA

Plataforma comunitária de relatos sobre conectividade em Angola. O frontend usa Angular, UIkit, Leaflet/OpenStreetMap e ECharts; a API usa Go e PostgreSQL.

## Requisitos

- Para executar localmente: Node.js 22 ou superior, Go 1.24 ou superior e PostgreSQL 16 ou superior.
- Para executar com Docker: Docker Engine/Desktop com Docker Compose v2.

## Executar com Docker

Crie o ficheiro local de configuração e substitua a password de exemplo por uma password longa, URL-safe (por exemplo, letras e números). O ficheiro `.env.docker` está ignorado pelo Git.

```powershell
Copy-Item .env.docker.example .env.docker
```

Inicie a aplicação:

```bash
docker compose --env-file .env.docker up --build -d
```

O Compose inicia o PostgreSQL com volume persistente, espera pela base de dados, executa a migração e só depois inicia a API e o frontend. A aplicação fica em `http://localhost:8080`; a API é encaminhada pelo Nginx, o teste de saúde está em `http://localhost:8080/api/health` e a documentação Swagger em `http://localhost:8080/swagger/index.html`.

Para criar o primeiro administrador no PowerShell:

```powershell
$env:SINALA_ADMIN_EMAIL = Read-Host "Email do administrador"
$securePassword = Read-Host "Password do administrador" -AsSecureString
$env:SINALA_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
docker compose --env-file .env.docker run --rm -e SINALA_ADMIN_EMAIL -e SINALA_ADMIN_PASSWORD api /usr/local/bin/bootstrap-admin
Remove-Item Env:SINALA_ADMIN_EMAIL, Env:SINALA_ADMIN_PASSWORD
```

Verifique os serviços com `docker compose --env-file .env.docker ps` e consulte os registos com `docker compose --env-file .env.docker logs -f api`. `docker compose --env-file .env.docker down` pára os serviços sem apagar a base de dados; `down -v` também apaga os dados persistidos.

Por padrão, a porta 8080 fica acessível apenas na máquina local. Para publicar atrás de um proxy HTTPS, defina `WEB_BIND`, `WEB_ORIGIN` e `COOKIE_SECURE=true` em `.env.docker` de acordo com o domínio e a configuração do proxy.

## Configuração da base de dados

Crie uma base de dados e um utilizador PostgreSQL dedicados à aplicação. Por exemplo, numa sessão administrativa do PostgreSQL:

```sql
CREATE USER sinala WITH PASSWORD 'substitua-por-uma-palavra-passe-forte';
CREATE DATABASE sinala OWNER sinala;
```

Copie `server/.env.example` para `server/.env` e configure `DATABASE_URL` com as credenciais locais. O ficheiro `.env` está ignorado pelo Git; não coloque credenciais no código nem as partilhe.

```powershell
Copy-Item server\.env.example server\.env
```

Execute a migração inicial:

```bash
npm run db:migrate
```

## Criar o primeiro administrador

Defina temporariamente `SINALA_ADMIN_EMAIL`, `SINALA_ADMIN_PASSWORD` (mínimo 12 caracteres) e, opcionalmente, `SINALA_ADMIN_NAME` no ambiente ou em `server/.env`. Depois:

```bash
npm run admin:create
```

O comando cria ou promove apenas a conta indicada explicitamente. Remova os valores de bootstrap de `server/.env` depois de o executar. O registo público cria contas de cidadão e nunca concede permissões administrativas.

## Executar localmente

Abra dois terminais na raiz do projecto:

```bash
npm run api
```

```bash
npm start
```

A API fica em `http://localhost:3000` e o Angular em `http://localhost:4200`. O servidor de desenvolvimento Angular encaminha `/api` e `/swagger` para a API. Verifique a ligação em `http://localhost:3000/api/health` e abra a documentação pelo frontend em `http://localhost:4200/swagger/index.html` para que as chamadas da interface respeitem a origem configurada.

Em produção, configure o proxy reverso para encaminhar `/api` ao servidor Go, use HTTPS e defina `WEB_ORIGIN` e `COOKIE_SECURE=true`. Se a API estiver exclusivamente atrás de um proxy confiável que substitui o cabeçalho `X-Real-IP`, active também `TRUST_PROXY=true` para preservar a limitação de pedidos por endereço do cliente.

## Funcionalidades ligadas

- Registo e login com palavra-passe bcrypt, sessão opaca armazenada no PostgreSQL, reportes associados à conta autenticada e autorização administrativa no servidor.
- Submissão e consulta de reportes, histórico de estados e atualização administrativa persistidos no PostgreSQL.
- Anexos JPEG, PNG e WebP até 5 MB, guardados como dados binários e disponibilizados apenas à administração.
- Métricas do painel calculadas a partir de reportes reais; os exemplos/métricas artificiais foram removidos.

A recuperação de palavra-passe ainda não está implementada, e a API informa explicitamente essa limitação. A classificação automática por IA também não está configurada; a página administrativa identifica as comparações actuais como heurísticas. Os reportes comunitários não confirmam avarias de rede, e as localizações são aproximadas.

## Testes

```bash
npm run build
npx ng test --watch=false
cd server
go test ./...
```
