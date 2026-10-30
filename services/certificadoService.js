const PDFDocument = require('pdfkit');
const { AtividadeTurma, RespostaAtividade, Certificado, Usuario, Turma } = require('../models');

const certificadoService = {
  async liberarCertificado(alunoId, turmaId) {
    try {
      const respostas = await RespostaAtividade.findAll({
        where: { alunoId, turmaId, finalizada: true }
      });

      const media = respostas.length > 0
        ? respostas.reduce((s, r) => s + r.pontuacao, 0) / respostas.length
        : 100;
      const pontuacaoMedia = Math.round(media * 10) / 10;

      const existente = await Certificado.findOne({ where: { alunoId, turmaId } });
      if (existente) {
        await existente.update({
          pontuacaoMedia,
          geradoEm: new Date()
        });
        return existente;
      }

      const certificado = await Certificado.create({
        alunoId,
        turmaId,
        pontuacaoMedia,
        arquivoUrl: `/certificados/cert-${alunoId}-${turmaId}.pdf`,
        geradoEm: new Date()
      });

      return certificado;
    } catch (error) {
      console.error('Erro ao liberar certificado:', error);
      return null;
    }
  },

  async verificarEGerarCertificado(alunoId, turmaId) {
    try {
      const totalAtividades = await AtividadeTurma.count({ where: { turmaId } });
      if (totalAtividades === 0) return null;

      const respostas = await RespostaAtividade.findAll({
        where: { alunoId, turmaId, finalizada: true }
      });

      // Se já foi liberado pelo professor, apenas atualiza a data e pontuação se houver novas atividades
      const existente = await Certificado.findOne({ where: { alunoId, turmaId } });
      if (existente && respostas.length > 0) {
        const media = respostas.reduce((s, r) => s + r.pontuacao, 0) / respostas.length;
        await existente.update({
          pontuacaoMedia: Math.round(media * 10) / 10,
          geradoEm: new Date()
        });
        return existente;
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar certificado:', error);
      return null;
    }
  },

  async gerarPDF(certificado) {
    return new Promise((resolve, reject) => {
      // A4 horizontal: 841.89 x 595.28 pontos
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const w = doc.page.width;   // 841.89
      const h = doc.page.height;  // 595.28

      // ===== FUNDO =====
      doc.rect(0, 0, w, h).fill('#FAFDF6');

      // ===== BORDA EXTERNA (3pt) =====
      const margBordaExt = 18;
      doc.rect(margBordaExt, margBordaExt, w - margBordaExt * 2, h - margBordaExt * 2)
        .lineWidth(2.5)
        .stroke('#2D6A4F');

      // ===== BORDA INTERNA (1pt) =====
      const margBordaInt = 28;
      doc.rect(margBordaInt, margBordaInt, w - margBordaInt * 2, h - margBordaInt * 2)
        .lineWidth(0.8)
        .stroke('#52B788');

      // ===== FOLHA SVG simplificada como formas geométricas =====
      const leafX = 55, leafY = 52;
      // Corpo da folha
      doc.save();
      doc.translate(leafX, leafY);
      doc.ellipse(0, 0, 14, 22).fillOpacity(0.12).fill('#2D6A4F');
      doc.fillOpacity(1);
      // Nervura central
      doc.moveTo(0, -22).lineTo(0, 22).lineWidth(1).stroke('#52B788');
      // Nervuras laterais
      doc.moveTo(0, -8).lineTo(-10, -2).lineWidth(0.7).stroke('#52B788');
      doc.moveTo(0, -8).lineTo(10, -2).lineWidth(0.7).stroke('#40916C');
      doc.moveTo(0, 2).lineTo(-10, 8).lineWidth(0.7).stroke('#52B788');
      doc.moveTo(0, 2).lineTo(10, 8).lineWidth(0.7).stroke('#40916C');
      doc.restore();

      // ===== CABEÇALHO: MARCA =====
      const headerY = 48;
      doc.fontSize(11).fillColor('#1B4332').font('Helvetica-Bold')
        .text('REPROGFUTURO', 80, headerY, { align: 'left', width: 200, characterSpacing: 1.5 });
      doc.fontSize(7).fillColor('#40916C').font('Helvetica')
        .text('PLATAFORMA DE EDUCAÇÃO AMBIENTAL', 80, headerY + 14, { align: 'left', width: 200, characterSpacing: 0.8 });

      // ===== CABEÇALHO: ESCOLA (à direita) =====
      const nomeEscola = (certificado.turma && certificado.turma.escola)
        ? certificado.turma.escola.toUpperCase()
        : '';
      if (nomeEscola) {
        // Linha vertical decorativa
        doc.moveTo(w - margBordaInt - 220, headerY - 2)
          .lineTo(w - margBordaInt - 220, headerY + 28)
          .lineWidth(1.5).stroke('#52B788');

        doc.fontSize(7).fillColor('#2D6A4F').font('Helvetica-Bold')
          .text(nomeEscola, w - margBordaInt - 210, headerY, {
            align: 'right',
            width: 195,
            characterSpacing: 0.5,
            lineGap: 2
          });
      }

      // ===== LINHA ORNAMENTAL SUPERIOR =====
      const ornY = 90;
      doc.moveTo(margBordaInt + 10, ornY).lineTo(w - margBordaInt - 10, ornY)
        .lineWidth(0.6).stroke('#2D6A4F');
      doc.fontSize(10).fillColor('#2D6A4F').font('Helvetica')
        .text('❧', w / 2 - 8, ornY - 7);

      // ===== TÍTULO PRINCIPAL =====
      doc.fontSize(26).fillColor('#1B4332').font('Helvetica-Bold')
        .text('Certificado de Aprendizado Ambiental', 40, 108, {
          align: 'center',
          width: w - 80,
          characterSpacing: 0.5
        });

      // ===== CORPO =====
      const corpoY = 150;
      doc.fontSize(9).fillColor('#666').font('Helvetica')
        .text('C E R T I F I C A M O S  Q U E', 40, corpoY, {
          align: 'center',
          width: w - 80,
          characterSpacing: 2
        });

      // Nome do aluno
      const nomeAluno = certificado.aluno ? certificado.aluno.nome : 'Aluno';
      doc.fontSize(30).fillColor('#2D6A4F').font('Helvetica-Bold')
        .text(nomeAluno, 40, corpoY + 18, {
          align: 'center',
          width: w - 80,
          characterSpacing: 0.3
        });

      // Sublinhado gradiente simulado com linha
      const nomeWidth = Math.min(doc.widthOfString(nomeAluno, { fontSize: 30 }) + 60, w - 200);
      const nomeLineX = (w - nomeWidth) / 2;
      doc.moveTo(nomeLineX, corpoY + 52)
        .lineTo(nomeLineX + nomeWidth, corpoY + 52)
        .lineWidth(1.5).stroke('#0077B6');

      // Parágrafo descritivo
      const nomeTurma = certificado.turma ? certificado.turma.nome : 'Turma';
      const escolaTexto = (certificado.turma && certificado.turma.escola) ? certificado.turma.escola : 'instituição de ensino';

      doc.fontSize(10).fillColor('#333').font('Helvetica')
        .text(
          `estudante da ${escolaTexto}, turma "${nomeTurma}", concluiu as atividades educativas da plataforma ReProgFuturo,\ndemonstrando aprendizado sobre educação ambiental, sustentabilidade, preservação do meio ambiente e cidadania.`,
          80, corpoY + 62,
          { align: 'center', width: w - 160, lineGap: 3 }
        );

      // ===== LINHA ORNAMENTAL INFERIOR =====
      const ornY2 = corpoY + 110;
      doc.moveTo(margBordaInt + 10, ornY2).lineTo(w - margBordaInt - 10, ornY2)
        .lineWidth(0.6).stroke('#2D6A4F');
      doc.fontSize(10).fillColor('#2D6A4F').font('Helvetica')
        .text('❧', w / 2 - 8, ornY2 - 7);

      // ===== RODAPÉ =====
      const rodapeY = ornY2 + 14;

      // Data (esquerda)
      const data = new Date(certificado.geradoEm).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      doc.fontSize(7).fillColor('#888').font('Helvetica')
        .text('DATA DE EMISSÃO', margBordaInt + 14, rodapeY, { characterSpacing: 0.8 });
      doc.fontSize(9).fillColor('#1B4332').font('Helvetica-Bold')
        .text(data, margBordaInt + 14, rodapeY + 10);

      // Selo central (círculos)
      const seloX = w / 2;
      const seloY = rodapeY + 22;
      doc.circle(seloX, seloY, 30).lineWidth(1.2).stroke('#2D6A4F');
      doc.circle(seloX, seloY, 24).lineWidth(0.5).dash(3, { space: 2.5 }).stroke('#52B788');
      doc.undash();
      doc.fontSize(5.5).fillColor('#2D6A4F').font('Helvetica-Bold')
        .text('REPROG', seloX - 18, seloY - 9)
        .text('FUTURO', seloX - 13, seloY - 2)
        .text('✦ 2026 ✦', seloX - 14, seloY + 5);

      // Assinatura do professor (direita)
      const nomeProfessor = (certificado.turma && certificado.turma.professor)
        ? certificado.turma.professor.nome : 'Professor(a)';
      const assinaturaX = w - margBordaInt - 200;
      doc.moveTo(assinaturaX, rodapeY + 22)
        .lineTo(assinaturaX + 160, rodapeY + 22)
        .lineWidth(0.8).stroke('#2D6A4F');
      doc.fontSize(9).fillColor('#1B4332').font('Helvetica-Bold')
        .text(nomeProfessor, assinaturaX, rodapeY + 25, { width: 160, align: 'center' });
      doc.fontSize(7).fillColor('#888').font('Helvetica')
        .text('PROFESSOR(A) RESPONSÁVEL', assinaturaX, rodapeY + 36, {
          width: 160, align: 'center', characterSpacing: 0.6
        });

      // ===== RODAPÉ FINAL =====
      doc.fontSize(7).fillColor('#AAA').font('Helvetica')
        .text('ReProgFuturo — Plataforma de Educação Ambiental | Documento emitido eletronicamente',
          40, h - 32, { align: 'center', width: w - 80 });

      doc.end();
    });
  }
};

module.exports = certificadoService;
