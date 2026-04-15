import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';
import { PrismaVoteRepository } from './repositories/prisma-vote.repository';
import { VOTE_REPOSITORY } from './interfaces/vote-repository.interface';

@Module({
  imports: [AuthModule],
  controllers: [VoteController],
  providers: [
    VoteService,
    { provide: VOTE_REPOSITORY, useClass: PrismaVoteRepository },
  ],
})
export class VoteModule {}
