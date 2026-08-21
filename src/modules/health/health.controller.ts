import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';
import { ApiHealthDocs } from './docs/health.swagger';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @ApiHealthDocs()
  @Get()
  async check(@Res() res: Response): Promise<void> {
    const result = await this.healthService.check();
    const httpStatus = result.status === 'ok' ? 200 : 503;
    res.status(httpStatus).json(result);
  }
}
