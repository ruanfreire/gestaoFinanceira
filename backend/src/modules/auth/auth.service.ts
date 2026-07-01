import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { asLeanOne } from '../../common/mongoose-lean.util';

type JwtPayload = { sub: any; roles?: string[]; jti?: string };

@Injectable()
export class AuthService {
  constructor(@InjectModel('User') private userModel: Model<any>) {}

  async validateUser(email: string, password: string) {
    const user = asLeanOne<{ password: string } & Record<string, unknown>>(
      await this.userModel.findOne({ email }).lean(),
    );
    if (!user) return null;
    const match = await argon2.verify(user.password, password);
    if (!match) return null;
    // remove password before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...safe } = user as any;
    return safe;
  }

  signAccessToken(payload: object) {
    const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
    const expiresIn = process.env.JWT_ACCESS_EXP || '15m';
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  signRefreshToken(payload: object) {
    const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
    const expiresIn = process.env.JWT_REFRESH_EXP || '7d';
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  async createAndStoreRefreshToken(userId: any) {
    const jti = randomUUID();
    const token = this.signRefreshToken({ sub: userId, jti });
    await this.userModel.findByIdAndUpdate(userId, { $push: { refreshTokens: jti } });
    return { token, jti };
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
      const payload = jwt.verify(token, secret) as JwtPayload;
      return payload;
    } catch (e) {
      return null;
    }
  }

  async revokeRefreshToken(userId: any, jti: string) {
    await this.userModel.findByIdAndUpdate(userId, { $pull: { refreshTokens: jti } });
  }

  async rotateRefreshToken(userId: any, oldJti: string) {
    // remove old jti and create new one
    await this.userModel.findByIdAndUpdate(userId, { $pull: { refreshTokens: oldJti } });
    const jti = randomUUID();
    await this.userModel.findByIdAndUpdate(userId, { $push: { refreshTokens: jti } });
    const token = this.signRefreshToken({ sub: userId, jti });
    return { token, jti };
  }
}

