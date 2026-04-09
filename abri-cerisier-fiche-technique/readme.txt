=== Fiche Technique – Abri Cerisier ===
Contributors: abrifrancais
Author: Abri Français
Author URI: https://abri-cerisier.fr
Plugin URI: https://github.com/antonymorla/fiche-technique-wp
Tags: fiche-technique, abri, plan, svg, pdf
Requires at least: 5.9
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 2.1.0
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
