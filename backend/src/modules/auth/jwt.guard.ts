import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';

const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token ausente');
    }
    const token = auth.split(' ')[1];
    try {
      const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
      const payload = jwt.verify(token, secret);
      req.user = payload;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}

