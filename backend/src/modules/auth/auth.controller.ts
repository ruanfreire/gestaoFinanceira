import { Body, Controller, Post, Res, Req, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';

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
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      return { ok: false, message: 'Invalid credentials' };
    }
    const accessToken = this.authService.signAccessToken({ sub: user._id, roles: user.roles });
    const { token: refreshToken } = await this.authService.createAndStoreRefreshToken(user._id);
    res.cookie('refreshToken', refreshToken, cookieOptions());
    return { ok: true, accessToken, user };
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const cookie = req.cookies?.refreshToken;
    if (!cookie) return { ok: false, message: 'No refresh token' };
    const payload = await this.authService.verifyRefreshToken(cookie);
    if (!payload || !payload.sub || !payload.jti) return { ok: false, message: 'Invalid refresh token' };
    const user = await (this.authService as any).userModel.findById(payload.sub).lean();
    if (!user) return { ok: false, message: 'User not found' };
    if (!(user.refreshTokens || []).includes(payload.jti)) {
      // token reuse detected — revoke all sessions
      await (this.authService as any).userModel.findByIdAndUpdate(payload.sub, { $set: { refreshTokens: [] } });
      return { ok: false, message: 'Refresh token reuse detected' };
    }
    // rotate token
    await this.authService.revokeRefreshToken(payload.sub, payload.jti);
    const { token: newRefresh } = await this.authService.createAndStoreRefreshToken(payload.sub);
    const accessToken = this.authService.signAccessToken({ sub: payload.sub, roles: user.roles });
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
      if (payload && payload.sub && payload.jti) {
        await this.authService.revokeRefreshToken(payload.sub, payload.jti);
      }
    }
    res.clearCookie('refreshToken', { path: '/' });
    return { ok: true };
  }
}

