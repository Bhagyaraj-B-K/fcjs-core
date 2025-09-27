import { z, ZodError } from 'zod';
import { Typecast } from './typecast.util.js';

export class ZodUtil {
  static isZodError(err: unknown): err is z.ZodError<unknown> {
    const e = new Typecast(err).to(
      z.object({
        name: z.string().optional(),
        issues: z.array(z.any()).optional(),
      }),
    );
    return err instanceof ZodError || e.name === 'ZodError';
  }
}
