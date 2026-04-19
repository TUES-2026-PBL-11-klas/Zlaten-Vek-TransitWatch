import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { VoteService } from './vote.service';
import { CastVoteDto } from './cast-vote.dto';

@ApiTags('votes')
@Controller('reports/:reportId/votes')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Cast a confirm or dispute vote on a report' })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiResponse({
    status: 201,
    description:
      'Vote recorded; returns updated vote counts and report credibility score',
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async castVote(
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CastVoteDto,
  ) {
    return this.voteService.castVote(reportId, user.userId, dto.type);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Get vote counts for a report (includes userVote if authenticated)',
  })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiResponse({
    status: 200,
    description: 'Vote summary',
    schema: {
      example: { confirms: 5, disputes: 1, userVote: 'confirm' },
    },
  })
  async getVotes(
    @Param('reportId') reportId: string,
    @Req() req: Request & { user?: AuthUser | null },
  ) {
    const userId = req.user?.userId ?? null;
    return this.voteService.getVoteSummary(reportId, userId);
  }
}
