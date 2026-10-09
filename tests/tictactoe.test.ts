describe('Tic-Tac-Toe Multiplayer Game Engine', () => {
  function checkWinner(board: (string | null)[]): string | null {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every((c) => c !== null)) {
      return 'draw';
    }
    return null;
  }

  function makeMove(board: (string | null)[], turn: 'X' | 'O', index: number) {
    if (board[index] !== null) {
      throw new Error('Cell already occupied');
    }
    const nextBoard = [...board];
    nextBoard[index] = turn;
    const winner = checkWinner(nextBoard);
    const nextTurn: 'X' | 'O' = turn === 'X' ? 'O' : 'X';
    return { board: nextBoard, turn: nextTurn, winner };
  }

  it('correctly tracks turns and state transitions', () => {
    let state = {
      board: Array(9).fill(null) as (string | null)[],
      turn: 'X' as 'X' | 'O',
      winner: null as string | null,
    };

    const move1 = makeMove(state.board, state.turn, 0);
    expect(move1.board[0]).toBe('X');
    expect(move1.turn).toBe('O');
    expect(move1.winner).toBeNull();

    const move2 = makeMove(move1.board, move1.turn, 1);
    expect(move2.board[1]).toBe('O');
    expect(move2.turn).toBe('X');
    expect(move2.winner).toBeNull();
  });

  it('rejects moves on already occupied cells', () => {
    const board: (string | null)[] = ['X', null, null, null, null, null, null, null, null];
    expect(() => makeMove(board, 'O', 0)).toThrow('Cell already occupied');
  });

  it('detects row, column, and diagonal wins', () => {
    // Row win
    expect(checkWinner(['X', 'X', 'X', null, null, null, null, null, null])).toBe('X');
    // Column win
    expect(checkWinner(['O', null, null, 'O', null, null, 'O', null, null])).toBe('O');
    // Diagonal win
    expect(checkWinner(['X', null, null, null, 'X', null, null, null, 'X'])).toBe('X');
  });

  it('detects a draw condition', () => {
    const drawBoard: (string | null)[] = [
      'X', 'O', 'X',
      'X', 'O', 'O',
      'O', 'X', 'X',
    ];
    expect(checkWinner(drawBoard)).toBe('draw');
  });
});
