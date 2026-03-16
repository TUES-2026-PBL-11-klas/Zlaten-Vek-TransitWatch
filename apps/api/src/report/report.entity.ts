import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ReportCategory, ReportStatus } from '../../../../packages/shared/src/enums';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  stopId: string;

  @Column({
    type: 'enum',
    enum: ReportCategory,
  })
  category: ReportCategory;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.ACTIVE,
  })
  status: ReportStatus;

  @Column('text', { nullable: true })
  description: string;

  @Column('int', { default: 0 })
  confirmations: number;

  @Column('int', { default: 0 })
  disputes: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column('timestamp')
  expiresAt: Date;
}