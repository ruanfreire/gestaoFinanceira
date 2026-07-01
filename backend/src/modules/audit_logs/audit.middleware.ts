import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Lightweight middleware to attach startTime and capture user/ip for later logging
    (req as any).audit = {
      user: (req as any).user?.sub || null,
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      startTime: Date.now(),
    };
    next();
  }
}

