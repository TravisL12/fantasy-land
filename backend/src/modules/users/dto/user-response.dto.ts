import type { PublicUser } from '../users.types.js';

export class UserResponseDto implements PublicUser {
  id!: string;
  email!: string;
  username!: string;
  createdAt!: Date;
}
