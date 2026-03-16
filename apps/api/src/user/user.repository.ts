import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IUserRepository,
  AppUser,
} from './interfaces/user-repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AppUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async upsert(id: string, email: string): Promise<AppUser> {
    return this.prisma.user.upsert({
      where: { id },
      update: { email },
      create: { id, email },
    });
  }
}
