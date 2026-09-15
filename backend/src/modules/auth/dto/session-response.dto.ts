import type { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class SessionResponseDto {
  user!: UserResponseDto | null;
}
