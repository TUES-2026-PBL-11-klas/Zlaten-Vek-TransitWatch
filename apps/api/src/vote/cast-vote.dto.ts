import { IsIn } from 'class-validator';

export class CastVoteDto {
  @IsIn(['confirm', 'dispute'])
  type!: 'confirm' | 'dispute';
}
