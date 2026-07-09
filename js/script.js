document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Sticky navbar solid/gradient toggle ---------- */
  const nav = document.getElementById('navbar');
  const hero = document.getElementById('hero-video');

  function handleNavScroll() {
    if (nav) {
        // If there's no hero-video, keep the navbar solid.
        if (!hero) {
            nav.classList.remove('nav-gradient');
            nav.classList.add('nav-solid');
        } else {
            function handleNavScroll() {
            const threshold = Math.max(hero.offsetHeight - 120, 80);

            if (window.scrollY > threshold) {
                nav.classList.remove('nav-gradient');
                nav.classList.add('nav-solid');
            } else {
                nav.classList.add('nav-gradient');
                nav.classList.remove('nav-solid');
            }
            }

            window.addEventListener('scroll', handleNavScroll, { passive: true });
            handleNavScroll();
        }
    }
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll('[data-counter]');
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const raw = el.dataset.counter;
        const target = parseFloat(raw);
        const isDecimal = raw.includes('.');
        const suffix = el.dataset.suffix || '';
        const duration = 1800;
        const startTime = performance.now();

        function step(now) {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = isDecimal ? (target * eased).toFixed(1) : Math.floor(target * eased);
          el.textContent = value + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = (isDecimal ? target.toFixed(1) : target) + suffix;
        }
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- 3D ring/wheel gallery carousel ---------- */
  initRingGallery('home-gallery-scene', 'home-gallery-ring', 'home-gallery-prev', 'home-gallery-next');
});

/**
 * A true 3D "wheel" carousel: every `.carousel-cell` is planted at an equal
 * angle around a circle (rotateY(angle) translateZ(radius)), and the whole
 * ring is spun with a single rotateY() to bring different cells to the
 * front — the same technique as the classic CSS 3D carousel, generalized
 * to N photos and made responsive.
 *
 * How many cells are visible at once is controlled purely by how wide
 * `.carousel-scene` is (it clips with overflow:hidden): the radius and
 * each cell's slot are recalculated so that exactly `visibleCount()`
 * cells fit across the scene at a time, with a small GAP between them.
 */
function initRingGallery(sceneId, ringId, prevId, nextId) {
  const scene = document.getElementById(sceneId);
  const ring = document.getElementById(ringId);
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  if (!scene || !ring) return;

  const cells = ring.querySelectorAll('.carousel-cell');
  const count = cells.length;
  if (!count) return;

  const angleStep = 360 / count;   // deg between adjacent cells around the ring
  let rotation = 0;                // current ring rotation, in degrees
  let depthRadius = 0;             // current ring depth radius, in px

  const GAP = 16;           // px — visible gap left between adjacent photos
  const PERSPECTIVE = 1400; // px — must match .carousel-scene's perspective

  // Curve direction:
  //   true  => CONCAVE — edges curl toward the viewer, like sitting
  //            inside a curved screen (this is the default)
  //   false => CONVEX  — edges recede away, like the outside of a barrel
  const CONCAVE = true;
  const depthSign = CONCAVE ? -1 : 1;

  // How much deeper than the "natural" regular-polygon curve to push
  // things. 1 = the plain geometric depth; higher numbers make the curl
  // noticeably more dramatic without changing photo spacing/count.
  const CURVE_INTENSITY = 1.0;

  // Cells visible across the scene at once, per breakpoint.
  function visibleCount() {
    const w = window.innerWidth;
    if (w < 640) return 3;
    return 5;
    }

  // The largest angle (relative to dead-center) any cell can reach while
  // still front-facing — anything past 90° is hidden by
  // backface-visibility. Used to size the scene tall enough that the
  // most magnified, closest-to-camera edge cell never clips top/bottom.
  function maxVisibleAngleRad() {
    const steps = Math.floor((90 - 0.01) / angleStep);
    return steps * angleStep * (Math.PI / 180);
  }

  function layout() {
    scene.style.perspective = PERSPECTIVE + 'px';

    const sceneWidth = scene.clientWidth;
    const visible = visibleCount();

    // slotWidth is the full pitch between adjacent photo centers; the
    // photo itself is rendered a bit narrower (cellWidth) so a gap shows
    // between cards, while the ring's spacing still uses the full slot
    // so the gap doesn't throw off the geometry.
    let EDGE_PADDING;   // try 10–20
    if (window.innerWidth < 640) {
        EDGE_PADDING = -5;      // mobile
    } else if (window.innerWidth < 1024) {
        EDGE_PADDING = -30;      // tablet
    } else {
        EDGE_PADDING = 12;       // desktop
    
    }
    const slotWidth = (sceneWidth - EDGE_PADDING * 2) / visible;
    const cellWidth = Math.max(slotWidth - GAP, 10);
    const cellHeight = cellWidth * (16 / 9);

    // Regular-polygon apothem for `count` flat slots, each `slotWidth`
    // wide, arranged edge-to-edge around a circle — then exaggerated by
    // CURVE_INTENSITY for a more dramatic curl.
    const baseRadius = (slotWidth / 2) / Math.tan(Math.PI / count);
    depthRadius = baseRadius * CURVE_INTENSITY;

    // With a concave curve, off-center cells sit *closer* to the camera
    // than the front cell, so perspective magnifies them. Work out that
    // worst-case magnification and give the scene enough vertical
    // headroom (plus a small safety buffer) so nothing gets clipped.
    let maxScale = 1;
    if (CONCAVE) {
      const zMax = depthRadius * (1 - Math.cos(maxVisibleAngleRad()));
      maxScale = PERSPECTIVE / (PERSPECTIVE - zMax);
    }
    const sceneHeight = cellHeight * maxScale * 1.03;

    scene.style.height = sceneHeight + 'px';

    cells.forEach((cell, i) => {
      cell.style.width = cellWidth + 'px';
      cell.style.marginLeft = (-cellWidth / 2) + 'px';
      cell.style.marginTop = (-cellHeight / 2) + 'px';
      cell.style.transform = `rotateY(${i * angleStep}deg) translateZ(${depthSign * depthRadius}px)`;
    });

    applyRingTransform(false);
  }

  function applyRingTransform(animate) {
    if (!animate) {
      ring.style.transition = 'none';
    }
    ring.style.transform = `translateZ(${-depthSign * depthRadius}px) rotateY(${rotation}deg)`;
    if (!animate) {
      // Force a reflow so the transition is skipped only for this frame,
      // then hand control back to the CSS-defined transition.
      void ring.offsetHeight;
      ring.style.transition = '';
    }
  }

  function rotate(direction) {
    rotation += direction * angleStep;
    applyRingTransform(true);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => rotate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => rotate(1));

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(layout, 120);
  }, { passive: true });

  layout();
  // Re-run once more shortly after load in case web fonts/images shift layout.
  setTimeout(layout, 300);
}