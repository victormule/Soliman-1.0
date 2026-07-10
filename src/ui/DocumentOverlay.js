/**
 * DocumentOverlay.js
 * -----------------------------------------------------------------------------
 * Affichage des contenus de la colonne haut-droite (scène phrénologie) :
 *
 *   'about'  → texte « À Propos », ajusté pour tenir SANS ascenseur
 *   'doc-1'  → deux cadres tracés côte à côte, puis deux images en fondu
 *   'doc-2'  → un cadre tracé, puis une image en fondu
 *   'doc-3'  → un cadre tracé, puis un site incrusté (image fixe sur tactile)
 *   'doc-4'  → un cadre tracé, puis un site incrusté
 *
 * EMPILEMENT — z-index 7 :
 *   #veil (6) < #doc-overlay (7) < #nav-bar (8) < #doc-btns (9)
 * L'overlay capte le clic « n'importe où » pour se fermer, tout en laissant les
 * boutons et la navbar cliquables au-dessus. Cliquer ailleurs qu'un document le
 * referme ; cliquer un autre bouton bascule le contenu.
 *
 * LES CADRES ÉPOUSENT LEUR MÉDIA (comme au chapitre 3, mais sans reflet animé).
 * Le ratio n'est pas codé en dur : il est lu sur l'image (naturalWidth/Height)
 * une fois décodée, ou fourni par la config pour les incrustations. La mise en
 * page est ensuite CALCULÉE, pas devinée :
 *
 *     H = min(hauteurDispo, (largeurDispo - gaps) / Σ ratios)
 *     wᵢ = H · ratioᵢ                          (hauteurs égales, largeurs justes)
 *
 * Le rectangle est tracé sur ces dimensions exactes, en pixels réels. C'est ce
 * qui corrige le tracé erratique : auparavant le cadre était mesuré avant que
 * son image ait la moindre taille. Un ResizeObserver relance le calcul dès que
 * la zone change (resize, plein écran, rotation).
 *
 * On n'utilise ni `pathLength` ni `vector-effect:non-scaling-stroke` : combinés,
 * ils font ignorer pathLength au navigateur et le tracé se fend.
 */

const OVERLAY_ID = 'doc-overlay';

/* Durées (ms) — accordées au langage visuel du site. */
const T = {
  fadeOut:     520,
  frameDraw:   900,
  mediaFade:  1200,
  paraStagger: 260,
};

/* Bornes de la police du texte « À Propos » (px). */
const TEXT_MIN_PX = 11;
const TEXT_MAX_PX = 30;

