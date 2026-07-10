/**
 * DocumentOverlay.js
 * -----------------------------------------------------------------------------
 * Affichage des contenus déclenchés par la colonne de boutons (scène phrénologie) :
 *
 *   'about'  → texte « À Propos », paragraphes en apparition cinématographique
 *   'doc-1'  → deux cadres tracés côte à côte, puis deux images en fondu
 *   'doc-2'  → un cadre tracé, puis une image en fondu
 *   'doc-3'  → un cadre tracé, puis un site incrusté (ou image fixe sur tactile)
 *   'doc-4'  → un cadre tracé, puis un site incrusté
 *
 * EMPILEMENT — z-index 7, choisi à dessein :
 *   #veil (6) < #doc-overlay (7) < #nav-bar (8) < #doc-btns (9)
 *   L'overlay recouvre donc la scène et capte le clic « n'importe où » pour se
 *   fermer, tandis que les boutons documents et la barre de navigation restent
 *   cliquables AU-DESSUS de lui. Cliquer un autre bouton bascule le contenu ;
 *   aucune détection de cible n'est nécessaire.
 *
 * TRACÉ DES CADRES — sobre (pas de reflet animé, contrairement au chapitre 3).
 * Le rectangle est mesuré APRÈS mise en page (le cadre est dimensionné en CSS),
 * puis tracé via stroke-dashoffset sur un périmètre exprimé en pixels réels.
 * On n'utilise donc ni `pathLength` ni `vector-effect:non-scaling-stroke` :
 * combinés, ils font ignorer pathLength au navigateur et le tracé se fend.
 *
 * CYCLE : open(key) — close() — resize() — destroy()
 * Tous les timers passent par _addTimer() : close()/destroy() les purgent, donc
 * aucune animation différée ne survit à une fermeture ou à une sortie de scène.
 */

const OVERLAY_ID = 'doc-overlay';

/* Durées (ms) — mêmes valeurs que le langage visuel du site. */
const T = {
  fadeIn:      700,   // apparition du voile
  fadeOut:     520,   // disparition
  frameDraw:   900,   // tracé du rectangle
  mediaFade:  1200,   // fondu de l'image / de l'incrustation
  captionIn:   900,   // fondu de la légende
  paraStagger: 260,   // décalage entre paragraphes (À Propos)
};

