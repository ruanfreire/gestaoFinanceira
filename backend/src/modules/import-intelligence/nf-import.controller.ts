import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NfImportService } from './services/nf-import.service';
import type { NfImportProfileMapping } from './types/nf-import-profile.types';

@Controller('import-intelligence/notas')
export class NfImportController {
  constructor(private readonly service: NfImportService) {}

  @Get('profiles')
  listProfiles() {
    return this.service.listProfiles();
  }

  @Get('profiles/:id')
  getProfile(@Param('id') id: string) {
    return this.service.getProfile(id);
  }

  @Post('profiles')
  saveProfile(
    @Body()
    body: {
      name: string;
      description?: string;
      mapping: NfImportProfileMapping;
      confidence_score?: number;
    },
    @Req() req: any,
  ) {
    return this.service.saveProfile({ ...body, userId: req.user?.sub });
  }

  @Patch('profiles/:id')
  updateProfile(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      mapping?: NfImportProfileMapping;
    },
    @Req() req: any,
  ) {
    return this.service.updateProfile(id, { ...body, userId: req.user?.sub });
  }

  @Delete('profiles/:id')
  deleteProfile(@Param('id') id: string) {
    return this.service.deleteProfile(id);
  }

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyze(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const content = file.buffer.toString('utf-8');
    return this.service.analyzeUpload(content, file.originalname, req.user?.sub);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mappingJson?: string,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    if (!mappingJson) throw new BadRequestException('mapping obrigatório');
    const mapping = JSON.parse(mappingJson) as NfImportProfileMapping;
    const content = file.buffer.toString('utf-8');
    return this.service.previewFile(content, mapping);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body('profile_id') profileId: string,
    @Body('mapping') mappingJson: string | undefined,
    @Body('profile_name') profileName: string | undefined,
    @Body('save_profile') saveProfile: string | undefined,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    if (!profileId) throw new BadRequestException('profile_id obrigatório');
    const content = file.buffer.toString('utf-8');
    const mappingOverride = mappingJson
      ? (JSON.parse(mappingJson) as NfImportProfileMapping)
      : undefined;
    return this.service.importFile({
      content,
      fileName: file.originalname,
      profileId,
      userId: req.user?.sub,
      mappingOverride,
      profileName,
      saveProfile: saveProfile === 'true',
    });
  }
}
