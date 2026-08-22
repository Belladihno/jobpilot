import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AppConfig } from '../../config/configuration';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';
import type { HealthResult } from './health.service';
import { ApiHealthDocs } from './docs/health.swagger';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly config: ConfigService<AppConfig, true>,
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
    const isProduction =
      this.config.get('app.env', { infer: true }) === 'production';
    if (isProduction) {
      return {
        status: result.status,
        timestamp: result.timestamp,
      };
    }
    return result;
  }
}
