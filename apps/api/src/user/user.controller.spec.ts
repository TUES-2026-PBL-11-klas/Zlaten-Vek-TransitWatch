import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const mockUserService = {
  getProfile: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('getProfile', () => {
    const mockProfile = {
      id: 'u1',
      email: 'user@example.com',
      credibilityScore: 10,
      reportCount: 3,
      createdAt: new Date(),
    };

    it('calls userService.getProfile with the userId from request', async () => {
      mockUserService.getProfile.mockResolvedValue(mockProfile);
      const req = { user: { userId: 'u1', email: 'user@example.com' } } as any;
      await controller.getProfile(req);
      expect(mockUserService.getProfile).toHaveBeenCalledWith('u1');
    });

    it('returns the result from userService.getProfile', async () => {
      mockUserService.getProfile.mockResolvedValue(mockProfile);
      const req = { user: { userId: 'u1', email: 'user@example.com' } } as any;
      const result = await controller.getProfile(req);
      expect(result).toEqual(mockProfile);
    });

    it('propagates NotFoundException from service', async () => {
      mockUserService.getProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );
      const req = { user: { userId: 'missing', email: 'x@x.com' } } as any;
      await expect(controller.getProfile(req)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
