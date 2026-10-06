import { describe, expect, it } from 'vitest';
import { loginSchema, registerFormSchema, registerSchema } from './auth.js';

describe('registerSchema', () => {
  const valid = {
    email: '  Ada@Example.COM ',
    password: 'secret123',
    firstName: 'Ada',
    lastName: 'Lovelace',
  };

  it('normalises the email', () => {
    expect(registerSchema.parse(valid).email).toBe('ada@example.com');
  });

  it('rejects weak passwords', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: 'lettersonly' }).success).toBe(false);
  });

  it('treats an empty phone as missing', () => {
    expect(registerSchema.parse({ ...valid, phone: '' }).phone).toBeUndefined();
  });

  it('requires matching confirmation in the form schema', () => {
    const r = registerFormSchema.safeParse({ ...valid, confirmPassword: 'other123' });
    expect(r.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});
