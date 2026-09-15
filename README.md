# Fantasy Land

```bash
cp .env.example .env
yarn dev          # docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/api/health

Local (no Docker): `yarn install:all`, then `yarn be start:dev` and `yarn fe dev` in two terminals.

`yarn verify` runs lint, typecheck, tests, and builds for both apps.
