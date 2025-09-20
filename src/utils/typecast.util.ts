import { z } from 'zod';

export class Typecast {
  constructor(private data: unknown) {}

  public to<T extends z.ZodTypeAny>(_schema: T): z.infer<T> {
    return this.data as z.infer<T>;
  }

  public parse<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
    return schema.parse(this.data) as z.infer<T>;
  }
}

export function typecast<T extends z.ZodTypeAny>(
  _: T,
  data: unknown,
): z.infer<T> {
  return data as z.infer<T>;
}
