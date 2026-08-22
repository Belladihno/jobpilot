import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';

export class HealthServicesDto {
  @ApiProperty({ example: 'up' }) api!: string;
  @ApiProperty({ example: 'up' }) postgres!: string;
  @ApiProperty({ example: 'up' }) redis!: string;
  @ApiProperty({ example: 'up' }) rabbitmq!: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' }) status!: string;
  @ApiProperty() timestamp!: string;
  @ApiProperty({ type: HealthServicesDto }) services!: HealthServicesDto;
}

export const ApiHealthDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Health check',
      description:
        'Postgres + Redis + RabbitMQ. Per-service detail is omitted in production.',
    }),
    ApiOkResponse({ description: 'All services up', type: HealthResponseDto }),
    ApiServiceUnavailableResponse({ description: 'One or more services down' }),
  );
