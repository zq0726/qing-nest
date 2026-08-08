import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** 对明文密码进行哈希 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** 校验明文密码与哈希是否匹配 */
export async function comparePassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
