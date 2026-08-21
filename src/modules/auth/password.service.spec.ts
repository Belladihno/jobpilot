import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes and verifies correctly', async () => {
    const plain = 'StrongPass123!';
    const hash = await service.hash(plain);
    expect(hash).not.toBe(plain);
    expect(await service.verify(hash, plain)).toBe(true);
  });

  it('fails verify with wrong password', async () => {
    const hash = await service.hash('correct-password');
    expect(await service.verify(hash, 'wrong-password')).toBe(false);
  });

  it('produces different hashes for same password (salt)', async () => {
    const h1 = await service.hash('same-pass');
    const h2 = await service.hash('same-pass');
    expect(h1).not.toBe(h2);
  });
});
