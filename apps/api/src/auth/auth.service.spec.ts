import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import {
  IUserRepository,
  AppUser,
  USER_REPOSITORY,
} from '../user/interfaces/user-repository.interface';

const mockUserRepo: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  upsert: jest.fn(),
};

const fakeUser: AppUser = {
  id: 'sub-123',
  email: 'test@sofia.bg',
  credibilityScore: 0,
  createdAt: new Date('2024-01-01'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('getOrCreateUser', () => {
    it('creates a new user in DB on first login', async () => {
      mockUserRepo.upsert.mockResolvedValue(fakeUser);

      const result = await service.getOrCreateUser('sub-123', 'test@sofia.bg');

      expect(mockUserRepo.upsert).toHaveBeenCalledWith('sub-123', 'test@sofia.bg');
      expect(result).toBe(fakeUser);
    });

    it('returns existing user on subsequent logins without overwriting data', async () => {
      const existingUser: AppUser = { ...fakeUser, credibilityScore: 42 };
      mockUserRepo.upsert.mockResolvedValue(existingUser);

      const result = await service.getOrCreateUser('sub-123', 'test@sofia.bg');

      expect(result.credibilityScore).toBe(42);
      expect(result.id).toBe('sub-123');
    });
  });

  describe('getUser', () => {
    it('returns user when found', async () => {
      mockUserRepo.findById.mockResolvedValue(fakeUser);

      const result = await service.getUser('sub-123');

      expect(result).toBe(fakeUser);
      expect(mockUserRepo.findById).toHaveBeenCalledWith('sub-123');
    });

    it('returns null when user does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await service.getUser('unknown-sub');

      expect(result).toBeNull();
    });
  });
});
