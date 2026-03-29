const cacaPalavrasService = {
  gerarGrade(palavras, tamanho = 15) {
    const grid = Array.from({ length: tamanho }, () =>
      Array.from({ length: tamanho }, () => '')
    );
    const direcoes = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal para baixo-direita
      [0, -1],  // horizontal reverso
      [-1, 0],  // vertical reverso
      [-1, -1], // diagonal para cima-esquerda
      [1, -1],  // diagonal para baixo-esquerda
      [-1, 1]   // diagonal para cima-direita
    ];

    const palavrasOrdenadas = [...palavras].sort((a, b) => b.length - a.length);

    for (const palavra of palavrasOrdenadas) {
      let colocada = false;
      let tentativas = 0;
      const maxTentativas = 100;

      while (!colocada && tentativas < maxTentativas) {
        tentativas++;
        const dir = direcoes[Math.floor(Math.random() * direcoes.length)];
        const [dr, dc] = dir;

        const maxRow = tamanho - 1 - (dr > 0 ? (palavra.length - 1) * dr : 0);
        const minRow = dr < 0 ? (palavra.length - 1) * Math.abs(dr) : 0;
        const maxCol = tamanho - 1 - (dc > 0 ? (palavra.length - 1) * dc : 0);
        const minCol = dc < 0 ? (palavra.length - 1) * Math.abs(dc) : 0;

        if (minRow > maxRow || minCol > maxCol) continue;

        const startRow = Math.floor(Math.random() * (maxRow - minRow + 1)) + minRow;
        const startCol = Math.floor(Math.random() * (maxCol - minCol + 1)) + minCol;

        let podeColocar = true;
        for (let i = 0; i < palavra.length; i++) {
          const r = startRow + i * dr;
          const c = startCol + i * dc;
          if (r < 0 || r >= tamanho || c < 0 || c >= tamanho) {
            podeColocar = false;
            break;
          }
          if (grid[r][c] !== '' && grid[r][c] !== palavra[i]) {
            podeColocar = false;
            break;
          }
        }

        if (podeColocar) {
          for (let i = 0; i < palavra.length; i++) {
            const r = startRow + i * dr;
            const c = startCol + i * dc;
            grid[r][c] = palavra[i];
          }
          colocada = true;
        }
      }
    }

    // Preencher espaços vazios com letras aleatórias
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < tamanho; r++) {
      for (let c = 0; c < tamanho; c++) {
        if (grid[r][c] === '') {
          grid[r][c] = letras[Math.floor(Math.random() * letras.length)];
        }
      }
    }

    return grid;
  }
};

module.exports = cacaPalavrasService;
