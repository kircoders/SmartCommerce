// Phase 1

import { Injectable, Logger } from '@nestjs/common';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);
  private readonly ssm = new SSMClient({ region: 'us-east-1' });

  async getBanner(): Promise<string> {
    try {
      const result = await this.ssm.send(
        new GetParameterCommand({ Name: '/smartcommerce/announcement' }),
      );
      return result.Parameter?.Value ?? '';
    } catch (err) {
      this.logger.error('Failed to fetch announcement from Parameter Store', err);
      return '';
    }
  }
}
