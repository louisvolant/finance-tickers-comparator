import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionCookie, getSessionSecret } from '../src/lib/session';
import { verifySession } from '../src/lib/authCrypto';
import { SessionUser } from '../src/lib/types';

const user: SessionUser = {
  id: 'usr_test',
  email: 'test@example.com',
  username: 'Tester',
};

describe('Session cookie', () => {
  test('builds a 30-day HttpOnly SameSite=Lax session cookie', async () => {
    const before = Date.now();
    const cookie = await createSessionCookie(user, true);

    assert.equal(cookie.name, 'tt_session');
    assert.equal(cookie.options.httpOnly, true);
    assert.equal(cookie.options.secure, true);
    assert.equal(cookie.options.sameSite, 'lax');
    assert.equal(cookie.options.path, '/');
    assert.equal(cookie.options.maxAge, 30 * 24 * 60 * 60);
    assert.ok(cookie.options.expires.getTime() >= before + 29 * 24 * 60 * 60 * 1000);

    const sessionUser = await verifySession<SessionUser>(cookie.value, getSessionSecret());
    assert.ok(sessionUser);
    assert.deepEqual(sessionUser, user);
  });

  test('does not force Secure on plain HTTP development origins', async () => {
    const cookie = await createSessionCookie(user, false);
    assert.equal(cookie.options.secure, false);
  });
});
