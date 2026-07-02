import { IsIn } from 'class-validator';
import type { PlanId } from '../../../common/billing/plans.config';

export class CreateCheckoutDto {
  @IsIn(['starter', 'pro'])
  plan!: Exclude<PlanId, 'trial'>;
}
