export interface AppUser {
  id: string;
  email: string;
  credibilityScore: number;
  createdAt: Date;
}

export interface IUserRepository {
  findById(id: string): Promise<AppUser | null>;
  upsert(id: string, email: string): Promise<AppUser>;
}

export const USER_REPOSITORY = 'USER_REPOSITORY';
