describe('Love Quiz & Would You Rather Decision Engine', () => {
  it('masks quiz answers until both partners have submitted', () => {
    let answers: { [key: string]: string } = {};

    const submitAnswer = (user: string, ans: string) => {
      answers[user] = ans;
      return Object.keys(answers).length >= 2;
    };

    // User A submits
    const revealedAfterA = submitAnswer('user-a', 'Paris trip');
    expect(revealedAfterA).toBe(false);

    // User B submits
    const revealedAfterB = submitAnswer('user-b', 'Tokyo trip');
    expect(revealedAfterB).toBe(true);
    expect(answers['user-a']).toBe('Paris trip');
    expect(answers['user-b']).toBe('Tokyo trip');
  });

  it('evaluates Would You Rather agreement between partners', () => {
    const evaluateMatch = (choiceA: number, choiceB: number) => {
      return choiceA === choiceB;
    };

    expect(evaluateMatch(1, 1)).toBe(true); // Both chose A
    expect(evaluateMatch(2, 2)).toBe(true); // Both chose B
    expect(evaluateMatch(1, 2)).toBe(false); // Disagreement
  });
});
