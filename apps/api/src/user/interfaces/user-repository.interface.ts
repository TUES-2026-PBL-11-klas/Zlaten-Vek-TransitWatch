import { User } from '@prisma/client';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(data: { email: string }): Promise<User>;
}

export const USER_REPOSITORY = 'IUserRepository';
