import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { PrismaService } from '../prisma/prisma.service';
import { AppUser } from './interfaces/user-repository.interface';

const mockPrismaUser = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
};

const mockPrisma = { user: mockPrismaUser };

const fakeUser: AppUser = {
  id: 'sub-abc',
  email: 'rider@sofia.bg',
  credibilityScore: 0,
  createdAt: new Date('2024-01-01'),
};

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repo = module.get<UserRepository>(UserRepository);
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(fakeUser);

      const result = await repo.findById('sub-abc');

      expect(result).toBe(fakeUser);
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'sub-abc' },
      });
    });

    it('returns null when user does not exist', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('creates user if not exists', async () => {
      mockPrismaUser.upsert.mockResolvedValue(fakeUser);

      const result = await repo.upsert('sub-abc', 'rider@sofia.bg');

      expect(result).toBe(fakeUser);
      expect(mockPrismaUser.upsert).toHaveBeenCalledWith({
        where: { id: 'sub-abc' },
        update: { email: 'rider@sofia.bg' },
        create: { id: 'sub-abc', email: 'rider@sofia.bg' },
      });
    });

    it('updates email if user already exists', async () => {
      const updatedUser: AppUser = { ...fakeUser, email: 'new@sofia.bg' };
      mockPrismaUser.upsert.mockResolvedValue(updatedUser);

      const result = await repo.upsert('sub-abc', 'new@sofia.bg');

      expect(result.email).toBe('new@sofia.bg');
      expect(result.id).toBe('sub-abc');
    });
  });
});
