import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IUserRepository,
  USER_REPOSITORY,
} from './interfaces/user-repository.interface';

export interface UserProfileDto {
  id: string;
  email: string;
  credibilityScore: number;
  reportCount: number;
  createdAt: Date;
}

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const reportCount = await this.prisma.report.count({
      where: { userId },
    });

    return {
      id: user.id,
      email: user.email,
      credibilityScore: user.credibilityScore,
      reportCount,
      createdAt: user.createdAt,
    };
  }
}
