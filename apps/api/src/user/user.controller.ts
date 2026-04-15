import { Controller, Get, Request } from '@nestjs/common';
import { UserService } from './user.service';

interface AuthenticatedRequest {
  user: { userId: string; email: string };
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me/profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.userService.getProfile(req.user.userId);
  }
}
