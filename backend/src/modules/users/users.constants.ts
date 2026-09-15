export const USERS_EMAIL_UNIQUE = 'users_email_unique';
export const USERNAME_UNIQUE_INDEX = 'users_username_lower_unique';

export const USER_CONFLICT_MESSAGES: Record<string, string> = {
  [USERS_EMAIL_UNIQUE]: 'An account with that email already exists',
  [USERNAME_UNIQUE_INDEX]: 'That username is taken',
};
