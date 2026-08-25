import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/app-config.module';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';
import type { HealthResult } from './health.service';
import { ApiHealthDocs } from './docs/health.swagger';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @ApiHealthDocs()
  @Get()
  async check(@Res() res: Response): Promise<void> {
    const result = await this.healthService.check();
    const httpStatus = result.status === 'ok' ? 200 : 503;

    res.status(httpStatus).json(this.toPublicResult(result));
  }

  private toPublicResult(
    result: HealthResult,
  ): HealthResult | Omit<HealthResult, 'services'> {
    const isProduction = this.config.app.env === 'production';
    if (isProduction) {
      return {
        status: result.status,
        timestamp: result.timestamp,
      };
    }
    return result;
  }
}