export class DocumentOverlay {
  constructor(config) {
    this.config = config;

    /** Clé affichée, ou null. */
    this.currentKey = null;

    this.el    = null;   // racine
    this.inner = null;   // zone de contenu

    this._timers = [];
    this._frames   = [];   // { el, ratio } — ratio = largeur / hauteur
    this._row      = null;
    this._text     = null;
    this._textBody = null;  // corps mesurable du texte « À Propos »
    this._ro       = null;  // ResizeObserver
    this._roRaf    = null;

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /* ── Cycle de vie ──────────────────────────────────────────────────────── */

  /** Ouvre un document. Rappeler la même clé referme (bascule). */
  open(key) {
    const data = this.config.DOCUMENTS?.[key];
    if (!data) { console.warn(`[DocumentOverlay] Contenu inconnu : ${key}`); return; }
    if (this.currentKey === key) { this.close(); return; }

    this._ensureDOM();
    this._clearTimers();
    this._disconnectObserver();

    this.currentKey = key;
    this.inner.innerHTML = '';
    this._frames   = [];
    this._row      = null;
    this._text     = null;
    this._textBody = null;

    if (data.type === 'text') this._buildText(data);
    else                      this._buildDocument(data);

    this.el.classList.add('visible');
    document.addEventListener('keydown', this._onKeyDown);
  }

  close() {
    if (!this.el || !this.currentKey) return;

    this.currentKey = null;
    this._clearTimers();
    this._disconnectObserver();
    this.el.classList.remove('visible');
    document.removeEventListener('keydown', this._onKeyDown);

    // Purge différée : libère les images et interrompt toute incrustation.
    this._addTimer(() => {
      if (!this.currentKey && this.inner) {
        this.inner.innerHTML = '';
        this._frames = [];
        this._row = this._text = this._textBody = null;
      }
    }, T.fadeOut + 60);
  }

  /** Recalcule la mise en page (appelé par la scène au resize). */
  resize() {
    if (!this.currentKey) return;
    if (this._text) this._fitText();
    else            this._layoutFrames(false);
  }

  destroy() {
    this._clearTimers();
    this._disconnectObserver();
    document.removeEventListener('keydown', this._onKeyDown);
    this.currentKey = null;
    this._frames = [];
    this._row = this._text = this._textBody = null;
    this.el?.remove();
    this.el = this.inner = null;
  }

  /* ── DOM racine ────────────────────────────────────────────────────────── */

  _ensureDOM() {
    if (this.el) return;
    const app = document.getElementById('app');
    if (!app) return;

    const root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.innerHTML = `
      <div class="doc-ov-backdrop"></div>
      <div class="doc-ov-stage"><div class="doc-ov-inner"></div></div>`;

    // Clic n'importe où (y compris hors des documents) → fermeture.
    // Les zones qui doivent rester utilisables (texte défilable, incrustation,
    // liens) arrêtent la propagation.
    root.addEventListener('click', () => this.close());

    app.appendChild(root);
    this.el    = root;
    this.inner = root.querySelector('.doc-ov-inner');
  }

  _onKeyDown(e) { if (e.key === 'Escape') this.close(); }

  /* ── « À Propos » ──────────────────────────────────────────────────────── */

  _buildText(data) {
    const article = document.createElement('article');
    article.className = 'doc-ov-text';
    article.addEventListener('click', e => e.stopPropagation());

    // Corps mesurable : le centrage vertical vit sur `article`. Mesurer un
    // contenu qui déborde d'un conteneur CENTRÉ fausse scrollHeight (il déborde
    // symétriquement) — on mesure donc la hauteur propre de ce corps.
    const body = document.createElement('div');
    body.className = 'doc-ov-text-body';

    data.paragraphs.forEach(txt => {
      const p = document.createElement('p');
      p.textContent = txt;
      body.appendChild(p);
    });

    article.appendChild(body);
    this.inner.appendChild(article);
    this._text     = article;
    this._textBody = body;

    // Ajustement AVANT la cascade : taille définitive dès la première frame,
    // aucun reflow visible pendant les fondus.
    requestAnimationFrame(() => {
      this._fitText();
      Array.from(body.children).forEach((p, i) => {
        this._addTimer(() => p.classList.add('in'), 120 + i * T.paraStagger);
      });
    });

    this._observe(article);
  }

  /**
   * Ajuste la taille de police pour que TOUT le texte tienne dans la zone,
   * sans ascenseur. Recherche dichotomique sur la taille en pixels : ~12 essais
   * suffisent au dixième de pixel près, chacun coûtant un seul reflow.
   * Les tailles relatives (paragraphe d'accroche, interlignes, marges) sont
   * exprimées en `em` dans le CSS : elles suivent automatiquement.
   */
  _fitText() {
    const el   = this._text;
    const body = this._textBody;
    if (!el || !body) return;

    const avail = el.clientHeight;
    if (avail < 20) return;

    const fits = (px) => {
      el.style.fontSize = px + 'px';
      this._syncTextLead(px);   // l'interligne influe sur la hauteur : le lier ici
      return body.getBoundingClientRect().height <= avail + 1;
    };

    // Borne haute : proportionnelle au viewport, jamais au-delà de TEXT_MAX_PX.
    const hiStart = Math.min(TEXT_MAX_PX, Math.max(TEXT_MIN_PX, Math.round(window.innerHeight * 0.030)));

    if (fits(hiStart)) return;

    // Dichotomie : ~12 essais suffisent au dixième de pixel, un reflow chacun.
    let lo = TEXT_MIN_PX, hi = hiStart;
    for (let i = 0; i < 12 && hi - lo > 0.1; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid; else hi = mid;
    }
    fits(lo);   // rétablit la dernière taille qui tenait
  }

  /**
   * Interligne solidaire de la taille : un texte réduit doit se resserrer,
   * sinon il « flotte » et perd sa tenue typographique.
   */
  _syncTextLead(px) {
    const el = this._text;
    if (!el) return;
    const lead = px < 14 ? 1.58 : px < 18 ? 1.68 : 1.78;
    el.style.lineHeight = String(lead);
  }

  /* ── Documents ─────────────────────────────────────────────────────────── */

  _buildDocument(data) {
    const figure = document.createElement('figure');
    figure.className = 'doc-ov-figure';

    const isEmbed = data.type === 'embed';
    const row = document.createElement('div');
    row.className = 'doc-ov-row' + (isEmbed ? ' is-embed' : '');
    figure.appendChild(row);
    this._row = row;

    if (isEmbed) row.appendChild(this._makeEmbedFrame(data));
    else         data.frames.forEach(f => row.appendChild(this._makeImageFrame(f)));

    // Légende + source, poussées EN BAS de la zone : les cadres récupèrent
    // toute la hauteur restante et s'affichent donc au plus grand.
    const cap = document.createElement('figcaption');
    cap.className = 'doc-ov-caption';
    cap.innerHTML = `<span class="doc-ov-cap-text">${data.caption}</span>`;

    if (data.source?.href) {
      const a = document.createElement('a');
      a.className = 'doc-ov-source';
      a.href   = data.source.href;
      a.target = '_blank';
      a.rel    = 'noopener noreferrer';
      a.textContent = data.source.label ?? 'Source';
      a.dataset.clickable = 'true';           // curseur « hotspot » (cursor.js)
      a.addEventListener('click', e => e.stopPropagation());
      cap.appendChild(a);
    }

    figure.appendChild(cap);
    this.inner.appendChild(figure);

    this._addTimer(() => cap.classList.add('in'), T.frameDraw * 0.75 + 200);
    this._observe(row);
  }

  /** Cadre d'image : le ratio est lu sur l'image une fois décodée. */
  _makeImageFrame(frame) {
    const el = this._makeFrameShell();

    const img = document.createElement('img');
    img.className = 'doc-ov-media';
    img.src       = frame.src;
    img.alt       = frame.alt ?? '';
    img.draggable = false;
    img.decoding  = 'async';

    const entry = this._frames[this._frames.length - 1];

    img.addEventListener('load', () => {
      if (img.naturalWidth && img.naturalHeight) {
        entry.ratio = img.naturalWidth / img.naturalHeight;
      }
      // Toutes les images connues ? On pose la mise en page et on trace.
      if (this._frames.every(f => f.ratio)) {
        this._layoutFrames(true);
        this._addTimer(() => {
          el.parentElement?.querySelectorAll('.doc-ov-media')
            .forEach(m => m.classList.add('in'));
        }, T.frameDraw * 0.7);
      }
    }, { once: true });

    img.addEventListener('error', () => {
      img.remove();
      entry.ratio = entry.ratio || 0.72;      // portrait par défaut
      el.appendChild(this._makeMissing('Image indisponible'));
      if (this._frames.every(f => f.ratio)) this._layoutFrames(true);
    }, { once: true });

    el.appendChild(img);
    return el;
  }

  /**
   * Cadre d'incrustation. Le ratio vient de la config (`ratio: '16 / 9'`).
   * Sur écran tactile, l'incrustation cède la place à une image fixe.
   * Le lien de la légende reste le filet : il couvre aussi le cas d'un site
   * qui refuse l'incrustation (X-Frame-Options / frame-ancestors).
   */
  _makeEmbedFrame(data) {
    const el = this._makeFrameShell();
    const entry = this._frames[this._frames.length - 1];
    entry.ratio = this._parseRatio(data.ratio) ?? (16 / 9);

    // `fill: true` → le cadre occupe TOUTE la zone disponible au lieu de suivre
    // un ratio. À hauteur commune, un cadre 4/3 est 25 % plus étroit qu'un 16/9 :
    // pour une page web incrustée (texte long), on veut la largeur maximale.
    entry.fill = !!data.fill;

    const coarse = window.matchMedia?.('(pointer: coarse)').matches;

    if (coarse) {
      if (data.poster) {
        const img = document.createElement('img');
        img.className = 'doc-ov-media';
        img.src = data.poster;
        img.alt = data.caption ?? '';
        img.draggable = false;
        img.addEventListener('load', () => {
          if (img.naturalWidth) entry.ratio = img.naturalWidth / img.naturalHeight;
          this._layoutFrames(true);
          this._addTimer(() => img.classList.add('in'), T.frameDraw * 0.7);
        }, { once: true });
        img.addEventListener('error', () => {
          img.remove();
          el.appendChild(this._makeEmbedFallback(data));
          this._layoutFrames(true);
        }, { once: true });
        el.appendChild(img);
      } else {
        el.appendChild(this._makeEmbedFallback(data));
        requestAnimationFrame(() => this._layoutFrames(true));
      }
      return el;
    }

    const iframe = document.createElement('iframe');
    iframe.className = 'doc-ov-media doc-ov-embed';
    iframe.src            = data.url;
    iframe.loading        = 'lazy';
    iframe.referrerPolicy = 'no-referrer';
    iframe.setAttribute('allow', 'fullscreen; autoplay');
    iframe.setAttribute('title', data.caption ?? 'Document');

    // L'incrustation garde ses propres interactions : molette pour défiler
    // dans la page, clics internes. On empêche donc la fermeture depuis elle.
    el.addEventListener('click', e => e.stopPropagation());
    el.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

    el.appendChild(iframe);
    requestAnimationFrame(() => {
      this._layoutFrames(true);
      this._addTimer(() => iframe.classList.add('in'), T.frameDraw * 0.7);
    });
    return el;
  }

  _parseRatio(str) {
    if (!str) return null;
    const m = String(str).split('/');
    if (m.length !== 2) return null;
    const w = parseFloat(m[0]), h = parseFloat(m[1]);
    return (w > 0 && h > 0) ? w / h : null;
  }

  _makeMissing(text) {
    const box = document.createElement('div');
    box.className = 'doc-ov-missing doc-ov-media in';
    box.textContent = text;
    return box;
  }

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

  /* ── Cadre : coquille, mise en page, tracé ─────────────────────────────── */

  _makeFrameShell() {
    const el = document.createElement('div');
    el.className = 'doc-ov-frame';
    el.innerHTML = `
      <svg class="doc-ov-frame-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect class="doc-ov-rect" x="0.5" y="0.5"/>
      </svg>`;
    this._frames.push({ el, ratio: null, fill: false });
    return el;
  }

  /**
   * Calcule et applique les dimensions des cadres, puis (re)trace les rectangles.
   * Hauteur commune, largeurs proportionnelles aux ratios : deux planches de
   * formats voisins s'alignent, et l'ensemble reste toujours dans la zone.
   * @param {boolean} animate true = tracé animé (première apparition)
   */
  _layoutFrames(animate) {
    const row = this._row;
    if (!row || !this._frames.length) return;
    if (!this._frames.every(f => f.ratio)) return;

    const availW = row.clientWidth;
    const availH = row.clientHeight;
    if (availW < 8 || availH < 8) return;

    // Cadre « pleine zone » (incrustation d'une page web) : pas de ratio imposé.
    if (this._frames.length === 1 && this._frames[0].fill) {
      const f = this._frames[0];
      const w = Math.round(availW), h = Math.round(availH);
      f.el.style.width  = w + 'px';
      f.el.style.height = h + 'px';
      this._drawRect(f.el, w, h, animate, 0);
      return;
    }

    const gap    = parseFloat(getComputedStyle(row).gap) || 0;
    const gaps   = gap * (this._frames.length - 1);
    const sumR   = this._frames.reduce((s, f) => s + f.ratio, 0);

    // Hauteur commune : bornée par la hauteur ET par la largeur disponibles.
    const H = Math.max(40, Math.min(availH, (availW - gaps) / sumR));

    this._frames.forEach((f, i) => {
      const w = Math.round(H * f.ratio);
      const h = Math.round(H);
      f.el.style.width  = w + 'px';
      f.el.style.height = h + 'px';
      this._drawRect(f.el, w, h, animate, i * 160);
    });
  }

  /**
   * Trace (ou repositionne) le rectangle. Périmètre en pixels réels : le tracé
   * est exact à toute taille, sans pathLength ni non-scaling-stroke.
   */
  _drawRect(el, w, h, animate, delay = 0) {
    const rect = el.querySelector('.doc-ov-rect');
    const svg  = el.querySelector('.doc-ov-frame-svg');
    if (!rect || !svg || w < 2 || h < 2) return;

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    rect.setAttribute('width',  Math.max(1, w - 1));
    rect.setAttribute('height', Math.max(1, h - 1));

    const perim = 2 * (w + h);
    rect.style.strokeDasharray = String(perim);

    if (!animate) {
      rect.style.transition       = 'none';
      rect.style.strokeDashoffset = '0';
      return;
    }

    rect.style.transition       = 'none';
    rect.style.strokeDashoffset = String(perim);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      rect.style.transition       = `stroke-dashoffset ${T.frameDraw}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`;
      rect.style.strokeDashoffset = '0';
    }));
  }

  /* ── Observation de la zone ────────────────────────────────────────────── */

  /** Relance la mise en page dès que la zone utile change (throttlé par rAF). */
  _observe(target) {
    if (!target || typeof ResizeObserver === 'undefined') return;
    this._ro = new ResizeObserver(() => {
      if (this._roRaf) cancelAnimationFrame(this._roRaf);
      this._roRaf = requestAnimationFrame(() => {
        this._roRaf = null;
        if (!this.currentKey) return;
        if (this._text) this._fitText();
        else            this._layoutFrames(false);   // repositionne sans rejouer le tracé
      });
    });
    this._ro.observe(target);
  }

  _disconnectObserver() {
    if (this._roRaf) { cancelAnimationFrame(this._roRaf); this._roRaf = null; }
    this._ro?.disconnect();
    this._ro = null;
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
