import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'rider@example.com' })
  email: string;

  @ApiProperty({
    description: 'Credibility score based on report accuracy history',
    example: 75,
  })
  credibilityScore: number;

  @ApiProperty({
    description: 'Total number of reports submitted',
    example: 12,
  })
  reportCount: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}
