import { IsIn } from 'class-validator';
import type { PlanId } from '../../../common/billing/plans.config';

export class SetClientPlanDto {
  @IsIn(['trial', 'starter', 'pro'])
  plan!: PlanId;
}
