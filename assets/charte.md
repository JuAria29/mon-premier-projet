# Charte graphique — Aria Coach

## Logo
- Fichier principal : `assets/logo.png`
- Icône : `assets/logo-icon.png`
- Marque : "Aria" + "Coach" — le mot "Coach" en accent terracotta

## Palette de couleurs
- Accent principal : #b5612f — terracotta / cuivre
- Accent fort : color-mix(#b5612f 80%, black) — pour les états actifs
- Accent doux : color-mix(#b5612f 12%, white) — arrière-plans subtils
- Fond : oklch(0.985 0.005 75) — blanc chaud légèrement teinté
- Surface : #ffffff — cartes et panneaux
- Surface 2 : oklch(0.972 0.006 75) — fonds secondaires
- Bordure : oklch(0.918 0.006 70)
- Texte principal : oklch(0.28 0.014 60) — brun foncé chaud
- Texte doux : oklch(0.37 0.012 60)
- Texte atténué : oklch(0.545 0.012 60)
- Info (bleu) : oklch(0.52 0.085 245)
- Violet : oklch(0.52 0.1 295)
- Succès (vert) : oklch(0.55 0.085 155)

## Typographie
- Police unique : Plus Jakarta Sans — Google Fonts
- Graisses utilisées : 400 (normal), 500, 600, 700, 800 (titres)
- Style : antialiased, optimisé pour la lisibilité

## Style
Sobre, professionnel, chaleureux

## Composants clés
- Rayon de bordure : 16px (cartes), 11-13px (boutons/nav), 999px (badges/pills)
- Ombres : légères, chaudes (rgba 40,30,20)
- Icônes : line icons, strokeWidth 1.8, style épuré
- Densité : 3 modes (compact / regular / comfy) via --gap variable

## Maquettes
Prototypes disponibles dans : `../../../coach design/project/`
- `Aria Coach.html` — prototype principal complet
- `app.jsx` — logique principale
- `dashboard.jsx` — dashboard central
- `soir.jsx` — session soir
- `pages.jsx` — toutes les pages
- `settings.jsx` — personnalisation coach
- `ui.jsx` — composants partagés (icônes, Ring, Bar, badges)
