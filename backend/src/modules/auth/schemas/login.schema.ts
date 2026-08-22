import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export type LoginDto = z.infer<typeof LoginSchema>;
