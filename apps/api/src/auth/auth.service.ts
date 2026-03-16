import { Inject, Injectable } from '@nestjs/common';
import type {
  IUserRepository,
  AppUser,
} from '../user/interfaces/user-repository.interface';
import { USER_REPOSITORY } from '../user/interfaces/user-repository.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async getOrCreateUser(supabaseId: string, email: string): Promise<AppUser> {
    return this.userRepository.upsert(supabaseId, email);
  }

  async getUser(supabaseId: string): Promise<AppUser | null> {
    return this.userRepository.findById(supabaseId);
  }
}
