/* ╔══════════════════════════════════════════════════════════════════╗
   ║                                                                  ║
   ║                     C O N F I G U R A T I O N                    ║ 
   ║                                                                  ║
   ╚══════════════════════════════════════════════════════════════════╝ */

window.CONFIG = {


/* ══════════════════════════════════════════════════════════════════
   VITRINE
   ──────────────────────────────────────────────────────────────────
   CHRONOLOGIE (depuis enter()) :

   ══════════════════════════════════════════════════════════════════ */

  VITRINE: {

    torch: {
      size:              0.65,   // Fraction de min(W,H) — torche large et enveloppante
      grow_duration:    15000,   // Allumage très lent et progressif (ms)
      fade_out_duration: 1500,   // Extinction en sortie (ms)
    },

    arrow: {
      // Délai ABSOLU depuis le début de enter()
      // La torche est déjà bien amorcée avant que la flèche apparaisse
      appear_at:        5000,   // ms
      draw_duration:    2100,   // Durée animation SVG cercle + flèche (ms)
      hide_duration:     400,   // Fondu disparition (ms)
    },

    timing: {
      bg_fade_in:         1200,  // Révélation fond (ms)
      pause_before_torch:  400,  // Pause après fond avant torche (ms)
      exit_black_pause:    10,  // Pause noir en fin de exit (ms)
    },
  },


/* ══════════════════════════════════════════════════════════════════
   PHRENOLOGIE
   ──────────────────────────────────────────────────────────────────
   CHRONOLOGIE (depuis enter()) :

   ══════════════════════════════════════════════════════════════════ */

  PHRENOLOGIE: {

    torch: {
      size:              0.22,   // Fraction de min(W,H) — torche intime, centrée sur le sujet
      grow_duration:     6000,
      fade_out_duration: 1500,
    },

    arrow: {
      // Flèche en HAUT, centrée sur X
      // Apparaît après que la torche soit suffisamment visible
      appear_at:        5500,   // ms depuis enter()
      draw_duration:    2200,   // Durée animation SVG (ms)
      hide_duration:     400,
    },

    docs: {
      // Boutons documents — coin haut-droit
      appear_at:        6000,   // ms depuis enter() — régler ici indépendamment

      // Dimensions
      width_vw:           16,   // Largeur (% viewport width)
      height_vh:           7,   // Hauteur (% viewport height)
      width_min:         120,
      width_max:         280,
      height_min:         36,
      height_max:         90,

      // Position
      right_pct:         3.5,   // Distance bord droit (%)
      top_pct:           3.2,   // Distance haut (%)
      gap_vh:            1.8,   // Espacement entre boutons (% vh)

      // Animation
      draw_duration:     850,   // Dessin SVG de chaque bouton (ms)
      hide_duration:     600,

      // Contenu
      labels:  ['Document 1', 'Document 2', 'Document 3', 'Document 4'],
      actions: [null, null, null, null],  // null = placeholder, 'collab' = aller Collaboration
    },

    navbar: {
      // Barre navigation — bas de l'écran
      appear_at:        7000,   // ms depuis enter() — régler ici indépendamment

      // Layout
      width:            0.80,   // Fraction largeur écran
      bottom:           0.05,   // Position bas (fraction hauteur)
      height:           0.08,   // Hauteur (fraction hauteur)

      // Style SVG
      stroke_color:     'rgba(255,255,255,0.80)',
      stroke_width:      0.8,
      draw_speed:        1.4,   // Vitesse dessin rectangle (s)
      sep_speed:         0.5,   // Vitesse séparateurs (s)
      sep_delay:         0.3,   // Décalage entre séparateurs (s)
      text_delay:        0.25,  // Décalage texte (s)
      text_fade:         0.4,   // Fondu texte (s)

      // Couleurs
      btn_font:          'Cinzel, serif',
      btn_color:         'rgba(255,255,255,0.85)',
      btn_color_hover:   'rgba(255,220,120,1)',
      btn_letter_spacing:'0.18em',

      // Contenu
      labels:  ['Carnet de Recherche', 'Collaboration', 'À Propos'],
      actions: [null, 'collab', null],  // 'collab' = aller Collaboration
    },

    timing: {
      bg_fade_in:         1200,
      pause_before_torch:  500,
      exit_black_pause:    10,
    },
  },


/* ══════════════════════════════════════════════════════════════════
   COLLABORATION
   ──────────────────────────────────────────────────────────────────
   CHRONOLOGIE (depuis enter()) :

   ══════════════════════════════════════════════════════════════════ */

  COLLABORATION: {

    torch: {
      size:              0.45,   // Torche large — espace ouvert
      grow_duration:     3000,
      fade_out_duration: 1500,
    },

    arrow: {
      // Flèche BAS-GAUCHE, pointe vers la gauche (retour phréno)
      appear_at:        4000,   // ms depuis enter()
      draw_duration:    2100,
      hide_duration:     400,
    },

    circles: {
      // Cercles romains I→V — apparaissent après la flèche
      appear_at:        5400,   // ms depuis enter() — arrivée normale
      appear_at_return: 1500,   // ms depuis enter() — retour depuis chapitre2 (plus rapide)

      stagger:           320,   // Décalage entre chaque cercle (ms)

      // Taille et position
      size_vh:            15,   // Diamètre (% hauteur viewport)
      gap_vh:              8,   // Espacement (% hauteur viewport)
      top_pct:            50,   // Position verticale centre (%)

      // Contenu
      labels:       ['I', 'II', 'III', 'IV', 'V'],
      hover_titles: ['Chapitre 1', 'Pourquoi Soliman el-Halabi aurait-il tué le général Kléber ?', 'Chapitre 3', 'Chapitre 4', 'Chapitre 5'],
      actions:      [null, 'chapitre2', null, null, null],
    },

    audio: {
      fade_out: 2000,  // Fondu sortie collaboration.mp3 (ms)
    },

    timing: {
      bg_fade_in:         1200,
      pause_before_torch:  600,
      exit_black_pause:    10,
    },
  },


/* ══════════════════════════════════════════════════════════════════
   CHAPITRE 2
   ══════════════════════════════════════════════════════════════════ */

  CHAPITRE2: {
    subtitle: 'Pourquoi Soliman el-Halabi aurait-il tué le général Kléber ?',
    debug:    false,

    /* ── Chapter2LightSystem — lumière fixe centrée ──────────────
    ──────────────────────────────────────────────────────────── */
    light: {
      // Phase intro (chapitre2.png) : lumière large et douce
      intro_frac:       0.90,   // Fraction min(W,H) — rayon initial
      intro_duration:   2200,   // Durée allumage depuis 0 (ms)

      // Phase interactive (chapitre2base.png + hotspots)
      interactive_frac: 0.95,   // Fraction min(W,H) — rayon interactif
      trans_duration:   2000,   // Durée transition intro → interactif (ms)

      // Pendant lecture media : lumière réduite
      media_frac:       0.42,   // Fraction réduite pendant le player
      media_duration:    800,   // Durée du dim (ms)
    },

    timing: {
      // Délai entre l'apparition de l'image chapitre2.png et le démarrage du son S-phrenologie.mp3
      phren_sound_delay:  4000,   // ms depuis l'ouverture du voile

      // Délai d'apparition du bouton "Passer" PENDANT S-phrenologie.mp3
      // 0 = apparaît dès le début du son, 5000 = après 5s de son
      skip_intro_delay:   1000,   // ms depuis le début du son S-phrenologie

      // Délai d'apparition du bouton "Passer" pendant le texte typing (phase outro)
      skip_btn_delay:     2000,   // ms depuis le début du typing
    },

    hotspots: [
      { img: 'himg-1', label: 'Langage',       l: 61, t: 40, w: 28, h: 35, media: 'Collaboration/Chapitre2/S1.mp3'        },
      { img: 'himg-2', label: '33',            l: 12, t: 41, w: 29, h: 37, media: 'Collaboration/Chapitre2/C2.mp3'        },
      { img: 'himg-3', label: 'Éventualité',   l: 46, t:  0, w: 22, h: 22, media: 'Collaboration/Chapitre2/S2.mp3'        },
      { img: 'himg-4', label: 'Individualité', l: 46, t: 22, w: 19, h: 26, media: 'Collaboration/Chapitre2/Emprise.mp4'   },
      { img: 'himg-5', label: 'Pesanteur',     l: 67, t: 18, w: 13, h: 22, media: 'Collaboration/Chapitre2/Theatre.mp4'  },
      { img: 'himg-6', label: '27',            l: 21, t:  5, w: 32, h: 23, media: 'Collaboration/Chapitre2/Defenseur.mp4'},
      { img: 'himg-7', label: 'Temps',         l: 72, t:  6, w: 20, h: 17, media: 'Collaboration/Chapitre2/Silence.mp4'  },
      { img: 'himg-8', label: '25',            l: 19, t: 23, w: 11, h: 20, media: 'Collaboration/Chapitre2/Klaxon.mp3'   },
      { img: 'himg-9', label: 'Nez',           l: 38, t: 62, w: 22, h: 22, media: 'Collaboration/Chapitre2/S3.mp3'       },
    ],
  },


/* ══════════════════════════════════════════════════════════════════
   AUDIO — Sons partagés
   ══════════════════════════════════════════════════════════════════ */

  AUDIO: {
    musee_vol:        1.0,
    fadeDuration:    3500,   // Fondu initial musée (ms)
    musee_fade:      2500,   // Fondu entre scènes (ms)

    phren_fade_in:   1800,
    phren_fade_out:  2200,
    phren_intro_delay: 1800,

    sanza_vol:       0.65,
    sanza_fade_in:   2000,
    sanza_fade_out:  1200,

    silence_vol:     0.75,
    silence_fade_in: 1200,
    silence_fade_out: 1800,

    collab_vol:      1.0,
    collab_fade_in:  2500,
    collab_fade_out: 2000,
  },


/* ══════════════════════════════════════════════════════════════════
   TITRE
   ══════════════════════════════════════════════════════════════════ */

  TITLE: {
    texte:       ['Abounaddara', '—', 'CNRS', '—', '2026'],
    couleur:     'rgba(210,175,90,1)',
    char_delay:   65,
    start_delay:  800,
  },

  TITLE_SWAP_MS: 620,


/* ══════════════════════════════════════════════════════════════════
   PLAYER MÉDIA
   ══════════════════════════════════════════════════════════════════ */

  PLAYER: {
    audio_w:           0.62,
    audio_h:           0.16,
    audio_bg_opacity:  0.35,
    wave_color:        'rgba(255,255,255,0.75)',
    wave_width:         1.5,
    audio_wave_h:      0.62,
    audio_wave_gap:    0.08,

    video_ratio:              0.95,
    video_bg_opacity:         0.75,
    video_min_w:              0.30,
    video_max_w:              0.80,
    video_scale_duration_ms:   700,
    video_scale_ease_power:    3.5,
    video_seek_h:             0.12,
    video_seek_thick:          1.2,

    media_inset:       0.0005,
    video_ctrl_h:      0.14,
    stroke:            'rgba(255,255,255,0.85)',
    draw_speed:         0.9,
    fade_out_ms:        950,
    fade_out_y:          18,
    btn_color:         'rgba(255,255,255,0.82)',
    btn_color_hover:   'rgba(255,220,120,1)',
    close_size:         0.028,
    close_delay:        0.5,

    torch_dim:          0.8,
    torch_ms:           800,
  },


/* ══════════════════════════════════════════════════════════════════
   ÉCRAN DE DÉMARRAGE
   ══════════════════════════════════════════════════════════════════ */

  START_SCREEN: {
    fadeOut: 1200,
  },


/* ══════════════════════════════════════════════════════════════════
   VIEWPORT MINIMAL
   ══════════════════════════════════════════════════════════════════ */

  MIN_SIZE: {
    width:  600,
    height: 450,
  },


/* ══════════════════════════════════════════════════════════════════
   ARROW — Taille de référence globale
   ArrowBase, NavigationBar, MediaPlayer, Fullscreen l'utilisent
   pour calculer leurs dimensions de façon cohérente.
   ══════════════════════════════════════════════════════════════════ */

  ARROW: {
    size_vh:   7,    // % de min(vW, vH)
    size_min: 36,    // px
    size_max: 120,   // px
  },


/* ══════════════════════════════════════════════════════════════════
   TORCH — Paramètres de rendu communs
   ══════════════════════════════════════════════════════════════════ */

  TORCH: {
    lag:            0.068,   // Latence curseur (0.01=lent, 0.2=rapide)
    // Les tailles de torche sont désormais dans chaque section de scène :
    // VITRINE.torch.size, PHRENOLOGIE.torch.size, COLLABORATION.torch.size
    // Ces valeurs legacy sont conservées pour rétrocompatibilité uniquement.
    taille_vitrine: 0.65,    // = VITRINE.torch.size
    taille_phren:   0.22,    // = PHRENOLOGIE.torch.size
  },


/* ══════════════════════════════════════════════════════════════════
   TYPOGRAPHIE
   ══════════════════════════════════════════════════════════════════ */

  FONTS: {
    title: {
      family:  'Cinzel, serif',
      size_vw:  1.1,
      size_min: 9,
      size_max: 18,
      weight:   400,
      spacing: '0.30em',
      style:   'normal',
      color:   'rgba(210,175,90,1)',
    },
    subtitle: {
      family:  'Cinzel, serif',
      size_vw:  0.75,
      size_min: 7,
      size_max: 13,
      weight:   400,
      spacing: '0.18em',
      style:   'normal',
      color:   'rgba(210,175,90,0.78)',
    },
    doc_btns: {
      family:  'Cinzel, serif',
      size_vw:  0.80,
      size_min: 8,
      size_max: 14,
      weight:   400,
      spacing: '0.18em',
      style:   'normal',
    },
    nav_btns: {
      family:  'Cinzel, serif',
      size_vw:  1.20,
      size_min: 12,
      size_max: 26,
      weight:   300,
      spacing: '0.18em',
      style:   'normal',
    },
    roman: {
      family:  'Cinzel, serif',
      size_vw:  1.6,
      size_min: 10,
      size_max: 28,
      weight:   600,
      spacing: '0.08em',
      style:   'normal',
    },
    hover_title: {
      family:  'Playfair Display, Cormorant Garamond, Georgia, serif',
      size_vw:  2.0,
      size_min: 14,
      size_max: 36,
      weight:   300,
      spacing: '0.06em',
      style:   'italic',
      color:   'rgba(255,255,255,0.82)',
    },
  },


/* ══════════════════════════════════════════════════════════════════
   TIMING — Partagé (animations titre)
   ══════════════════════════════════════════════════════════════════ */

  TIMING: {
    title_char_delay: 65,
    title_start:     800,
  },

};


