import {
  All,
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { TenantRoles } from '../../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../../common/guards/tenant-roles.guard';
import { SkipTenant } from '../../common/tenant/skip-tenant.decorator';
import { UpdateHonestIntegrationDto } from './dto/update-honest-integration.dto';
import { HonestCaptureDto, HonestConfirmEndpointDto, HonestConnectDto, HonestSelectEmpresaDto } from './dto/honest-connect.dto';
import { HonestIntegrationService } from './honest-integration.service';
import { IntegrationsWorkerService } from './integrations-worker.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly honestService: HonestIntegrationService,
    private readonly workerService: IntegrationsWorkerService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  async list(@Req() req: { user: { tenantId?: string } }) {
    const honest = await this.honestService.getConfig(req.user.tenantId!);
    return {
      items: [
        {
          key: 'honest',
          name: honest.name,
          description: honest.description,
          configured: honest.has_credentials && Boolean(honest.selected_endpoint_id),
          enabled: honest.enabled,
          auto_sync_enabled: honest.auto_sync_enabled,
          last_sync_at: honest.last_sync_at,
          last_sync_status: honest.last_sync_status,
        },
      ],
    };
  }

  @Get('honest')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  getHonest(@Req() req: { user: { tenantId?: string } }) {
    return this.honestService.getConfig(req.user.tenantId!);
  }

  @Patch('honest')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  updateHonest(@Req() req: { user: { tenantId?: string } }, @Body() body: UpdateHonestIntegrationDto) {
    return this.honestService.updateConfig(req.user.tenantId!, body);
  }

  @Post('honest/connect')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  connectHonest(@Req() req: { user: { tenantId?: string } }, @Body() body: HonestConnectDto) {
    return this.honestService.connect(req.user.tenantId!, body);
  }

  @Post('honest/discover/start')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  startDiscovery(@Req() req: { user: { tenantId?: string } }) {
    return this.honestService.startDiscovery(req.user.tenantId!);
  }

  @Post('honest/discover/stop')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  stopDiscovery(@Req() req: { user: { tenantId?: string } }) {
    return this.honestService.stopDiscovery(req.user.tenantId!);
  }

  @Post('honest/discover/scan')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  async scanDiscovery(@Req() req: { user: { tenantId?: string } }) {
    await this.honestService.scanEndpoints(req.user.tenantId!);
    return this.honestService.getConfig(req.user.tenantId!);
  }

  @Post('honest/discover/capture')
  @Public()
  @SkipTenant()
  captureDiscovery(
    @Query('tenantId') tenantId: string,
    @Query('token') token: string,
    @Body() body: HonestCaptureDto,
  ) {
    if (!tenantId || !token) {
      throw new UnauthorizedException('Exploração inválida');
    }
    return this.honestService.captureEndpoint(tenantId, body, token);
  }

  @Post('honest/verify/graphql')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  verifyGraphql(@Req() req: { user: { tenantId?: string } }) {
    return this.honestService.verifyGraphql(req.user.tenantId!);
  }

  @Post('honest/discover/empresa')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  discoverEmpresa(@Req() req: { user: { tenantId?: string } }) {
    return this.honestService.discoverHonestEmpresa(req.user.tenantId!);
  }

  @Post('honest/select-empresa')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  selectEmpresa(@Req() req: { user: { tenantId?: string } }, @Body() body: HonestSelectEmpresaDto) {
    return this.honestService.selectHonestEmpresa(req.user.tenantId!, Number(body.empresa_id));
  }

  @Post('honest/discover/confirm')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  confirmDiscovery(@Req() req: { user: { tenantId?: string } }, @Body() body: HonestConfirmEndpointDto) {
    return this.honestService.confirmEndpoint(req.user.tenantId!, body.endpoint_id);
  }

  @All('honest/browse')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  async browseHonestRoot(
    @Req() req: { user: { tenantId?: string } },
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const proxied = await this.honestService.proxyBrowse(req.user.tenantId!, '/', token);
    res.setHeader('Content-Type', proxied.contentType);
    res.status(200).send(proxied.body);
  }

  @All('honest/browse/*')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  async browseHonest(
    @Req() req: { user: { tenantId?: string }; url: string },
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const prefix = '/api/integrations/honest/browse';
    const path = req.url.split('?')[0].includes(prefix)
      ? req.url.split('?')[0].split(prefix)[1] || '/'
      : '/';
    const proxied = await this.honestService.proxyBrowse(req.user.tenantId!, path, token);
    res.setHeader('Content-Type', proxied.contentType);
    res.status(200).send(proxied.body);
  }

  @Post('honest/sync')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('owner')
  syncHonest(@Req() req: { user: { sub?: string; tenantId?: string } }) {
    return this.honestService.sync(req.user.tenantId!, req.user.sub, 'manual');
  }

  @Post('worker/run')
  @Public()
  @SkipTenant()
  runWorker(@Headers('x-integrations-cron-secret') secret?: string) {
    const expected = this.config.get<string>('INTEGRATIONS_CRON_SECRET');
    if (!expected?.trim()) {
      throw new UnauthorizedException('Worker externo não configurado (INTEGRATIONS_CRON_SECRET).');
    }
    if (secret !== expected) {
      throw new UnauthorizedException('Segredo do worker inválido.');
    }
    return this.workerService.runNow();
  }
}
