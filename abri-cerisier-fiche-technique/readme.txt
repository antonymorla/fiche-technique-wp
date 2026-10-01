=== Fiche Technique – Abri Cerisier ===
Contributors: abrifrancais
Author: Abri Français
Author URI: https://abri-cerisier.fr
Plugin URI: https://github.com/antonymorla/fiche-technique-wp
Tags: fiche-technique, abri, plan, svg, pdf
Requires at least: 5.9
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 2.6.0
License: Proprietary

Outil interne de génération de fiches techniques avec plans SVG et export PDF pour Abri Cerisier.

== Description ==

Plugin interne pour Abri Cerisier / Abri Français.

Fonctionnalités :
* Génération de plans SVG (plan de masse + 4 élévations)
* Export PDF complet avec pages d'options
* Gestion des menuiseries (portes, fenêtres, baies)
* Connexion à la médiathèque WordPress pour les images
* Proxy prix Google Sheets (cache 1 h)
* Récupération des données WAPF du configurateur

Accessible sur une URL cachée configurable dans Réglages → Fiche Technique.

== Installation ==

1. Téléchargez le ZIP depuis GitHub (Releases)
2. Extensions → Ajouter → Mettre en ligne
3. Activez le plugin
4. Allez dans Réglages → Fiche Technique pour configurer le slug

== Changelog ==

= 2.6.0 =
* Rendu réaliste des élévations (choix « Rendu des vues », technique toujours disponible) : textures de bardage d'après les visuels du site (madrier en lames de 14 cm avec angles croisés à 10 cm, sapin rouge vert/brun, Ayous, SRN gris, Douglas noir, Ayous aléatoire), couverture (bac acier, shingle noir/brun/vert, tuiles acier, EPDM QUADRO), pignons bardés et rives
* Menuiseries dessinées (bois, vitrage, ALU, volets, jardinière), portes de garage selon leur modèle, carports avec poteaux bois/alu, bandeau et fermetures bardés

= 2.5.1 =
* La page de l'outil n'est plus mise en cache par WP Rocket (DONOTCACHEPAGE)

= 2.5.0 =
* Dimensions sur mesure au centimètre (saisie libre en cm), arrondi de prix identique au configurateur du site
* Carport : la dimension saisie est le hors tout de la toiture ; poteaux = hors tout − 20 cm par côté libre ; intérieur = poteaux − sections (règle du configurateur du site, tous types de toit)
* Carport : option « adossé côté gauche / droit » (pas de débord ni de poteaux côté mur), poteaux en grille comme le site
* Carport : cote « H faîtage 2,46 m » jusqu'en haut du bandeau + cote « 2,10 m sous ferme » ; page 2 sans madrier ni pente en toit plat
* 35 menuiseries ajoutées (toutes celles des configurateurs abri et garage du site), portes ossature bardées H 186 cm
* 8 portes de garage du site, options volets décoratifs / battants / jardinière par ouverture, avec prix
* Corrections : fermeture « Fond » qui s'affichait aussi à droite, page 3 vide imprimée sans menuiserie, hachures hors du plan de masse, indications obsolètes du panneau

= 1.2.0 =
* Ajout du système de mise à jour automatique depuis GitHub
* REST API : médias WP, config WAPF, proxy prix Google Sheets
* Page de réglages améliorée

= 1.1.0 =
* Export PDF page 2 : images des options
* MPRESETS étendu à 34 menuiseries avec catégories
* Correction des cotes superposées

= 1.0.0 =
* Version initiale
