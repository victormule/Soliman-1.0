/**
 * DocumentLoupe.js
 * -----------------------------------------------------------------------------
 * Loupe circulaire attachée au curseur, pour les documents de type « images »
 * (doc-1, doc-2). Comportement voulu :
 *
 *   - dès l'activation, un petit cercle (filet blanc discret) suit le curseur
 *     PARTOUT dans l'overlay ;
 *   - au survol d'une IMAGE, le cercle GRANDIT et affiche un ZOOM ×3 de la zone
 *     survolée, comme une loupe optique ;
 *   - en quittant l'image, il redevient un simple cercle indicateur.
 *
 * Le zoom est obtenu en peignant l'image en `background-image` du cercle, à une
 * taille multipliée par le facteur, recadrée sur la position du curseur.
 *
 * Découplé de DocumentOverlay : on l'active avec la liste des cadres d'images,
 * on le désactive à la fermeture. Aucun état partagé.
 */

const ZOOM        = 3;      // grossissement dans la loupe (fort, « détail marqué »)
const IDLE_SIZE   = 42;     // Ø du cercle indicateur hors image (px)
const ZOOM_SIZE   = 190;    // Ø de la loupe au survol d'une image (px)

export class DocumentLoupe {
  constructor() {
    this._el       = null;
    this._targets  = [];     // { frame, img }
    this._active   = false;
    this._onMove   = this._onMove.bind(this);
    this._raf      = null;
    this._pending  = null;   // dernières coords souris en attente de frame
  }

  /**
   * Active la loupe pour un ensemble de cadres image.
   * @param {HTMLElement} root     conteneur qui capte le mouvement (l'overlay).
   * @param {Array<{frame:HTMLElement,img:HTMLImageElement}>} targets
   */
  enable(root, targets) {
    this.disable();
    if (!root || !targets?.length) return;

    this._root    = root;
    this._targets = targets;

    const el = document.createElement('div');
    el.className = 'doc-ov-loupe';
    document.body.appendChild(el);
    this._el = el;

    this._active = true;
    root.addEventListener('pointermove', this._onMove, { passive: true });
    root.addEventListener('pointerleave', () => this._hide(), { passive: true });
  }

  disable() {
    if (this._root) {
      this._root.removeEventListener('pointermove', this._onMove);
    }
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this._el?.remove();
    this._el      = null;
    this._targets = [];
    this._active  = false;
    this._root    = null;
    this._pending = null;
  }

  /* ── Suivi du curseur (throttlé par rAF) ───────────────────────────────── */

  _onMove(e) {
    if (!this._active) return;
    this._pending = { x: e.clientX, y: e.clientY };
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      if (this._pending) this._render(this._pending);
    });
  }

  _render({ x, y }) {
    const el = this._el;
    if (!el) return;

    // Suit le curseur (centré dessus).
    el.style.left = x + 'px';
    el.style.top  = y + 'px';

    // Sur quelle image se trouve le curseur ?
    const hit = this._targets.find(t => {
      const r = t.frame.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

    if (!hit) { this._setIdle(); return; }
    this._setZoom(hit, x, y);
  }

  /** Hors image : simple cercle indicateur, sans zoom. */
  _setIdle() {
    const el = this._el;
    el.classList.remove('is-zoom');
    el.style.width  = IDLE_SIZE + 'px';
    el.style.height = IDLE_SIZE + 'px';
    el.style.backgroundImage = 'none';
    el.style.opacity = '1';
  }

  /** Sur image : la loupe grandit et peint le zoom recadré sur le curseur. */
  _setZoom(hit, x, y) {
    const el  = this._el;
    const img = hit.img;
    const r   = hit.frame.getBoundingClientRect();

    // L'image est en object-fit: contain + padding : on calcule la boîte réelle
    // qu'elle occupe dans le cadre pour un recadrage fidèle.
    const box = this._contentBox(img, r);

    // Position du curseur en fraction (0..1) DANS l'image affichée.
    const fx = (x - box.left) / box.width;
    const fy = (y - box.top)  / box.height;
    // Hors de la partie réellement couverte par l'image (bandes du contain) :
    // on reste en mode idle pour ne pas montrer du vide.
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) { this._setIdle(); return; }

    el.classList.add('is-zoom');
    el.style.width  = ZOOM_SIZE + 'px';
    el.style.height = ZOOM_SIZE + 'px';
    el.style.opacity = '1';

    // Fond = l'image, agrandie ZOOM×, recadrée pour centrer le point survolé.
    const bgW = box.width  * ZOOM;
    const bgH = box.height * ZOOM;
    el.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    el.style.backgroundSize  = `${bgW}px ${bgH}px`;
    // Le point (fx,fy) de l'image doit tomber au CENTRE de la loupe.
    const bgX = ZOOM_SIZE / 2 - fx * bgW;
    const bgY = ZOOM_SIZE / 2 - fy * bgH;
    el.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }

  /**
   * Boîte réellement occupée par l'image dans son cadre (object-fit: contain +
   * padding CSS). Nécessaire pour un zoom aligné sur ce que voit l'utilisateur.
   */
  _contentBox(img, rect) {
    const cs   = getComputedStyle(img);
    const padL = parseFloat(cs.paddingLeft)   || 0;
    const padR = parseFloat(cs.paddingRight)  || 0;
    const padT = parseFloat(cs.paddingTop)    || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;

    const availW = rect.width  - padL - padR;
    const availH = rect.height - padT - padB;
    const ratio  = (img.naturalWidth && img.naturalHeight)
                 ? img.naturalWidth / img.naturalHeight
                 : availW / availH;

    // contain : l'image tient entièrement, centrée, dans (availW × availH).
    let w = availW, h = w / ratio;
    if (h > availH) { h = availH; w = h * ratio; }
    const left = rect.left + padL + (availW - w) / 2;
    const top  = rect.top  + padT + (availH - h) / 2;
    return { left, top, width: w, height: h };
  }

  _hide() {
    if (this._el) this._el.style.opacity = '0';
  }
}
