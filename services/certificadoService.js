const PDFDocument = require('pdfkit');
const { AtividadeTurma, RespostaAtividade, Certificado, Usuario, Turma } = require('../models');
const path = require('path');
const fs = require('fs');

const certificadoService = {
  async verificarEGerarCertificado(alunoId, turmaId) {
    try {
      const totalAtividades = await AtividadeTurma.count({ where: { turmaId } });
      if (totalAtividades === 0) return null;

      const respostas = await RespostaAtividade.findAll({
        where: { alunoId, turmaId, finalizada: true }
      });

      if (respostas.length < totalAtividades) return null;

      const media = respostas.reduce((s, r) => s + r.pontuacao, 0) / respostas.length;

      if (media < 70) return null;

      // Verificar se já existe certificado
      const existente = await Certificado.findOne({ where: { alunoId, turmaId } });
      if (existente) return existente;

      const certificado = await Certificado.create({
        alunoId, turmaId,
        pontuacaoMedia: Math.round(media * 10) / 10,
        arquivoUrl: `/certificados/cert-${alunoId}-${turmaId}.pdf`,
        geradoEm: new Date()
      });

      return certificado;
    } catch (error) {
      console.error('Erro ao verificar certificado:', error);
      return null;
    }
  },

  async gerarPDF(certificado) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 60, right: 60 }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const w = doc.page.width;
      const h = doc.page.height;

      // Fundo
      doc.rect(0, 0, w, h).fill('#f0faf0');

      // Bordas decorativas
      doc.rect(20, 20, w - 40, h - 40).lineWidth(3).stroke('#2D6A4F');
      doc.rect(30, 30, w - 60, h - 60).lineWidth(1).stroke('#52B788');

      // Título
      doc.fontSize(32).fillColor('#1B4332').font('Helvetica-Bold')
        .text('Certificado de Bom Desempenho Ambiental', 60, 70, { align: 'center' });

      // Ícone texto
      doc.fontSize(40).text('🌿', 0, 120, { align: 'center' });

      // Corpo
      doc.fontSize(16).fillColor('#333').font('Helvetica')
        .text('Certificamos que', 60, 180, { align: 'center' });

      const nomeAluno = certificado.aluno ? certificado.aluno.nome : 'Aluno';
      doc.fontSize(28).fillColor('#2D6A4F').font('Helvetica-Bold')
        .text(nomeAluno, 60, 210, { align: 'center' });

      doc.fontSize(16).fillColor('#333').font('Helvetica')
        .text('concluiu com sucesso todas as atividades ambientais', 60, 260, { align: 'center' });

      const nomeTurma = certificado.turma ? certificado.turma.nome : 'Turma';
      doc.text(`da turma "${nomeTurma}"`, 60, 285, { align: 'center' });

      doc.fontSize(14).text(
        `obtendo a pontuação média de ${certificado.pontuacaoMedia} pontos,`,
        60, 320, { align: 'center' }
      );
      doc.text('demonstrando excelente conhecimento e compromisso com o meio ambiente.', 60, 340, { align: 'center' });

      // Data
      const data = new Date(certificado.geradoEm).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      doc.fontSize(12).fillColor('#666').text(data, 60, 400, { align: 'center' });

      // Linha de assinatura
      doc.moveTo(w / 2 - 120, 450).lineTo(w / 2 + 120, 450).lineWidth(1).stroke('#999');
      const nomeProfessor = (certificado.turma && certificado.turma.professor)
        ? certificado.turma.professor.nome : 'Professor(a)';
      doc.fontSize(12).fillColor('#333').text(nomeProfessor, 60, 458, { align: 'center' });
      doc.fontSize(10).fillColor('#666').text('Professor(a) Responsável', 60, 475, { align: 'center' });

      // Rodapé
      doc.fontSize(9).fillColor('#999')
        .text('ReProgFuturo - Plataforma de Educação Ambiental', 60, h - 60, { align: 'center' });

      doc.end();
    });
  }
};

module.exports = certificadoService;
