import { hash, verify } from '@node-rs/argon2';

const options = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

const dummyHashPromise = hashPassword('titanapt-dummy-password-not-used');

export async function verifyDummyPassword(password: string): Promise<void> {
  const dummyHash = await dummyHashPromise;
  await verifyPassword(dummyHash, password);
}
