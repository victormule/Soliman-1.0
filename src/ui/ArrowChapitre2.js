/**
 * ArrowChapitre2.js
 *
 * Flèche de la scène Chapitre 2 (retour vers Collaboration).
 *
 * POSITION   : gauche, centré verticalement
 * DIRECTION  : pointe vers la gauche  ←
 * DOM ID     : #arrow-chapitre2
 *
 * Usage dans Chapitre2Scene :
 *   this._arrow = new ArrowChapitre2(window.CONFIG);
 *   this._arrow.show(() => bus.emit('navigate', { to: 'collaboration' }));
 */

import { ArrowBase } from './ArrowBase.js';

export class ArrowChapitre2 extends ArrowBase {
  constructor(config) {
    super(
      config,
      'arrow-chapitre2',
      'M48 35 L22 35 M33 24 L22 35 L33 46'  // ← pointe vers la gauche
    );
  }

  _applyPosition(sz) {
    const vW     = Math.max(this.config.MIN_SIZE.width,  window.innerWidth);
    const vH     = Math.max(this.config.MIN_SIZE.height, window.innerHeight);
    const margin = Math.round(Math.min(vW, vH) * 0.05);

    Object.assign(this.el.style, {
      bottom:    '',
      right:     '',
      // Gauche, centré verticalement
      left:      margin + 'px',
      top:       '50%',
      transform: 'translateY(-50%)',
    });
  }
}
