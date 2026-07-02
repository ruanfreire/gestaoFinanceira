import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('aceita credenciais válidas', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@finance.local',
      password: 'secret',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejeita e-mail inválido', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: 'secret',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejeita senha vazia', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@finance.local',
      password: '',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
