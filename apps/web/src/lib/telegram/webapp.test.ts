import {createHmac} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {verifyTelegramWebAppInitData} from './webapp';

function signedInitData(authDate: number) {
  const token = 'test-token';
  const values = new URLSearchParams({auth_date: String(authDate), user: JSON.stringify({id: 42, first_name: 'Ada'})});
  const dataCheckString = [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  values.set('hash', createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return {token, initData: values.toString()};
}

describe('verifyTelegramWebAppInitData', () => {
  it('accepts a fresh signed session', () => {
    const {token, initData} = signedInitData(Math.floor(Date.now() / 1000));
    expect(verifyTelegramWebAppInitData(initData, token, 60).id).toBe(42);
  });
  it('rejects stale and materially future sessions', () => {
    const now = Math.floor(Date.now() / 1000);
    const stale = signedInitData(now - 61);
    const future = signedInitData(now + 31);
    expect(() => verifyTelegramWebAppInitData(stale.initData, stale.token, 60)).toThrow('Invalid Telegram Mini App init data');
    expect(() => verifyTelegramWebAppInitData(future.initData, future.token, 60)).toThrow('Invalid Telegram Mini App init data');
  });
});
