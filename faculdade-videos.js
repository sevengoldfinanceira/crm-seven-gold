(function () {
  "use strict";

  // Catálogo central dos vídeos da Faculdade Seven Gold.
  // Cada chave é o ID da aula e cada valor é o link compartilhável do YouTube.
  // Aulas que ainda não aparecem neste objeto são exibidas como "Vídeo pendente".
  window.SEVEN_GOLD_YOUTUBE_VIDEOS = Object.freeze({
    "onboarding_m3": "https://youtu.be/jFRDFjjo56I",

    // Exemplo para quando o primeiro vídeo estiver disponível:
    // "trilha_1_1_1": "https://youtu.be/ID_DO_VIDEO"
  });
})();
