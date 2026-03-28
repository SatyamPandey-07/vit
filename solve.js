const grid = [
  [9, 0, 0, 7, 0, 0, 0, 0, 5],
  [0, 0, 5, 0, 9, 7, 0, 0, 0],
  [0, 0, 7, 2, 5, 6, 0, 0, 0],
  [6, 0, 0, 1, 0, 4, 0, 0, 0],
  [0, 0, 0, 0, 9, 1, 0, 0, 0],
  [2, 9, 0, 0, 6, 4, 0, 0, 0],
  [0, 8, 0, 4, 0, 7, 0, 1, 0],
  [0, 0, 4, 0, 0, 0, 0, 8, 0],
  [1, 7, 0, 6, 0, 0, 0, 5, 4]
];

function isValid(board, row, col, k) {
  for (let i = 0; i < 9; i++) {
    const m = 3 * Math.floor(row / 3) + Math.floor(i / 3);
    const n = 3 * Math.floor(col / 3) + i % 3;
    if (board[row][i] == k || board[i][col] == k || board[m][n] == k) {
      return false;
    }
  }
  return true;
}

function solve(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == 0) {
        for (let k = 1; k <= 9; k++) {
          if (isValid(board, i, j, k)) {
            board[i][j] = k;
            if (solve(board)) {
              return true;
            } else {
              board[i][j] = 0;
            }
          }
        }
        return false;
      }
    }
  }
  return true;
}

solve(grid);
console.log(JSON.stringify(grid));
