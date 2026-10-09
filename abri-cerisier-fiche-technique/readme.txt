=== Fiche Technique – Abri Cerisier ===
Contributors: abrifrancais
Author: Abri Français
Author URI: https://abri-cerisier.fr
Plugin URI: https://github.com/antonymorla/fiche-technique-wp
Tags: fiche-technique, abri, plan, svg, pdf
Requires at least: 5.9
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 3.0.2
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

= 3.0.2 =
* Visuel ancré (fenêtre réduite, tablette, téléphone) : photos de réalisation réservées au plein écran, hauteur limitée à l'écran (le bouton × reste toujours visible)
* CSS des configurateurs exclue de la minification WP Rocket (plus de copie périmée après une mise à jour)

= 3.0.1 =
* Vues côté égout (ossature, madrier, profils alu) : les planches d'angle et le contour du mur s'arrêtent au bas du toit et ne passent plus devant la couverture
* Extension de toiture vue de face : ses deux poteaux d'angle en pin autoclave vert sont dessinés

= 3.0.0 =
* Configurateurs de vente abri / garage / carport avec visuel en direct et devis PDF Cerisier (filtre wqg_quote_pdf), réglage « Configurateurs de vente » dans Réglages → Fiche Technique

= 2.7.0 =
* Retours de Bérénice du 09/10/2026
* Portes contemporaines bois : hauteur 186 cm, doubles en 160 cm, libellés « 3/4 vitrée », dessin à 4 panneaux (vitrés en haut, lames horizontales) comme les vignettes SketchUp du site
* Portes d'ossature bardées : bardage selon le modèle (Ayous aléatoire, noir ou gris ajouré, clin horizontal brun / vert / Ayous, clin vertical), contour, paumelles ou pentures, poignée
* Portes coulissantes : rail dessiné, choix du côté (gauche / droite), zone de coulissement sur les élévations et le plan ; ossature : rail intérieur ; alerte si la porte ouverte sort du mur ou recouvre une autre ouverture
* Nouvelles portes (sans prix au site, signalées) : Courchevel 3/4 vitrée 120×186, pleines 80×173 et 140×173
* Fenêtres double vitrage remises debout (60×75, 60×95, 120×95 en largeur × hauteur) ; plus de meneau sur les fenêtres contemporaines 120 et 200 ; petits bois sur les fenêtres classiques ; teintes des cadres d'après les vignettes du site
* Toiture 1 pan : côté haut = grand mur + rive (au lieu d'un faux toit plat de 39 cm), côté bas = pan visible sans acrotère, pour les deux sens de pente
* Carports : charpente apparente (entrait, arbalétriers, poinçon, contrefiches, pannes, jambes de force) en 1 et 2 pans ; vues 1 pan corrigées (le fond était dessiné sans miroir et les côtés en profil) ; « entre poteaux » (passage libre) affiché avec l'entraxe ; menuiseries possibles sur les côtés fermés
* Garages : portes basculantes d'après les vignettes du site (huisserie métal, lames, pointes, métallique anthracite à nervures) ; bardage Ayous aléatoire lisible
* Extensions (abri bûches) : fermeture pleine ou ajourée côté par côté et plancher extérieur, sur le plan et les élévations ; le toit vu de côté descend jusqu'au bord de l'extension
* Plan de masse : menuiseries des murs fond et gauche placées comme sur leurs élévations (elles étaient en miroir)
* Contrôles : menuiserie plus haute que le mur, qui dépasse du mur ou qui en chevauche une autre
* Prix indicatif : mention de ce qui n'est pas compté (options, débords, extensions, menuiseries sans prix) ; libellé des débords en cm corrigé

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