export class DocumentOverlay {
  constructor(config) {
    this.config = config;

    /** Clé actuellement affichée, ou null. */
    this.currentKey = null;

    /** Racine DOM (créée à la première ouverture). */
    this.el = null;

    /** Zone de contenu (vidée à chaque changement de document). */
    this.inner = null;

    /** Timers nettoyables. */
    this._timers = [];

    /** Cadres présents, pour le retracé au resize. */
    this._frames = [];

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /* ── Cycle de vie ──────────────────────────────────────────────────────── */

  /**
   * Ouvre un document. Rappeler la même clé referme (bascule naturelle).
   * @param {string} key clé de CONFIG.DOCUMENTS
   */
  open(key) {
    const data = this.config.DOCUMENTS?.[key];
    if (!data) {
      console.warn(`[DocumentOverlay] Contenu inconnu : ${key}`);
      return;
    }

    if (this.currentKey === key) { this.close(); return; }

    this._ensureDOM();
    this._clearTimers();
    this.currentKey = key;

    // Changement de document : on vide et on rebâtit (pas de fondu croisé, la
    // lecture doit rester nette et le tracé du cadre repartir de zéro).
    this.inner.innerHTML = '';
    this._frames = [];

    if (data.type === 'text')   this._buildText(data);
    else                        this._buildDocument(data);

    // Révélation du voile.
    this.el.classList.add('visible');
    document.addEventListener('keydown', this._onKeyDown);
  }

  /** Ferme le document courant. */
  close() {
    if (!this.el || !this.currentKey) return;

    this.currentKey = null;
    this._clearTimers();
    this.el.classList.remove('visible');
    document.removeEventListener('keydown', this._onKeyDown);

    // Purge du contenu une fois le fondu terminé (évite de charger une iframe
    // en arrière-plan et libère la mémoire des images).
    this._addTimer(() => {
      if (!this.currentKey && this.inner) {
        this.inner.innerHTML = '';
        this._frames = [];
      }
    }, T.fadeOut + 60);
  }

  /** Retrace les cadres aux nouvelles dimensions (sans animation). */
  resize() {
    this._frames.forEach(f => this._drawRect(f, false));
  }

  /** Démontage complet (sortie de scène). */
  destroy() {
    this._clearTimers();
    document.removeEventListener('keydown', this._onKeyDown);
    this.currentKey = null;
    this._frames = [];
    this.el?.remove();
    this.el = null;
    this.inner = null;
  }

  /* ── Construction DOM ──────────────────────────────────────────────────── */

  _ensureDOM() {
    if (this.el) return;
    const app = document.getElementById('app');
    if (!app) return;

    const root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.innerHTML = `
      <div class="doc-ov-backdrop"></div>
      <div class="doc-ov-stage"><div class="doc-ov-inner"></div></div>`;

    // Clic n'importe où → fermeture. Les éléments interactifs (liens,
    // incrustations) arrêtent la propagation : ils restent utilisables.
    root.addEventListener('click', () => this.close());

    app.appendChild(root);
    this.el    = root;
    this.inner = root.querySelector('.doc-ov-inner');
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') this.close();
  }

  /* ── « À Propos » : texte seul ─────────────────────────────────────────── */

  _buildText(data) {
    const article = document.createElement('article');
    article.className = 'doc-ov-text';

    // Le texte est défilable : indispensable en paysage sur téléphone.
    // On stoppe la propagation pour qu'un geste de lecture ne referme pas.
    article.addEventListener('click', e => e.stopPropagation());

    data.paragraphs.forEach((txt, i) => {
      const p = document.createElement('p');
      p.textContent = txt;
      article.appendChild(p);
      // Apparition en cascade — même grammaire que les titres du site.
      this._addTimer(() => p.classList.add('in'), 260 + i * T.paraStagger);
    });

    this.inner.appendChild(article);
  }

  /* ── Documents : cadres tracés + média ─────────────────────────────────── */

  _buildDocument(data) {
    const wrap = document.createElement('figure');
    wrap.className = 'doc-ov-figure';

    const isEmbed = data.type === 'embed';
    const row = document.createElement('div');
    row.className = 'doc-ov-row' + (isEmbed ? ' is-embed' : '');
    if (!isEmbed && data.frames.length > 1) row.classList.add('is-pair');

    if (isEmbed) {
      row.appendChild(this._makeEmbedFrame(data));
    } else {
      data.frames.forEach((f, i) => row.appendChild(this._makeImageFrame(f, i)));
    }
    wrap.appendChild(row);

    // Légende + source.
    const cap = document.createElement('figcaption');
    cap.className = 'doc-ov-caption';
    cap.innerHTML = `<span class="doc-ov-cap-text">${data.caption}</span>`;

    if (data.source?.href) {
      const a = document.createElement('a');
      a.className   = 'doc-ov-source';
      a.href        = data.source.href;
      a.target      = '_blank';
      a.rel         = 'noopener noreferrer';
      a.textContent = data.source.label ?? 'Source';
      a.dataset.clickable = 'true';          // curseur « hotspot » (cursor.js)
      a.addEventListener('click', e => e.stopPropagation());
      cap.appendChild(a);
    }
    wrap.appendChild(cap);
    this.inner.appendChild(wrap);

    // Tracé des cadres après mise en page, puis média, puis légende.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this._frames.forEach((f, i) => this._drawRect(f, true, i * 160));
    }));

    const mediaDelay = T.frameDraw * 0.75;
    this._addTimer(() => wrap.querySelectorAll('.doc-ov-media').forEach(m => m.classList.add('in')), mediaDelay);
    this._addTimer(() => cap.classList.add('in'), mediaDelay + T.mediaFade * 0.45);
  }

  /** Cadre + image. */
  _makeImageFrame(frame, index) {
    const el = this._makeFrameShell();

    const img = document.createElement('img');
    img.className = 'doc-ov-media';
    img.src       = frame.src;
    img.alt       = frame.alt ?? '';
    img.draggable = false;
    img.decoding  = 'async';
    // Image manquante : le cadre reste, un discret repli textuel s'affiche.
    img.addEventListener('error', () => {
      img.remove();
      const miss = document.createElement('div');
      miss.className = 'doc-ov-missing doc-ov-media in';
      miss.textContent = 'Image indisponible';
      el.appendChild(miss);
    }, { once: true });

    el.appendChild(img);
    return el;
  }

  /**
   * Cadre + site incrusté. Sur écran tactile, l'incrustation est remplacée par
   * une image fixe (navigation inconfortable), avec repli textuel si l'image
   * n'existe pas. Le lien « source » de la légende reste toujours disponible :
   * il couvre aussi le cas où le site refuse l'incrustation (X-Frame-Options).
   */
  _makeEmbedFrame(data) {
    const el = this._makeFrameShell();
    if (data.ratio) el.style.aspectRatio = data.ratio;

    const coarse = window.matchMedia?.('(pointer: coarse)').matches;

    if (coarse && data.poster) {
      const img = document.createElement('img');
      img.className = 'doc-ov-media';
      img.src = data.poster;
      img.alt = data.caption ?? '';
      img.draggable = false;
      img.addEventListener('error', () => {
        img.remove();
        el.appendChild(this._makeEmbedFallback(data));
      }, { once: true });
      el.appendChild(img);
      return el;
    }

    if (coarse) { el.appendChild(this._makeEmbedFallback(data)); return el; }

    const frame = document.createElement('iframe');
    frame.className = 'doc-ov-media doc-ov-embed';
    frame.src            = data.url;
    frame.loading        = 'lazy';
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('allow', 'fullscreen; autoplay');
    frame.setAttribute('title', data.caption ?? 'Document');
    // L'iframe capte ses propres clics ; on protège aussi son pourtour.
    frame.addEventListener('click', e => e.stopPropagation());
    el.addEventListener('click', e => e.stopPropagation());
    el.appendChild(frame);
    return el;
  }

  /** Carte de repli : le contenu s'ouvre dans un nouvel onglet. */
  _makeEmbedFallback(data) {
    const box = document.createElement('div');
    box.className = 'doc-ov-missing doc-ov-media in';
    const a = document.createElement('a');
    a.href   = data.source?.href ?? data.url;
    a.target = '_blank';
    a.rel    = 'noopener noreferrer';
    a.textContent = data.source?.label ?? 'Consulter le document';
    a.dataset.clickable = 'true';
    a.addEventListener('click', e => e.stopPropagation());
    box.appendChild(a);
    return box;
  }

  /* ── Cadre : coquille + tracé ──────────────────────────────────────────── */

  _makeFrameShell() {
    const el = document.createElement('div');
    el.className = 'doc-ov-frame';
    el.innerHTML = `
      <svg class="doc-ov-frame-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect class="doc-ov-rect" x="0.6" y="0.6" rx="1" ry="1"/>
      </svg>`;
    this._frames.push(el);
    return el;
  }

  /**
   * Trace (ou repositionne) le rectangle d'un cadre.
   * Le périmètre est calculé en PIXELS RÉELS après mise en page : le tracé est
   * donc exact quelle que soit la taille, sans pathLength ni non-scaling-stroke.
   * @param {HTMLElement} el      cadre
   * @param {boolean}     animate true = animation de tracé
   * @param {number}      delay   décalage (ms)
   */
  _drawRect(el, animate, delay = 0) {
    const rect = el.querySelector('.doc-ov-rect');
    const svg  = el.querySelector('.doc-ov-frame-svg');
    if (!rect || !svg) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w < 2 || h < 2) return;

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    rect.setAttribute('width',  Math.max(1, w - 1.2));
    rect.setAttribute('height', Math.max(1, h - 1.2));

    const perim = 2 * (w + h);
    rect.style.strokeDasharray = String(perim);

    if (!animate) {
      rect.style.transition    = 'none';
      rect.style.strokeDashoffset = '0';
      return;
    }

    rect.style.transition      = 'none';
    rect.style.strokeDashoffset = String(perim);
    // Deux frames : garantit que l'état initial est peint avant la transition.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      rect.style.transition       = `stroke-dashoffset ${T.frameDraw}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`;
      rect.style.strokeDashoffset = '0';
    }));
  }

  /* ── Timers ────────────────────────────────────────────────────────────── */

  _addTimer(fn, ms) {
    const id = setTimeout(() => {
      this._timers = this._timers.filter(t => t !== id);
      fn();
    }, ms);
    this._timers.push(id);
    return id;
  }

  _clearTimers() {
    this._timers.forEach(clearTimeout);
    this._timers = [];
  }
}
