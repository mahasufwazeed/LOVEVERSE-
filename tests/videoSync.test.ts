describe('Video Co-Watching & Playback Sync Engine', () => {
  const DRIFT_TOLERANCE_SECONDS = 0.75;

  function calculateSyncAdjustment(currentLocalTime: number, remoteTime: number, isPlaying: boolean, latencyMs: number) {
    const latencySec = latencyMs / 1000;
    const expectedTarget = isPlaying ? remoteTime + latencySec : remoteTime;
    const drift = Math.abs(currentLocalTime - expectedTarget);

    return {
      needsSeek: drift > DRIFT_TOLERANCE_SECONDS,
      expectedTarget,
      drift,
    };
  }

  function isValidVideoUrl(url: string) {
    return /^https:\/\/.+\.mp4(\?.*)?$/i.test(url.trim());
  }

  it('ignores seeking for small playback drift under tolerance threshold', () => {
    // 0.3s drift while playing
    const res = calculateSyncAdjustment(10.2, 10.0, true, 100); // expected 10.1, drift 0.1s
    expect(res.needsSeek).toBe(false);
  });

  it('triggers seek adjustment when drift exceeds 750ms threshold', () => {
    // Local player is at 10.0s, remote player is at 12.5s with 200ms latency
    const res = calculateSyncAdjustment(10.0, 12.5, true, 200); // expected 12.7, drift 2.7s
    expect(res.needsSeek).toBe(true);
    expect(res.expectedTarget).toBeCloseTo(12.7, 1);
  });

  it('validates authorized direct HTTPS MP4 URLs', () => {
    expect(isValidVideoUrl('https://example.com/movie.mp4')).toBe(true);
    expect(isValidVideoUrl('https://cdn.loveverse.com/clips/sample.mp4?token=123')).toBe(true);
    expect(isValidVideoUrl('http://insecure.com/movie.mp4')).toBe(false); // Insecure HTTP
    expect(isValidVideoUrl('https://youtube.com/watch?v=12345')).toBe(false); // Non-MP4 watch page
  });
});
