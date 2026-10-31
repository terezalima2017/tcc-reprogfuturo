const PDFDocument = require('pdfkit');
const { AtividadeTurma, RespostaAtividade, Certificado, Usuario, Turma } = require('../models');

const certificadoService = {
  async liberarCertificado(alunoId, turmaId) {
    try {
      const turma = await Turma.findByPk(turmaId);
      if (!turma || !turma.escola || turma.escola.trim().length < 3) {
        throw new Error('O nome da escola é obrigatório para liberar o certificado.');
      }

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
      throw error;
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
      // Validação obrigatória da escola
      const nomeEscola = (certificado.turma && certificado.turma.escola)
        ? certificado.turma.escola.trim()
        : '';

      if (!nomeEscola || nomeEscola.length < 3) {
        return reject(new Error('O nome da escola é obrigatório para a emissão do certificado.'));
      }

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

      // ===== 1. FUNDO CREME SUAVE =====
      doc.rect(0, 0, w, h).fill('#FAF8F2');

      // ===== 2. MOLDURA DUPLA VERDE FLORESTA =====
      // Borda Externa (2.5pt)
      const mExt = 18;
      doc.rect(mExt, mExt, w - mExt * 2, h - mExt * 2)
        .lineWidth(2.5)
        .stroke('#1B4332');

      // Borda Interna (1pt)
      const mInt = 26;
      doc.rect(mInt, mInt, w - mInt * 2, h - mInt * 2)
        .lineWidth(1)
        .stroke('#2D6A4F');

      // ===== 3. DECORAÇÕES DE CANTO (Circuitos + Folhas) =====
      const drawCorner = (cx, cy, dirX, dirY) => {
        doc.save();

        // Linhas de circuito
        doc.lineWidth(1.4).strokeColor('#2D6A4F').lineCap('round').lineJoin('round');

        // Trilha 1
        doc.moveTo(cx + dirX * 10, cy + dirY * 95)
          .lineTo(cx + dirX * 10, cy + dirY * 42)
          .lineTo(cx + dirX * 45, cy + dirY * 42)
          .lineTo(cx + dirX * 45, cy + dirY * 18)
          .lineTo(cx + dirX * 80, cy + dirY * 18)
          .stroke();

        // Trilha 2
        doc.moveTo(cx + dirX * 24, cy + dirY * 125)
          .lineTo(cx + dirX * 24, cy + dirY * 65)
          .lineTo(cx + dirX * 68, cy + dirY * 65)
          .lineTo(cx + dirX * 68, cy + dirY * 30)
          .lineTo(cx + dirX * 110, cy + dirY * 30)
          .stroke();

        // Nós circulares
        const nodes = [
          [cx + dirX * 80, cy + dirY * 18, 3.2],
          [cx + dirX * 110, cy + dirY * 30, 3.2],
          [cx + dirX * 10, cy + dirY * 95, 2.8],
          [cx + dirX * 24, cy + dirY * 125, 2.8]
        ];

        nodes.forEach(([nx, ny, r]) => {
          doc.circle(nx, ny, r).fillAndStroke('#FAF8F2', '#2D6A4F');
        });

        // Folhas estilizadas nos cantos
        // Folha 1 (lateral)
        doc.save();
        doc.translate(cx + dirX * 22, cy + dirY * 22);
        doc.rotate(dirX * dirY > 0 ? 35 : -35);
        doc.ellipse(0, 0, 10, 22).fillOpacity(0.85).fillAndStroke('#2D6A4F', '#1B4332');
        doc.moveTo(0, -22).lineTo(0, 22).lineWidth(1).stroke('#52B788');
        doc.restore();

        // Folha 2 (central grande)
        doc.save();
        doc.translate(cx + dirX * 44, cy + dirY * 44);
        doc.rotate(dirX * dirY > 0 ? 45 : -45);
        doc.ellipse(0, 0, 13, 26).fillOpacity(0.9).fillAndStroke('#40916C', '#1B4332');
        doc.moveTo(0, -26).lineTo(0, 26).lineWidth(1).stroke('#74C69D');
        doc.restore();

        // Folha 3 (oposta)
        doc.save();
        doc.translate(cx + dirX * 30, cy + dirY * 62);
        doc.rotate(dirX * dirY > 0 ? 65 : -65);
        doc.ellipse(0, 0, 9, 20).fillOpacity(0.85).fillAndStroke('#52B788', '#1B4332');
        doc.moveTo(0, -20).lineTo(0, 20).lineWidth(0.8).stroke('#1B4332');
        doc.restore();

        doc.restore();
      };

      // Desenha nos 4 cantos
      drawCorner(mExt, mExt, 1, 1);           // Superior Esquerdo
      drawCorner(w - mExt, mExt, -1, 1);      // Superior Direito
      drawCorner(mExt, h - mExt, 1, -1);      // Inferior Esquerdo
      drawCorner(w - mExt, h - mExt, -1, -1); // Inferior Direito

      // ===== 4. LOGOTIPO REPROGFUTURO (Centralizado) =====
      const logoY = 56;
      const logoX = w / 2;

      // Círculo de reciclagem com setas
      doc.save();
      doc.translate(logoX, logoY);

      // 3 arcos de reciclagem
      doc.circle(0, 0, 18).lineWidth(2.5).stroke('#1B4332');

      // Duas folhas centrais
      doc.save();
      doc.ellipse(-3, 0, 4, 10).rotate(-15).fillOpacity(0.95).fill('#2D6A4F');
      doc.restore();
      doc.save();
      doc.ellipse(4, 0, 4, 9).rotate(20).fillOpacity(0.9).fill('#52B788');
      doc.restore();

      doc.restore();

      // Nome da Marca
      doc.fontSize(15).fillColor('#1B4332').font('Helvetica-Bold')
        .text('ReProgFuturo', 0, logoY + 24, { align: 'center', width: w, characterSpacing: 0.5 });

      // ===== 5. TÍTULO PRINCIPAL =====
      const titleY = 126;
      doc.fontSize(22).fillColor('#1B4332').font('Times-Bold')
        .text('CERTIFICADO DE', 0, titleY, {
          align: 'center',
          width: w,
          characterSpacing: 1.5
        });

      doc.fontSize(27).fillColor('#1B4332').font('Times-Bold')
        .text('CONCLUSÃO AMBIENTAL', 0, titleY + 26, {
          align: 'center',
          width: w,
          characterSpacing: 1.5
        });

      // ===== 6. DIVISOR DE FOLHAS =====
      const divY = titleY + 62;
      doc.save();
      doc.translate(w / 2, divY);
      doc.ellipse(-5, 0, 4, 7).rotate(-30).fill('#2D6A4F');
      doc.ellipse(5, 0, 4, 7).rotate(30).fill('#40916C');
      doc.restore();

      // ===== 7. SUBTÍTULO =====
      doc.fontSize(13).fillColor('#2D6A4F').font('Times-Italic')
        .text('Certificado de participação e aprendizagem', 0, divY + 12, {
          align: 'center',
          width: w
        });

      // ===== 8. FRASE DE INTRODUÇÃO =====
      const introY = divY + 44;
      doc.fontSize(13.5).fillColor('#2D4A3E').font('Times-Roman')
        .text('Certificamos que', 0, introY, {
          align: 'center',
          width: w
        });

      // ===== 9. NOME DO(A) ALUNO(A) =====
      const nomeAluno = (certificado.aluno && certificado.aluno.nome)
        ? certificado.aluno.nome.toUpperCase()
        : 'ALUNO(A)';

      doc.fontSize(26).fillColor('#1B4332').font('Times-Bold')
        .text(nomeAluno, 0, introY + 25, {
          align: 'center',
          width: w,
          characterSpacing: 0.8
        });

      // ===== 10. TEXTO PRINCIPAL COM TURMA E ESCOLA =====
      const nomeTurma = (certificado.turma && certificado.turma.nome)
        ? certificado.turma.nome
        : 'Turma';

      const textoPrincipal = `concluiu com sucesso as atividades ambientais da turma ${nomeTurma} da escola ${nomeEscola}, demonstrando dedicação, aprendizado e compromisso com o meio ambiente.`;

      const textWidth = 620;
      doc.fontSize(12).fillColor('#2E3A33').font('Times-Roman')
        .text(textoPrincipal, (w - textWidth) / 2, introY + 68, {
          align: 'center',
          width: textWidth,
          lineGap: 5
        });

      // ===== 11. DATA DE EMISSÃO =====
      const dataExtenso = new Date(certificado.geradoEm || Date.now()).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const footerY = 445;
      doc.fontSize(11.5).fillColor('#1B4332').font('Times-Roman')
        .text(dataExtenso, 0, footerY, {
          align: 'center',
          width: w
        });

      // ===== 12. LINHA DE ASSINATURA E PROFESSOR RESPONSÁVEL =====
      const sigLineY = footerY + 34;
      const sigLineWidth = 240;
      doc.moveTo((w - sigLineWidth) / 2, sigLineY)
        .lineTo((w + sigLineWidth) / 2, sigLineY)
        .lineWidth(1)
        .stroke('#2D6A4F');

      const nomeProfessor = (certificado.turma && certificado.turma.professor && certificado.turma.professor.nome)
        ? certificado.turma.professor.nome
        : '';

      if (nomeProfessor) {
        doc.fontSize(10).fillColor('#1B4332').font('Times-Bold')
          .text(nomeProfessor, 0, sigLineY + 6, {
            align: 'center',
            width: w
          });
        doc.fontSize(9.5).fillColor('#40916C').font('Times-Roman')
          .text('Professor(a) responsável', 0, sigLineY + 20, {
            align: 'center',
            width: w
          });
      } else {
        doc.fontSize(9.5).fillColor('#40916C').font('Times-Roman')
          .text('Professor(a) responsável', 0, sigLineY + 6, {
            align: 'center',
            width: w
          });
      }

      doc.end();
    });
  }
};

module.exports = certificadoService;
