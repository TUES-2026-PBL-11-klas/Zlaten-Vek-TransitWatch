import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import {
  IUserRepository,
  USER_REPOSITORY,
} from './interfaces/user-repository.interface';
import { PrismaService } from '../prisma/prisma.service';

const mockUserRepo: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  upsert: jest.fn(),
};

const mockPrisma = {
  report: {
    count: jest.fn(),
  },
};

const mockUser = {
  id: 'u1',
  email: 'user@example.com',
  credibilityScore: 10,
  createdAt: new Date('2024-01-01'),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('getProfile', () => {
    it('calls userRepository.findById with the userId', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockPrisma.report.count.mockResolvedValue(3);
      await service.getProfile('u1');
      expect(mockUserRepo.findById).toHaveBeenCalledWith('u1');
    });

    it('calls prisma.report.count with the userId', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockPrisma.report.count.mockResolvedValue(3);
      await service.getProfile('u1');
      expect(mockPrisma.report.count).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
    });

    it('returns the correct profile shape', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockPrisma.report.count.mockResolvedValue(3);
      const result = await service.getProfile('u1');
      expect(result).toEqual({
        id: 'u1',
        email: 'user@example.com',
        credibilityScore: 10,
        reportCount: 3,
        createdAt: mockUser.createdAt,
      });
    });

    it('reflects the actual report count', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockPrisma.report.count.mockResolvedValue(7);
      const result = await service.getProfile('u1');
      expect(result.reportCount).toBe(7);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });

    it('does NOT call prisma.report.count when user is not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.report.count).not.toHaveBeenCalled();
    });
  });
});
