import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route out of the global session guard (it still sees `req.user` if logged in). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
