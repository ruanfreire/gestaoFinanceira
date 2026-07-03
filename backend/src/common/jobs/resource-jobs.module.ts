import { Global, Module } from '@nestjs/common';
import { ResourceJobQueueService } from './resource-job-queue.service';

@Global()
@Module({
  providers: [ResourceJobQueueService],
  exports: [ResourceJobQueueService],
})
export class ResourceJobsModule {}
