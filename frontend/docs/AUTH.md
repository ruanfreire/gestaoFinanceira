# Auth — Gestão Financeira

## Estrutura

```
features/auth/
├── components/
│   ├── RequireAuth.tsx    # Guard de rotas protegidas
│   └── UserMenu.tsx       # Menu do usuário no header
├── context/
│   └── AuthContext.tsx    # AuthProvider + useAuth()
├── pages/
│   └── SignInPage.tsx     # Tela de login
├── services/
│   └── auth.service.ts    # Login, logout, sessão, lembrar e-mail
└── types/
    └── auth.types.ts
```

## Uso

```tsx
import { useAuth } from "@/features/auth/context/AuthContext";

const { user, isAuthenticated, login, logout } = useAuth();
```

## Login

- `SignInPage` injeta `onLogin` no `SignInForm` da UI
- Credenciais vão para `POST /api/auth/login` via `api.client`
- **Lembrar e-mail:** salva apenas o e-mail em `localStorage` (`finance.rememberEmail`)
- Após login, redireciona para a rota de origem (`state.from`) ou `/`

## Logout

`UserMenu` → `authService.logout()` → limpa token e usuário → `/auth/signin`

## SignInForm (UI)

Props opcionais para integração com o app:

| Prop | Tipo | Descrição |
|------|------|-----------|
| `onLogin` | `(credentials) => Promise<void>` | Handler de login do app |
| `initialEmail` | `string` | E-mail pré-preenchido |

Sem `onLogin`, mantém comportamento legado (fetch direto) para o demo TailAdmin.
