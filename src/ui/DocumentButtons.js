/**
 * DocumentButtons.js
 * Boutons documents phréno avec animation SVG
 */

import { unifyFontSize, applyGoldenHover, applyNeighborPush, clearNeighborPush } from '../utils/helpers.js';

export class DocumentButtons {
  constructor(config) {
    this.config = config;
    this.el = document.getElementById('doc-btns');
  }

  /**
   * Calcule dimensions bouton
   */
  getSizePx() {
    const vW = Math.max(this.config.MIN_SIZE.width, window.innerWidth);
    const vH = Math.max(this.config.MIN_SIZE.height, window.innerHeight);
    
    const D = this.config.DOCS;
    const wRaw = vW * D.width_vw / 100;
    const hRaw = vH * D.height_vh / 100;
    
    return {
      w: Math.round(Math.max(D.width_min, Math.min(D.width_max, wRaw))),
      h: Math.round(Math.max(D.height_min, Math.min(D.height_max, hRaw)))
    };
  }

  /**
   * Construit le DOM des boutons
   */
  buildDOM(animate) {
    const D = this.config.DOCS;
    const { w, h } = this.getSizePx();
    const perim = 2 * (w + h);
    
    const f = this.config.FONTS?.doc_btns;
    const vW = Math.max(this.config.MIN_SIZE.width, window.innerWidth);
    const vH = Math.max(this.config.MIN_SIZE.height, window.innerHeight);
    
    const fontSizeStart = f
      ? Math.max(f.size_min, Math.min(f.size_max, Math.round(vW * f.size_vw / 100)))
      : Math.min(16, Math.max(9, Math.round(h * 0.38)));
    
    const maxTextW = w * 0.76;

    // Position
    this.el.style.right = (D.right_pct ?? 3.5) + '%';
    this.el.style.top = (D.top_pct ?? 3.2) + '%';
    this.el.style.gap = Math.max(4, Math.round(vH * (D.gap_vh ?? 1.8) / 100)) + 'px';

    if (animate) {
      // Construction complète
      this.el.innerHTML = '';
      this.config.DOCS.labels.forEach((label, i) => {
        const btn = document.createElement('div');
        btn.className = 'doc-btn';
        btn.style.width = w + 'px';
        btn.style.height = h + 'px';
        btn.innerHTML = `
          <svg width="${w}" height="${h}">
            <rect class="doc-rect"
                  x="1" y="1" width="${w-2}" height="${h-2}"
                  stroke-dasharray="${perim}" stroke-dashoffset="${perim}"/>
            <text class="doc-label"
                  x="${w/2}" y="${h/2}"
                  font-size="${fontSizeStart}"
                  font-family="${f?.family ?? 'Cinzel, serif'}"
                  font-weight="${f?.weight ?? 400}"
                  letter-spacing="${f?.spacing ?? '0.18em'}">${label}</text>
          </svg>`;
        this.el.appendChild(btn);
      });
    } else {
      // Resize seulement
      this.el.querySelectorAll('.doc-btn').forEach((btn) => {
        btn.style.width = w + 'px';
        btn.style.height = h + 'px';
        const rect = btn.querySelector('.doc-rect');
        const label = btn.querySelector('.doc-label');
        const svg = btn.querySelector('svg');
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        rect.setAttribute('width', w - 2);
        rect.setAttribute('height', h - 2);
        rect.setAttribute('stroke-dasharray', perim);
        rect.setAttribute('stroke-dashoffset', '0');
        label.setAttribute('x', w / 2);
        label.setAttribute('y', h / 2);
        label.setAttribute('font-size', fontSizeStart + 'px');
      });
    }

    // Uniformiser police
    const allTexts = Array.from(this.el.querySelectorAll('.doc-label'));
    unifyFontSize(allTexts, maxTextW, fontSizeStart);
  }

  /**
   * Attache les hovers
   */
  attachHover() {
    const allBtns = Array.from(this.el.querySelectorAll('.doc-btn'));
    allBtns.forEach((btn, i) => {
      btn.onmouseenter = () => {
        btn.classList.add('hovered');
        applyNeighborPush(allBtns, i);
        applyGoldenHover(
          [btn.querySelector('.doc-rect')],
          [btn.querySelector('.doc-label')]
        );
      };
      btn.onmouseleave = () => {
        btn.classList.remove('hovered');
        clearNeighborPush(allBtns);
        const r = btn.querySelector('.doc-rect');
        const l = btn.querySelector('.doc-label');
        if (r) { r.style.stroke = 'rgba(255,255,255,0.72)'; r.style.filter = ''; }
        if (l) l.style.fill = 'rgba(255,255,255,0.82)';
      };
    });
    return allBtns;
  }

  /**
   * Affiche avec animation
   */
  show(onClickCallbacks) {
    this.buildDOM(true);
    this.el.style.opacity = '';
    this.el.classList.add('visible');

    const allBtns = this.attachHover();

    // Attacher clicks
    if (onClickCallbacks) {
      allBtns.forEach((btn, i) => {
        btn.onclick = () => onClickCallbacks[i]?.();
      });
    }

    // Animation cascade
    allBtns.forEach((btn, i) => {
      const rect = btn.querySelector('.doc-rect');
      const label = btn.querySelector('.doc-label');
      const delayMs = i * 220;
      setTimeout(() => {
        rect.classList.remove('drawn');
        label.classList.remove('drawn');
        void rect.offsetWidth;
        rect.classList.add('drawn');
        setTimeout(() => label.classList.add('drawn'), 850);
      }, delayMs);
    });
  }

  /**
   * Redimensionne
   */
  resize() {
    this.buildDOM(false);
    this.attachHover();
  }

  /**
   * Cache
   */
  hide() {
    this.el.style.transition = 'opacity 600ms ease';
    this.el.style.opacity = '0';
    this.el.classList.remove('visible');
    
    setTimeout(() => {
      this.el.innerHTML = '';
    }, 620);
  }
}
