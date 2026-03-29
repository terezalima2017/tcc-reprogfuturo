const pontuacaoService = {
  calcular(atividade, respostas) {
    switch (atividade.tipo) {
      case 'lixo_misterioso':
        return this.calcularLixoMisterioso(atividade, respostas);
      case 'caca_palavras':
        return this.calcularCacaPalavras(atividade, respostas);
      case 'verdadeiro_falso':
        return this.calcularVerdadeiroFalso(atividade, respostas);
      case 'multipla_escolha':
        return this.calcularMultiplaEscolha(atividade, respostas);
      case 'desafio_diario':
        return 0; // Avaliado manualmente pelo professor
      default:
        return 0;
    }
  },

  calcularLixoMisterioso(atividade, respostas) {
    const itens = atividade.itensLixo || [];
    if (itens.length === 0) return 0;
    let acertos = 0;
    for (const item of itens) {
      const respAluno = respostas[String(item.id)];
      if (respAluno && respAluno.toLowerCase() === item.lixeiraCorreta.toLowerCase()) {
        acertos++;
      }
    }
    return Math.round((acertos / itens.length) * 100);
  },

  calcularCacaPalavras(atividade, respostas) {
    const palavras = atividade.palavras || [];
    if (palavras.length === 0) return 0;
    const encontradas = respostas.encontradas || [];
    const acertos = Math.min(encontradas.length, palavras.length);
    return Math.round((acertos / palavras.length) * 100);
  },

  calcularVerdadeiroFalso(atividade, respostas) {
    const afirmacoes = atividade.afirmacoes || [];
    if (afirmacoes.length === 0) return 0;
    let acertos = 0;
    for (const af of afirmacoes) {
      const respAluno = respostas[String(af.id)];
      const correto = af.resposta === true || af.resposta === 'true';
      const alunoResp = respAluno === true || respAluno === 'true';
      if (correto === alunoResp) acertos++;
    }
    return Math.round((acertos / afirmacoes.length) * 100);
  },

  calcularMultiplaEscolha(atividade, respostas) {
    const questoes = atividade.questoes || [];
    if (questoes.length === 0) return 0;
    let acertos = 0;
    for (const q of questoes) {
      const respAluno = respostas[String(q.id)];
      if (respAluno && respAluno.toUpperCase() === q.respostaCorreta.toUpperCase()) {
        acertos++;
      }
    }
    return Math.round((acertos / questoes.length) * 100);
  },

  getFeedback(pontuacao) {
    if (pontuacao <= 40) {
      return {
        emoji: '😢', classe: 'feedback-fraco',
        mensagem: 'O planeta precisa mais da sua ajuda!',
        cor: '#e74c3c'
      };
    }
    if (pontuacao <= 60) {
      return {
        emoji: '😐', classe: 'feedback-medio',
        mensagem: 'Você está começando a cuidar da natureza.',
        cor: '#f39c12'
      };
    }
    if (pontuacao <= 80) {
      return {
        emoji: '😊', classe: 'feedback-bom',
        mensagem: 'Muito bom! Suas ações já fazem diferença.',
        cor: '#27ae60'
      };
    }
    return {
      emoji: '🤩', classe: 'feedback-excelente',
      mensagem: 'Excelente! Você está salvando o planeta com conhecimento!',
      cor: '#2ecc71'
    };
  }
};

module.exports = pontuacaoService;
