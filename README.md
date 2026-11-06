# IoT Lock App

Frontend React + TypeScript para consultar a API Go do IoT Lock.

## Desenvolvimento

1. Inicie a API em `api-iot-lock` com `go run .`. Por padrão, ela escuta em `http://localhost:8080`.
2. Na pasta `app-iot-lock`, instale as dependências com `npm install`.
3. Inicie o frontend com `npm run dev` e abra o endereço informado pelo Vite.

Durante o desenvolvimento, o Vite encaminha `/api/*` para `http://localhost:8080`. Para outra porta, ajuste o destino em `vite.config.ts`.

O painel consulta `GET /api/users`, `GET /api/cards` e `GET /api/access-logs/recent?limit=20`. Em produção, defina `VITE_API_URL` com a URL base da API, incluindo `/api`; o servidor da API deve permitir a origem do frontend ou ser publicado atrás de um proxy de mesma origem.