/* ══════════════════════════════════════════════════════════════════
   ALIAS — Requis par les composants UI qui lisent encore
   config.DOCS, config.NAV et config.COLLAB directement.
   ══════════════════════════════════════════════════════════════════ */

window.CONFIG.DOCS = window.CONFIG.PHRENOLOGIE.docs;
window.CONFIG.NAV  = window.CONFIG.PHRENOLOGIE.navbar;

window.CONFIG.COLLAB = {
  torch_taille:    window.CONFIG.COLLABORATION.torch.size,
  circles_delay:   window.CONFIG.COLLABORATION.circles.appear_at,
  circles_stagger: window.CONFIG.COLLABORATION.circles.stagger,
  circle_size_vh:  window.CONFIG.COLLABORATION.circles.size_vh,
  circle_gap_vh:   window.CONFIG.COLLABORATION.circles.gap_vh,
  circle_top_pct:  window.CONFIG.COLLABORATION.circles.top_pct,
  labels:          window.CONFIG.COLLABORATION.circles.labels,
  hover_titles:    window.CONFIG.COLLABORATION.circles.hover_titles,
};

/* ══════════════════════════════════════════════════════════════════
   ALIAS CHAPITRE2 — Requis par TorchSystem.updateTarget()
   qui lit CONFIG.CHAPITRE2.torch_phren et torch_interactive (plat)
   ══════════════════════════════════════════════════════════════════ */

window.CONFIG.CHAPITRE2.torch_phren       = window.CONFIG.CHAPITRE2.torch.size_phren;
window.CONFIG.CHAPITRE2.torch_interactive = window.CONFIG.CHAPITRE2.torch.size_interactive;
window.CONFIG.CHAPITRE2.torch_media_dim   = window.CONFIG.CHAPITRE2.torch.size_media_dim;
