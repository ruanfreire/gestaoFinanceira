import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AuditService {
  constructor(@InjectModel('AuditLog') private auditModel: Model<any>) {}

  async record(entry: any) {
    return this.auditModel.create(entry);
  }
}

