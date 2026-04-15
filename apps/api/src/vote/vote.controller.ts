import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { VoteService } from './vote.service';
import { CastVoteDto } from './cast-vote.dto';

@Controller('reports/:reportId/votes')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async castVote(
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CastVoteDto,
  ) {
    return this.voteService.castVote(reportId, user.userId, dto.type);
  }
}
