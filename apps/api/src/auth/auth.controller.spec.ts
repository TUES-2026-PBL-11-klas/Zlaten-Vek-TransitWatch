import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  getOrCreateUser: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('getMe', () => {
    const mockUser = { userId: 'u1', email: 'user@example.com' };
    const mockProfile = {
      id: 'u1',
      email: 'user@example.com',
      credibilityScore: 5,
      createdAt: new Date(),
    };

    it('calls authService.getOrCreateUser with userId and email', async () => {
      mockAuthService.getOrCreateUser.mockResolvedValue(mockProfile);
      await controller.getMe(mockUser as any);
      expect(mockAuthService.getOrCreateUser).toHaveBeenCalledWith(
        'u1',
        'user@example.com',
      );
    });

    it('returns the result from authService.getOrCreateUser', async () => {
      mockAuthService.getOrCreateUser.mockResolvedValue(mockProfile);
      const result = await controller.getMe(mockUser as any);
      expect(result).toEqual(mockProfile);
    });

    it('propagates errors from authService', async () => {
      mockAuthService.getOrCreateUser.mockRejectedValue(
        new Error('Auth error'),
      );
      await expect(controller.getMe(mockUser as any)).rejects.toThrow(
        'Auth error',
      );
    });
  });
});
