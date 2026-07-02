# Auth — Gestão Financeira

**Última revisão:** 2026-07-02

## Estrutura

```
features/auth/
├── context.tsx              # AuthProvider + useAuth()
├── api.ts                   # Login, logout, sessão, lembrar e-mail
├── hooks/
│   └── use-auth-welcome.ts  # Boas-vindas na primeira visita
├── pages/
│   └── entrar-page.tsx      # Tela de login
├── require-auth.tsx         # Guard de rotas protegidas
├── schema.ts                # Validação Zod do formulário
└── types.ts
```

## Uso

```tsx
import { useAuth } from "@/features/auth/context";

const { user, isAuthenticated, login, logout } = useAuth();
```

## Login (`/auth/entrar`)

- Alias legado: `/auth/signin` → redireciona para `/auth/entrar`
- Credenciais: `POST /api/auth/login` via `@/lib/api-client`
- **Lembrar e-mail:** `localStorage` (`finance.rememberEmail`) — apenas o e-mail
- Após login bem-sucedido, redireciona para `state.from` ou `/`
- `isAuthenticated` baseia-se no token em `localStorage` (`accessToken`)
- **Focus trap** no formulário (`useFocusTrap`) — Tab circula só nos campos do login
- **Boas-vindas** na primeira visita (`Callout` + `gf.auth.welcome.dismissed`)
- **Tema:** `ThemeToggle` no canto superior direito (`AuthTemplate`)
- Sem `TaskGuide` na tela de login (formulário direto)

## Logout

`AppShell` → `logout()` → `POST /api/auth/logout` → limpa token e usuário → `/auth/entrar`

## Rotas protegidas

`RequireAuth` em `features/auth/require-auth.tsx` envolve todas as páginas autenticadas via `ProtectedShell` (`app/protected-shell.tsx`).

## Contrato backend

```
POST /api/auth/login   → { email, password } → { ok, accessToken, user } + cookie refreshToken
POST /api/auth/refresh → cookie → { ok, accessToken }
POST /api/auth/logout  → revoga sessão
```

Em 401: tenta refresh uma vez; falha → limpa sessão → `/auth/entrar`.
