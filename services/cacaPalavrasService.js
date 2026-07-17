const cacaPalavrasService = {
  /**
   * Calcula o tamanho ideal da grade com base nas palavras cadastradas.
   * Mínimo de 8 e máximo de 12, garantindo que a maior palavra caiba
   * e que haja margem para letras aleatórias ao redor.
   */
  calcularTamanhoGrade(palavras) {
    const maiorPalavra = Math.max(...palavras.map(p => p.length));
    // Margem de 2 letras além da maior palavra, limitado entre 8 e 12
    const tamanhoIdeal = maiorPalavra + 2;
    return Math.max(8, Math.min(12, tamanhoIdeal));
  },

  gerarGrade(palavras, tamanho) {
    // Usar o tamanho calculado dinamicamente, ignorando o parâmetro fixo antigo
    const tamGrade = this.calcularTamanhoGrade(palavras);

    const grid = Array.from({ length: tamGrade }, () =>
      Array.from({ length: tamGrade }, () => '')
    );

    // Apenas 3 direções simples — mais adequado para crianças
    const direcoes = [
      [0, 1],   // horizontal (esquerda → direita)
      [1, 0],   // vertical (cima → baixo)
      [1, 1],   // diagonal (cima-esquerda → baixo-direita)
    ];

    const palavrasOrdenadas = [...palavras].sort((a, b) => b.length - a.length);

    for (const palavra of palavrasOrdenadas) {
      let colocada = false;
      let tentativas = 0;
      const maxTentativas = 200;

      while (!colocada && tentativas < maxTentativas) {
        tentativas++;
        const dir = direcoes[Math.floor(Math.random() * direcoes.length)];
        const [dr, dc] = dir;

        const maxRow = tamGrade - 1 - (dr > 0 ? (palavra.length - 1) * dr : 0);
        const minRow = dr < 0 ? (palavra.length - 1) * Math.abs(dr) : 0;
        const maxCol = tamGrade - 1 - (dc > 0 ? (palavra.length - 1) * dc : 0);
        const minCol = dc < 0 ? (palavra.length - 1) * Math.abs(dc) : 0;

        if (minRow > maxRow || minCol > maxCol) continue;

        const startRow = Math.floor(Math.random() * (maxRow - minRow + 1)) + minRow;
        const startCol = Math.floor(Math.random() * (maxCol - minCol + 1)) + minCol;

        let podeColocar = true;
        for (let i = 0; i < palavra.length; i++) {
          const r = startRow + i * dr;
          const c = startCol + i * dc;
          if (r < 0 || r >= tamGrade || c < 0 || c >= tamGrade) {
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
    for (let r = 0; r < tamGrade; r++) {
      for (let c = 0; c < tamGrade; c++) {
        if (grid[r][c] === '') {
          grid[r][c] = letras[Math.floor(Math.random() * letras.length)];
        }
      }
    }

    return grid;
  }
};

module.exports = cacaPalavrasService;
