import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ReportCategory } from '../../../../packages/shared/src/enums';

export class CreateReportDto {
  @IsUUID()
  lineId: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsEnum(ReportCategory)
  category: ReportCategory;

  @IsString()
  @MaxLength(140)
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}
