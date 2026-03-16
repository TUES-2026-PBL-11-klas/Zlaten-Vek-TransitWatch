import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { USER_REPOSITORY } from './interfaces/user-repository.interface';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
