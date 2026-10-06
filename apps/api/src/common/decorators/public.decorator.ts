import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opt a route out of the global JWT requirement. A valid token is still read if present. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
