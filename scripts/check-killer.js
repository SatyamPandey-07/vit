const E = null;

const grid = [
  [E, E, E, 4, 1, E, E, 7, E],
  [5, 8, 1, E, 6, E, 4, E, E],
  [E, E, E, E, E, 8, 5, E, E],
  [1, E, 5, E, E, 2, E, 8, E],
  [E, E, E, E, E, E, E, E, 7],
  [E, 2, E, E, E, E, 6, E, 3],
  [6, 9, E, E, E, 7, 8, E, E],
  [8, E, E, E, E, E, 7, E, E],
  [E, E, E, E, E, E, E, E, E],
];

const cages = [
  { cells: [[0, 0], [1, 0]], sum: 7 },
  { cells: [[0, 1], [1, 1]], sum: 14 },
  { cells: [[0, 2], [0, 3]], sum: 13 },
  { cells: [[0, 4], [0, 5], [1, 4], [1, 5]], sum: 23 },
  { cells: [[0, 6], [0, 7], [1, 6]], sum: 14 },
  { cells: [[0, 8], [1, 8]], sum: 17 },
  { cells: [[1, 2], [1, 3], [2, 3]], sum: 17 },
  { cells: [[1, 7]], sum: 2 },
  { cells: [[2, 0], [2, 1]], sum: 11 },
  { cells: [[2, 2]], sum: 3 },
  { cells: [[2, 4]], sum: 2 },
  { cells: [[2, 5], [3, 5]], sum: 8 },
  { cells: [[2, 6], [2, 7]], sum: 15 },
  { cells: [[2, 8], [3, 8]], sum: 17 },
  { cells: [[3, 0], [3, 1]], sum: 4 },
  { cells: [[3, 2], [4, 2], [5, 2], [5, 1]], sum: 21 },
  { cells: [[3, 3], [4, 3]], sum: 14 },
  { cells: [[3, 4], [3, 5]], sum: 9 },
  { cells: [[3, 6], [3, 7], [4, 6], [5, 6]], sum: 25 },
  { cells: [[4, 0], [4, 1]], sum: 13 },
  { cells: [[4, 4], [4, 5]], sum: 4 },
  { cells: [[4, 7], [4, 8]], sum: 7 },
  { cells: [[5, 0], [6, 0], [6, 1]], sum: 22 },
  { cells: [[5, 3], [5, 4], [5, 5]], sum: 18 },
  { cells: [[5, 7], [6, 7]], sum: 4 },
  { cells: [[5, 8]], sum: 3 },
  { cells: [[6, 2], [6, 3], [6, 4]], sum: 10 },
  { cells: [[6, 5], [6, 6], [7, 5]], sum: 21 },
  { cells: [[6, 8], [7, 8]], sum: 5 },
  { cells: [[7, 0], [7, 1]], sum: 9 },
  { cells: [[7, 2], [8, 2]], sum: 9 },
  { cells: [[7, 3], [7, 4], [8, 4], [8, 5]], sum: 24 },
  { cells: [[7, 6], [8, 6]], sum: 8 },
  { cells: [[7, 7], [7, 8]], sum: 9 },
  { cells: [[8, 0], [8, 1]], sum: 8 },
  { cells: [[8, 3]], sum: 2 },
  { cells: [[8, 7], [8, 8]], sum: 15 },
];

function getCellValue([r, c]) {
  return grid[r][c];
}

cages.forEach(({ cells, sum }, idx) => {
  const givens = cells
    .map(getCellValue)
    .filter(v => v != null);
  const sumGiven = givens.reduce((a, b) => a + b, 0);
  const unknownCount = cells.length - givens.length;
  const remainingMin = unknownCount * 1;
  const remainingMax = unknownCount * 9;
  const remainingSum = sum - sumGiven;
  const ok = remainingSum >= remainingMin && remainingSum <= remainingMax;
  if (!ok || sumGiven > sum) {
    console.log(`Cage ${idx + 1} invalid: sum ${sum}, givens ${givens.join(",")}, remaining sum ${remainingSum}, cells ${JSON.stringify(cells)}`);
  }
});
