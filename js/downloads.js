document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('downloads-grid');
  const status = document.getElementById('downloads-status');
  if (!grid) return;

  const DATA_URL = './data/downloads.json';

  const downloadIcon = `
    <svg class="w-4 h-4 md:w-4.5 md:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
    </svg>`;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function renderCards(albums) {
    if (!Array.isArray(albums) || albums.length === 0) {
      if (status) status.textContent = 'No albums are available for download just yet — please check back soon.';
      return;
    }

    if (status) status.remove();

    const cardsHtml = albums.map((album) => {
      const title = escapeHtml(album.title || 'Untitled Album');
      const image = escapeHtml(album.image || '');
      const link = escapeHtml(album.download || '#');

      return `
        <a href="${link}" download target="_blank" rel="noopener"
           class="download-card frame-corners frame-corners-dark group relative block aspect-square w-full overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
          <span class="fc-tr"></span><span class="fc-bl"></span>

          <img src="${image}" alt="${title} cover photo" loading="lazy"
               class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110">

          <div class="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-tertiary/85 via-tertiary/30 to-transparent pointer-events-none"></div>
          <div class="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-tertiary/85 via-tertiary/30 to-transparent pointer-events-none"></div>

          <div class="absolute top-0 inset-x-0 p-4 md:p-5">
            <h3 class="text-primary text-base md:text-lg leading-snug text-shadow-soft">${title}</h3>
          </div>

          <div class="absolute bottom-0 inset-x-0 p-4 md:p-5 flex items-center justify-center gap-2 text-primary">
            ${downloadIcon}
            <span class="text-xs md:text-sm uppercase tracking-[0.2em] text-shadow-soft">Download Album</span>
          </div>
        </a>`;
    }).join('');

    grid.innerHTML = cardsHtml;

    requestAnimationFrame(() => {
      grid.querySelectorAll('.download-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(18px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        card.style.transitionDelay = `${Math.min(i * 60, 360)}ms`;
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    });
  }

  fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
      return res.json();
    })
    .then(renderCards)
    .catch((err) => {
      console.error('Could not load downloads.json', err);
      if (status) {
        status.textContent = "We couldn't load your albums right now. Please refresh the page or contact us.";
      }
    });
});