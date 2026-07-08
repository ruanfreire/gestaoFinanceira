import { Body, Controller, Get, Post, Req, Res, HttpCode, UnauthorizedException, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AcceptInviteDto } from '../org/dto/invite.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SkipTenant } from '../../common/tenant/skip-tenant.decorator';
import { LOGIN_STATUS_MESSAGES } from '../../common/constants/user-status';
import { OrgService } from '../org/org.service';

function resolveSameSite(): 'lax' | 'strict' | 'none' {
  const configured = process.env.COOKIE_SAME_SITE;
  if (configured === 'lax' || configured === 'strict' || configured === 'none') {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return { httpOnly: true, secure: isProd, sameSite: resolveSameSite(), path: '/' as const };
}

@Controller('auth')
@SkipTenant()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly orgService: OrgService,
  ) {}

  @Post('signup')
  @Public()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @Get('invite/:token')
  @Public()
  previewInvite(@Param('token') token: string) {
    return this.orgService.previewInvite(token);
  }

  @Post('accept-invite')
  @Public()
  @HttpCode(201)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async acceptInvite(@Body() body: AcceptInviteDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.acceptInvite(body);
    if (result.ok && result.accessToken && result.user) {
      const userId = String((result.user as { _id: unknown })._id);
      await this.authService.recordLogin(userId, req.ip);
      const { token: refreshToken } = await this.authService.createAndStoreRefreshToken(userId);
      res.cookie('refreshToken', refreshToken, cookieOptions());
    }
    return result;
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() body: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(body);
  }

  @Get('reset-password/:token')
  @Public()
  previewPasswordReset(@Param('token') token: string) {
    return this.authService.previewPasswordReset(token);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async login(@Body() body: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    try {
      const user = await this.authService.validateUser(body.email, body.password);
      if (!user) {
        return { ok: false, message: 'Credenciais inválidas' };
      }
      await this.authService.recordLogin(String(user._id), req.ip);
      const fullUser = await this.authService.getUserById(String(user._id));
      const sessionUser = (fullUser ?? user) as Record<string, unknown>;
      this.authService.assertClientAppUserReady(sessionUser);
      const accessToken = this.authService.signAccessToken(
        this.authService.buildAccessPayload(sessionUser),
      );
      const { token: refreshToken } = await this.authService.createAndStoreRefreshToken(user._id);
      res.cookie('refreshToken', refreshToken, cookieOptions());
      return { ok: true, accessToken, user: sessionUser };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return { ok: false, message: error.message };
      }
      throw error;
    }
  }

  @Get('me')
  async me(@Req() req: any) {
    const user = await this.authService.getUserById(req.user.sub);
    if (!user) return { ok: false, message: 'Usuário não encontrado' };
    return { ok: true, user };
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const cookie = req.cookies?.refreshToken;
    if (!cookie) return { ok: false, message: 'No refresh token' };
    const payload = await this.authService.verifyRefreshToken(cookie);
    if (!payload?.sub || !payload.jti) return { ok: false, message: 'Invalid refresh token' };

    const user = await (this.authService as any).userModel.findById(payload.sub).lean();
    if (!user) return { ok: false, message: 'User not found' };

    const status = user.status || 'approved';
    if (status !== 'approved') {
      res.clearCookie('refreshToken', { path: '/' });
      return {
        ok: false,
        message: LOGIN_STATUS_MESSAGES[status as keyof typeof LOGIN_STATUS_MESSAGES] || 'Acesso negado',
      };
    }

    try {
      await this.authService.assertOrganizationAllowed(user.tenantId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        res.clearCookie('refreshToken', { path: '/' });
        return { ok: false, message: error.message };
      }
      throw error;
    }

    if (!(user.refreshTokens || []).includes(payload.jti)) {
      await (this.authService as any).userModel.findByIdAndUpdate(payload.sub, { $set: { refreshTokens: [] } });
      return { ok: false, message: 'Refresh token reuse detected' };
    }

    await this.authService.revokeRefreshToken(payload.sub, payload.jti);
    const { token: newRefresh } = await this.authService.createAndStoreRefreshToken(payload.sub);
    const accessToken = this.authService.signAccessToken({
      sub: payload.sub,
      roles: user.roles,
      tenantId: user.tenantId ? String(user.tenantId) : undefined,
      tenantRole: user.tenantRole,
    });
    res.cookie('refreshToken', newRefresh, cookieOptions());
    return { ok: true, accessToken };
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const cookie = req.cookies?.refreshToken;
    if (cookie) {
      const payload = await this.authService.verifyRefreshToken(cookie);
      if (payload?.sub && payload.jti) {
        await this.authService.revokeRefreshToken(payload.sub, payload.jti);
      }
    }
    res.clearCookie('refreshToken', { path: '/' });
    return { ok: true };
  }
}
