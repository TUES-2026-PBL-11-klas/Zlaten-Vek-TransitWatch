import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportCategory } from '../../../../packages/shared/src/enums';

export class CreateReportDto {
  @ApiProperty({
    description: 'UUID of the transit line being reported',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  lineId: string;

  @ApiPropertyOptional({
    description: 'Vehicle identifier (e.g. GTFS vehicle ID)',
    example: 'VH-1042',
  })
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @ApiProperty({
    description: 'Category of the issue being reported',
    enum: ReportCategory,
    example: ReportCategory.VEHICLE_ISSUE,
  })
  @IsEnum(ReportCategory)
  category: ReportCategory;

  @ApiPropertyOptional({
    description: 'Optional description of the issue (max 140 characters)',
    maxLength: 140,
    example: 'AC is broken, very hot inside',
  })
  @IsString()
  @MaxLength(140)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL of an uploaded photo',
    example: 'https://storage.example.com/reports/photo.jpg',
  })
  @IsString()
  @IsOptional()
  photoUrl?: string;
}
