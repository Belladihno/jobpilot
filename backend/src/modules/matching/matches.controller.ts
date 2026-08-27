import { Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import { ZodQuery } from '../../common/decorators/zod-query.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { MatchingService } from './matching.service';
import { MatchListQuerySchema } from './schemas/match-list.query.schema';
import type { MatchListQuery } from './schemas/match-list.query.schema';
import { UpdateMatchStatusSchema } from './schemas/update-match-status.schema';
import type { UpdateMatchStatusDto } from './schemas/update-match-status.schema';
import {
  ApiGetMatchDocs,
  ApiListMatchesDocs,
  ApiUpdateMatchStatusDocs,
} from './docs/matches.swagger';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchingService: MatchingService) {}

  @ApiListMatchesDocs()
  @Get()
  list(
    @CurrentUser() user: UserEntity,
    @ZodQuery(MatchListQuerySchema) query: MatchListQuery,
  ) {
    return this.matchingService.getMatches(user.id, query);
  }

  @ApiGetMatchDocs()
  @Get(':id')
  getOne(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.matchingService.getMatch(user.id, id);
  }

  @ApiUpdateMatchStatusDocs()
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateMatchStatusSchema) dto: UpdateMatchStatusDto,
  ) {
    return this.matchingService.updateMatchStatus(user.id, id, dto.status);
  }
}
