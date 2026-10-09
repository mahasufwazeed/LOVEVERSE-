describe('Partner Pairing & Security Protocol', () => {
  const sanitizeCode = (code: string) => code.trim().toUpperCase();
  const isValidInviteCode = (code: string) => /^[A-Z0-9]{6}$/.test(sanitizeCode(code));

  it('validates 6-character alphanumeric uppercase invite codes', () => {
    expect(isValidInviteCode('A9B2X7')).toBe(true);
    expect(isValidInviteCode('123456')).toBe(true);
    expect(isValidInviteCode('k9m2p4')).toBe(true); // lower-case normalized
    expect(isValidInviteCode(' A9B2X7 ')).toBe(true); // trimmed
  });

  it('rejects malformed or invalid invite codes', () => {
    expect(isValidInviteCode('')).toBe(false);
    expect(isValidInviteCode('ABC')).toBe(false); // too short
    expect(isValidInviteCode('ABCDEFG123')).toBe(false); // too long
    expect(isValidInviteCode('A9B-X7')).toBe(false); // invalid special char
  });

  it('calculates invitation expiration after 48 hours', () => {
    const createdAt = new Date('2026-10-09T12:00:00Z');
    const expiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

    const checkExpired = (now: Date) => now.getTime() > expiresAt.getTime();

    expect(checkExpired(new Date('2026-10-10T12:00:00Z'))).toBe(false); // 24h later: valid
    expect(checkExpired(new Date('2026-10-11T12:00:00Z'))).toBe(false); // 48h later: boundary
    expect(checkExpired(new Date('2026-10-11T12:01:00Z'))).toBe(true);  // expired
  });
});
