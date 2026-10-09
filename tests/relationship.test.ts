describe('Relationship Math & Anniversary Counter', () => {
  function calculateDaysTogether(anniversaryDateStr: string, currentTimestampMs: number): number {
    const startMs = new Date(anniversaryDateStr).getTime();
    if (isNaN(startMs)) return 0;
    const diffMs = Math.max(0, currentTimestampMs - startMs);
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  it('calculates days elapsed accurately across standard and leap years', () => {
    // Exactly 10 days later
    const start = '2026-01-01T00:00:00Z';
    const now = new Date('2026-01-11T00:00:00Z').getTime();
    expect(calculateDaysTogether(start, now)).toBe(10);
  });

  it('handles same day (0 days elapsed)', () => {
    const start = '2026-10-09T00:00:00Z';
    const now = new Date('2026-10-09T18:00:00Z').getTime();
    expect(calculateDaysTogether(start, now)).toBe(0);
  });

  it('returns 0 for future or invalid anniversary dates gracefully', () => {
    const future = '2030-01-01T00:00:00Z';
    const now = new Date('2026-10-09T00:00:00Z').getTime();
    expect(calculateDaysTogether(future, now)).toBe(0);
    expect(calculateDaysTogether('invalid-date', now)).toBe(0);
  });
});
