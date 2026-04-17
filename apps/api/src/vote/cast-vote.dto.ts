import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CastVoteDto {
  @ApiProperty({
    description: 'Vote type — confirm the report is accurate or dispute it',
    enum: ['confirm', 'dispute'],
    example: 'confirm',
  })
  @IsIn(['confirm', 'dispute'])
  type!: 'confirm' | 'dispute';
}
