import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SkipTenant } from '../../common/tenant/skip-tenant.decorator';
import { BillingService } from './billing.service';

@Controller('billing')
@SkipTenant()
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      return { received: false, message: 'Payload ausente' };
    }

    const event = this.billingService.constructWebhookEvent(payload, signature);
    await this.billingService.handleWebhookEvent(event);
    return { received: true };
  }
}
