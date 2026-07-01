# Autenticação e Proteção de Rotas (Guia Rápido)

Este projeto aplica por padrão um guard global JWT para proteger as rotas da API. Abaixo as instruções de uso e como tornar rotas públicas quando necessário.

Arquivos relevantes
- Guard global JWT: `backend/src/modules/auth/jwt.guard.ts`
- Registro do guard global: `backend/src/app.module.ts` (APP_GUARD)
- Decorator para rotas públicas: `backend/src/common/decorators/public.decorator.ts` (`@Public()`)
- Controlador de autenticação: `backend/src/modules/auth/auth.controller.ts`

Como funciona (resumo)
- O guard global verifica o header `Authorization: Bearer <token>` em todas as rotas por padrão.
- Se a rota estiver marcada com `@Public()`, o guard permite acesso sem token.
- O fluxo de autenticação (scaffold) fornece login, refresh (rotação de refresh tokens) e logout, com refresh tokens armazenados por JTI no documento `User`.

Exemplo — Tornar rota pública
```ts
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  @Post('login')
  @Public()
  async login(...) { ... }
}
```

Recomendações
- Sempre marcar endpoints de autenticação (login/refresh/logout) como `@Public()`.
- Proteja endpoints sensíveis com validações adicionais e, preferencialmente, RBAC.
- Em produção, defina `NODE_ENV=production` para forçar cookies `secure` e `sameSite=none`.
- Considere hashear identifiers de refresh tokens em produção e usar um store de sessão/blacklist para revogação.

