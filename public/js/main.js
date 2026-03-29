// ReProgFuturo - Main JavaScript

document.addEventListener('DOMContentLoaded', function () {
  // Auto-dismiss alerts after 5 seconds
  const alerts = document.querySelectorAll('.eco-alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      bsAlert.close();
    }, 5000);
  });

  // Copy to clipboard (turma code)
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', function () {
      const code = this.dataset.code || this.previousElementSibling.textContent.trim();
      navigator.clipboard.writeText(code).then(() => {
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="bi bi-check2"></i> Copiado!';
        setTimeout(() => { this.innerHTML = originalText; }, 2000);
      });
    });
  });
});

// Feedback modal helper
function mostrarFeedback(pontuacao, feedback) {
  const modal = document.getElementById('feedbackModal');
  if (!modal) return;

  document.getElementById('feedbackEmoji').textContent = feedback.emoji;
  document.getElementById('feedbackPontuacao').textContent = `${pontuacao} pontos`;
  document.getElementById('feedbackMensagem').textContent = feedback.mensagem;

  const barra = document.getElementById('feedbackBarra');
  barra.style.width = '0%';
  barra.className = 'progress-bar';

  if (pontuacao <= 40) barra.classList.add('bg-danger');
  else if (pontuacao <= 60) barra.classList.add('bg-warning');
  else barra.classList.add('bg-success');

  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();

  // Animate progress bar
  setTimeout(() => { barra.style.width = pontuacao + '%'; }, 300);
}
