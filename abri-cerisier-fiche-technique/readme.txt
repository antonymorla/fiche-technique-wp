=== Fiche Technique – Abri Cerisier ===
Contributors: abrifrancais
Author: Abri Français
Author URI: https://abri-cerisier.fr
Plugin URI: https://github.com/antonymorla/fiche-technique-wp
Tags: fiche-technique, abri, plan, svg, pdf
Requires at least: 5.9
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 3.3.0
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

= 3.3.0 =
* PORTES ET FENÊTRES DÉPLACÉES SUR LE DESSIN (demande d'Antony du 13/10/2026) : à la souris ou au doigt, sur les façades (le long du mur, par pas de 10 cm, à 10 cm au moins des angles ; une fenêtre glissée vers le haut ou le bas change de hauteur, par pas de 5 cm) et sur le plan (d'un mur à l'autre). Les règles de place restent les mêmes (jamais l'une sur l'autre). Une main animée montre le geste la première fois ; la page ne défile pas quand on tient une menuiserie au doigt.
* CHOIX GARDÉS QUAND ON CHANGE UNE OPTION EN AMONT : passer d'ossature à madrier (ou de 2 pans à toit plat, etc.) ne vide plus le reste de la configuration. Les réponses des questions qui disparaissent sont notées et recochées quand elles reviennent, ou sur la question jumelle de l'autre système ; un modèle qui n'existe pas dans l'autre système est remplacé par le plus proche, avec un message ; la nouvelle question qui bloquait la suite (épaisseur des madriers, orientation) reçoit le choix le moins cher, avec un message. Une pente choisie (25°) n'est plus écrasée par le 14° par défaut d'une autre toiture.
* CARPORT, HAUTEUR DE PASSAGE EN VIGNETTES (comme la rehausse des abris) : 2,10 m (inclus), 2,50 m, 3,00 m, 3,70 m, 4,80 m, chacune avec un véhicule à l'échelle (voiture, utilitaire, fourgon aménagé, camping-car, engin) et son prix lu dans le champ du site, plus une hauteur sur mesure au centimètre. La hauteur choisie suit quand on change de poteau.

= 3.2.15 =
* DONNÉES DES CONFIGURATEURS (décisions d'Antony du 13/10/2026, appliquées par un module à usage unique, sauvegarde cer_fix_lot2_sauvegarde) : pente 14° gratuite et cochée d'office (18° gratuite, 25° et 35° payantes comme avant) ; bac acier sur les 1 et 2 pans (abri et garage : seul, sous-toiture, panneaux isolés 40/60/80 ; carport : seul, sous-toiture, feutre anti-condensation), au m² de toiture réelle (pente comprise) ; carport : plots béton + pieds galva cumulables ; images des fenêtres fixes sur ossature remises à l'endroit.
* PLAN : plot béton dessiné sous le pied galva quand les deux sont choisis.

= 3.2.14 =
* PANIER BLOQUÉ (depuis la 3.2.1) : les questions « hauteur des murs » et « extension de toiture », obligatoires et remplacées par des dessins, n'étaient pas vraiment cochées ; le navigateur refusait l'ajout au panier sans rien montrer. « Standard » et « Non » sont désormais cochés d'office, et une question obligatoire oubliée est amenée à l'écran avec un message.
* VUE 3D : sous Safari, façades redessinées jusqu'à ce que les photos de bois soient prêtes (bardage noir et blanc une fois sur deux) ; fermetures du carport entre les poteaux, poteaux intermédiaires visibles ; bandeau du carport plat = bandeau choisi ; toit plat de l'abri : pannes perpendiculaires à la pente et dessous de la couverture visible (bac blanc, OSB ou planchettes seulement en option).
* MENUISERIES : placées d'office sans se chevaucher, en rangeant côte à côte celles que le client n'a pas déplacées (porte de 80 + fenêtre de 53,5 sur 2 m) ; une fenêtre peut passer sous le rail d'une porte coulissante.
* EXTENSION : profondeur tapée au clavier (1,10 ou 110), en plus des boutons − / +.
* « Comparer les options » ne chevauche plus les cartes.

= 3.2.13 =
* HAUT DES CONFIGURATEURS (maquette validée par Antony) : vrai titre (« Configurez votre abri de jardin sur mesure »), une phrase et quatre repères ; étape 1 marquée « Commencez ici » avec un schéma largeur / profondeur ; panier, « Voir en 3D » et « Voir mon abri » attendent les dimensions ; plus de case vide, de partage, de SKU, d'étiquettes du thème ni de description courte (celle du garage annonçait un configurateur « en cours de développement ») ; sur téléphone, largeur et profondeur l'une sous l'autre.
* CARPORT 1 PAN : contre-fiche centrale du pied du poteau haut au milieu de la pente (demi-ferme), en 3D et sur le plan.
* JAMBES DE FORCE (règle d'Antony) : toujours, poteaux bois, capotés alu ou alu ; seule exception la charpente en lamellé-collé (QUADRO, écartement « Max 6 m lamellé-collé »).
* SOUS-FACE DU CARPORT en 3D d'après la couverture : bac acier seul = charpente et tôles ; « + sous-toiture planchette » et shingle = planchettes au-dessus de la charpente ; OSB ; feutre. Toit plat : plafond au niveau du bandeau seulement avec l'option planchettes « intégration spots », sinon pannes et tôles.
* TOIT PLAT EN MADRIERS : message aux cotes de Bérénice (l'extérieur du bardage fait 17 cm de moins que la dimension choisie).
* VUE 3D : le sol ne clignote plus (dalle et ombre de contact n'étaient plus à la même hauteur), herbe moins scintillante.

= 3.2.12 =
* CARPORT : les champs de calcul « Largeur hors tout (Copy) » et « Profondeur hors tout (Copy) » (classe non2) ne s'affichent plus ; ils se superposaient au titre de l'étape 1.

= 3.2.11 =
* CONFIGURATIONS HORS STANDARD (demande d'Antony) : au-delà d'une hauteur au faîtage réglable (Réglages → Fiche Technique ; 3,80 m pour l'abri et le garage, 4,20 m pour le carport ; 0 = pas de message), le panneau du plan prévient le client : il peut commander, mais la commande passera par le bureau d'études, qui se réserve le droit de l'adapter si elle n'est pas réalisable techniquement.

= 3.2.10 =
* « Voir en 3D » avant d'avoir choisi les dimensions : un message sous le bouton (« Choisissez d'abord les dimensions… ») au lieu de ne rien faire, sur les trois configurateurs.

= 3.2.9 =
* CARPORT EN 3D pour tous les visiteurs (validé par Antony le 13/10/2026), dans le dossier mairie de l'équipe et dans le devis (deux vues 3D). Charpente relevée sur nos carports posés :
  * 2 pans : ferme à poinçon à chaque rangée de poteaux (entrait, arbalétriers sous les pannes, poinçon jusqu'à la faîtière, deux contrefiches) ;
  * 1 pan : ferme à chaque rangée (entrait, poteau haut d'une seule pièce jusqu'à l'arbalétrier, jambe de force, montant sur un poteau intermédiaire) ; adossé, l'arbalétrier repose sur le mur ;
  * côtés d'égout sans bandeau, gouttière apparente ; rives de 26 cm sur les côtés en pente ; planche au faîte du 1 pan (sauf contre le mur).
* PLANS 2D DU CARPORT alignés sur la 3D : ferme à poinçon, ferme 1 pan, gouttière apparente, plus de « bandeau d'égout ».
* TOIT PLAT DE L'ABRI (règle d'Antony) : bandeau droit de 26 cm (2 lames), 39 cm seulement si la pente de 5 % n'y tient pas (plus de 4,20 m dans le sens de la pente) ; pente à l'intérieur du bandeau, gouttière cachée derrière le bandeau bas, seule la descente se voit. Même hauteur dans le plan 2D. Carport toit plat : 36 cm, inchangé.
* VUE 3D : les bouts de madriers ne sortent plus plus clairs que les lames (le reflet du ciel est réglé pareil sur toutes les pièces) ; la hauteur compte dans le cadrage.
* DOSSIER MAIRIE : si la vue 3D ne peut pas se faire sur l'appareil, un cadre « photomontage à coller » remplace l'insertion, quel que soit l'ouvrage.

= 3.2.8 =
* TOIT PLAT (règle d'Antony) : la couverture a toujours une pente, 5 % au moins, vers le côté choisi ; le bandeau (3 lames de 13 cm) la cache, effet toit plat ; gouttière du côté bas si elle est prise ; au-delà d'environ 4,8 m de profondeur (chute plus grande que le bandeau), bandeaux de côté en pente et bandeau haut plus haut.
* VUE 3D :
  * teintes du bois homogènes entre bardage, bandeaux et bouts de madriers (lumière du ciel renforcée, soleil adouci, bois de bout à la teinte des lames) ;
  * fenêtres et portes vitrées : on voit l'intérieur à travers la vitre, avec un reflet (vitres acidifiées toujours opaques) ;
  * pelouse en relief : brins d'herbe dessinés par le navigateur, rien à télécharger, moins dense sur téléphone, jamais dans l'abri.
* DEVIS : deux vues 3D (3/4 avant et 3/4 arrière) en plus des vues 2D, faites par le navigateur au moment de l'ajout au panier (12 s au plus, sinon devis sans elles ; la 3D n'est toujours pas chargée d'avance).
* PHOTOS HEIC (iPhone) acceptées pour le montage photo et le dossier : lues telles quelles par Safari, converties en JPEG ailleurs (bibliothèque chargée seulement à ce moment, depuis cdnjs).

= 3.2.7 =
* EXTENSIONS (règle d'Antony) : dans la pente (côtés gauche et droit d'un 2 pans, côté bas d'un 1 pan), l'extension garde au moins 1 m de poteau. Profondeur au plus affichée sous chaque côté, « + » bloqué au-delà, valeur trop grande ramenée avec un message qui conseille une rehausse. Exemple : garage 2 pans à 25°, 2,50 m au plus (3,50 m à 18°).
* Le correctif de l'en-tête mobile passe dans le CSS additionnel du thème (tout le site).

= 3.2.6 =
* DOSSIER MAIRIE RÉSERVÉ À L'ÉQUIPE (décision d'Antony, crainte de la concurrence) : le bouton n'apparaît qu'aux personnes connectées au back-office (droit « edit_posts » : administrateurs, gestionnaires, éditeurs ; jamais les comptes clients), et le point d'entrée refuse les autres. Nouveau réglage « Dossier mairie » : l'équipe seulement (par défaut) / tous les visiteurs / personne.
* La vue 3D peut passer à tous les visiteurs : les pannes du 13/10 ne venaient pas du module (analyse des journaux d'accès sur 2 mois).

= 3.2.5 =
Corrections trouvées par la campagne de tests du 13/10 (80 parcours 3D au hasard, 15 dossiers mairie sur 10 adresses, 9 appareils et navigateurs, sur les pages enregistrées et rejouées hors ligne).
* CARPORT : la vue 3D n'a pas encore de poteaux ni de charpente (le toit flottait) : bouton « Voir en 3D » retiré sur le carport ; son dossier mairie garde toutes les pièces, avec un cadre pour le photomontage à la place de la vue 3D.
* QUADRO AVEC EXTENSION : une seule toiture plate, couvertine sur le tour extérieur seulement (le toit de l'abri apparaissait en creux sous celui de l'extension).
* DOSSIER MAIRIE :
  * parcelle introuvable (adresse sans numéro, lieu-dit, point posé sur la rue ou la place, 3 adresses sur 10 dans les essais) : le client touche sa parcelle sur la carte, et peut aussi corriger une parcelle mal trouvée ; l'abri vient se poser dessus ;
  * « l'garage », « l'carport » et « l'abri » écrit pour un garage ou un carport (formulaire, photos, PDF) : corrigé ;
  * suggestions d'adresse protégées contre une réponse lente qui écrasait une saisie plus récente ;
  * tuile IGN refusée un instant : un second essai au lieu d'une case grise ;
  * permis de construire au-delà de 150 m² de surface de plancher : rappel de l'obligation d'architecte (R.431-2).
* TÉLÉPHONE :
  * la page glissait de 5 px de côté (en-tête mobile du thème) : corrigé sur les configurateurs ;
  * guide comparatif ouvert sur un téléphone de 320 px : le tableau défile dans son cadre au lieu d'élargir toute la page ;
  * téléphone couché : le panneau du montage photo ne cache plus « Valider le montage ».
* PLAN 2D : plus de hauteur négative quand le bord d'une extension descend sous le sol (grande extension sur une pente forte).

= 3.2.4 =
* SÉCURITÉ des 2 points d'entrée publics (revue complète avant l'ouverture à tous) :
  * ils ne répondent plus qu'aux pages du site (contrôle d'origine) ;
  * dépôt AR : vrais formats vérifiés (GLB glTF 2, USDZ non compressé avec la scène en premier), 25 Mo par fichier, tout est vérifié avant d'écrire, plafond de 150 dépôts et 3 Go par jour pour tout le site, limite par visiteur avec IPv6 regroupée par /64 ;
  * dossier : 16 Ko par demande, email borné, lien « Configurateur » limité aux pages du site, 300 par jour au plus, même client dans les 24 h = dossier mis à jour (plus de doublons) ;
  * RGPD : dossiers lisibles par les administrateurs et gestionnaires de boutique seulement, effacés 3 ans après leur dernière mise à jour, pris en compte par Outils → Exporter / Effacer les données personnelles ;
  * jsPDF et le générateur de QR chargés avec contrôle d'intégrité.
* RÉALITÉ AUGMENTÉE : le GLB envoyé au serveur par Android passe de 12 à 23 Mo à moins de 1 Mo (les pièces du toit étaient recopiées dans le fichier, textures en JPEG).
* MENUISERIES ASSORTIES : un modèle retrouve son équivalent quel que soit l'ordre des mots (« acidifié 110x186 cm autoclave vert » = « acidifié ayous 110x186 cm ») ; si le modèle n'existe pas dans la teinte du bardage, un message le dit au client, rien n'est décoché dans son dos.
* U DE FINITION (profil validé par Antony) : 40 mm de large, 20 mm sur les lames, fond 10 mm, coins extérieurs arrondis, un U au bout de chaque mur ; en 3D en vrai profil, sur le plan en bande de 3 cm (de profil) et de 4 cm (de face).

= 3.2.3 =
* PORTES ASSORTIES (règle d'Antony) : une porte ou une fenêtre en bois sans teinte précisée (porte en Z, modèles classiques bois, fenêtres fixes à cadre vert) prend la teinte du bardage autoclave brun, gris ou noir, sur le plan et en 3D. Sur un bardage vert, en ayous ou en madrier : autoclave vert, comme avant.
* VUE 3D (module toujours désactivé) : les portes reçoivent la texture photo du bois (elles étaient dessinées en aplat) ; autoclave brun refait à partir de la photo du pin vert, recolorée sur la teinte du brun « modifié » du dossier Textures.
* TÉLÉPHONE : vue 3D cadrée en entier sur un écran en hauteur, vues sur une ligne qui défile au doigt, actions dessous ; dossier mairie en plein écran, titre qui ne passe plus sous la croix, abri facile à attraper au doigt sur la carte (la marge de prise faisait 8 px sur un téléphone) ; PDF ouvert par un bouton à toucher, avec « Enregistrer ou envoyer » (Fichiers, mail) quand le téléphone le permet. Vérifié sur Safari iPhone 13 et Chrome Android.

= 3.2.2 =
* MENUISERIES ASSORTIES AU BARDAGE (règle d'Antony, réglage « Menuiseries bois assorties au bardage », activé) : une porte ou une fenêtre en autoclave d'une autre teinte que le bardage n'est plus proposée (vert, brun, gris, noir, ayous) ; alu, PVC et modèles sans teinte restent. La menuiserie cochée passe au même modèle dans la bonne teinte (ex. porte verte cochée par défaut sur un abri brun → porte brune). Vérifié : abri ossature brun.
* VUE 3D (module toujours désactivé) : rives, bandeaux, tableaux et fermetures d'extension dans la teinte du bardage ; poteaux et structure en autoclave vert. Vue 3D téléchargée seulement au clic (la page n'emporte plus cer-vue3d.js), abri qui se construit pendant le chargement, fenêtre en plein écran.

= 3.2.1 =
* STABILITÉ : le module « Vue 3D et dossier mairie » n'est plus chargé du tout quand le réglage est sur « Désactivé ». Il est désactivé depuis le 13/10/2026 à 12h40, après deux pannes 500 du site (10h00-10h15 et 12h20-12h31) qui ont cessé chaque fois qu'il ne l'était plus. Cause non établie : journal des erreurs fatales et des requêtes lentes ajouté (mu-plugin cer-journal-erreurs.php, wp-content/cer-journal/).
* VIGNETTES : boutons − / + plus visibles et qui ne débordent plus (2 colonnes si la place manque) ; toucher un côté d'extension met 1 m d'office ; la carte « Oui » montre l'extension choisie.
* U DE FINITION (règle d'Antony) : ce sont des U en bois qui coiffent le bout des madriers aux angles, dessinés en bois au lieu de l'aluminium.
* VUE 3D (module désactivé pour l'instant) : bouts de madriers qui dépassent de 10 cm aux angles (bois de bout), U en bois si l'option est prise ; shingle recomposé à l'échelle (bardeaux de 33 cm, rangs de 14,3 cm) sans motif qui se répète.

= 3.2.0 =
* VIGNETTES (pour tous, validées par Antony le 13/10/2026) :
  * extension de toiture en dessins : oui ou non, profondeur de chaque côté avec − / +, côtés fermés vus de dessus en orange ;
  * hauteur des murs choisie sur le dessin : rehausses en orange, silhouette de 1,75 m, prix calculé par la formule du site ;
  * barre de progression « Étape X sur N », qui reste visible en haut ;
  * message des 20 cm du toit plat montré seulement aux toits plats en madriers, avec les dimensions hors tout.
  * Les champs du site restent la seule source des prix : ils sont cachés et remplis par les vignettes. Contrôlé : même prix par les vignettes, par les champs et au panier (abri 6 767,12 €, garage 6 901,80 €, ordinateur et téléphone). Une extension non fermée répond « Non » d'elle-même à la question obligatoire « fermer cette extension ? ».
* TEXTES : titres et textes d'aide corrigés dans la configuration WAPF (accents, « bûcher », « côtés », « Quelle orientation »…), par un correctif à usage unique avec sauvegarde (option cer_fix_textes_sauvegarde). Les libellés des choix ne sont pas modifiés, car ils servent à reconnaître les menuiseries.
* VUE 3D (lien privé) :
  * bardages brun, gris, noir et ayous en bois photographié (textures du dossier « 4• Textures ») ;
  * intérieur : face intérieure des madriers, ou ossature 45×70 tous les 60 cm (lisses, sablière, linteaux, appuis, montants de pignon) avec pare-pluie, laine de roche, ou doublage OSB, contreplaqué (texture tripli) ou lambris sapin selon les options choisies ; plancher ou dalle ;
  * charpente en pannes perpendiculaires aux pignons (faîtière, au plus 1 m entre pannes), avec ferme intermédiaire au-delà de 5 m de portée ;
  * bouton « Intérieur » qui soulève la couverture.
* PHOTO DU JARDIN : champ fichier rattaché à la page (iPhone), photo ramenée à 2 400 px. L'abri se glisse au doigt sur le sol, se tourne et se règle en taille (pincement ou curseurs), avec la hauteur de vue et le soleil.
* DOSSIER MAIRIE : la carte de la parcelle se cadre sur la parcelle entière, se déplace et se zoome (glisser, deux doigts, molette, boutons). L'abri se déplace à part, avec les parcelles voisines rechargées en chemin.

= 3.1.1 =
* RÉALITÉ AUGMENTÉE (iPhone) : le toit manquait et les murs de côté apparaissaient noirs dans Quick Look (le format USDZ ignore les pièces à plusieurs matières et n'affiche qu'une face). Les pans de toit sont découpés par matière et chaque surface reçoit ses deux faces à l'export. Contrôlé avec la bibliothèque USD officielle (pxr) : toit présent, murs à double face, aucune pièce déplacée
* RÉALITÉ AUGMENTÉE : l'abri s'ouvre à sa taille réelle mais peut être réduit ou agrandi au pincement (il revenait à 100 %)
* DOSSIER MAIRIE : logo Abri Cerisier (fichier officiel, version blanche) en couverture et en tête de chaque page ; PDF allégé (1,4 Mo au lieu de 18 Mo : plans en JPEG, images communes stockées une fois)

= 3.1.0 =
* MENUISERIES : deux menuiseries ne peuvent plus se superposer, ni chevaucher la porte de garage (réservée au milieu de la façade). Celle que le client vient de déplacer reste où il l'a mise si la place est libre ; sinon elle glisse à la place libre la plus proche, puis sur un autre mur avec un message. S'il n'y a plus de place nulle part, le panneau le dit
* VUE 3D (lien privé : ajouter ?apercu=3d à l'adresse du configurateur, réglage « Vue 3D et dossier mairie » : désactivé / test / tous) : bouton « Voir en 3D » dans le panneau. Murs, portes et fenêtres dessinés par le moteur du configurateur, bois photographié (texture pin autoclave vert des modèles SketchUp, nœuds placés au hasard), couvertures des modèles SketchUp (shingles, tuiles, bac acier), poteaux massifs au fil continu, gouttières demi-rondes RAL 7016 des deux côtés avec descente coudée contre le mur, QUADRO avec membrane EPDM 5 cm sous l'acrotère et sortie coudée Ø 12 cm. Réalité augmentée (iPhone : Quick Look ; Android : Scene Viewer ; ordinateur : QR code) et montage sur une photo du jardin
* DOSSIER MAIRIE (même lien privé) : coordonnées obligatoires (nom, prénom, téléphone, email, adresse du terrain), enregistrées dans le menu « Dossiers mairie » de l'administration, aucun mail automatique. Parcelle cadastrale trouvée seule (API Carto IGN), implantation de l'abri sur la photo aérienne avec distances aux limites, PDF : DP1 à DP8 (ou PCMI1 à PCMI8 au-delà de 20 m²) — situation, masse, coupe cotée, notice, façades, vue de dessus, insertion, photos
* 3D : sur le côté de l'égout, le mur monte jusqu'au toit même quand le bord d'une extension le masque en élévation 2D

= 3.0.9 =
* PRIX : une dimension sur-mesure hors des bornes du champ (ex. profondeur sous 2 m, sans prix dans les grilles) n'affiche plus de prix : le panneau indique « Profondeur : 2 m minimum » et le navigateur le signale dès la saisie. Le panier la refuse (minimum posé dans les champs WAPF le 12/10/2026, réglable dans « Minimum »)
* Le prix du panneau est tenu à jour même quand le dessin ne peut pas se faire (jamais un ancien prix affiché)

= 3.0.8 =
* PRIX : une question masquée par les conditions du formulaire (ex. extension saisie puis « NON ») gardait sa valeur et le formulaire la comptait encore dans le prix affiché, alors que le panier l'ignore (garage 7,5 × 3 affiché 9 659 € au lieu de 8 196,50 €). Ses saisies sont désormais effacées : prix affiché = prix du panier

= 3.0.7 =
* Carport : une fermeture se dessine entre les poteaux (toujours visibles devant) et monte jusqu'en haut, sous la rive ou le bandeau (pignon fermé sur un 2 pans, pente suivie sur un 1 pan) ; la fermeture d'en face, vue à travers un côté ouvert, aussi
* Fenêtres : hauteur réglable dans « Placer mes portes et fenêtres » (allège en cm, haut de la fenêtre) ; une fenêtre sous la course d'une porte coulissante passe automatiquement sous le rail
* Photos de réalisations : fichiers « ChatGPT-Image… » écartés (271 photos, 198 ouvrages)

= 3.0.6 =
* CORRECTIF PRIX : le total brut des calculs du site (« 8730.288 € », point décimal et 3 décimales) était lu comme 8 730 288 € dans le panneau (carports à plusieurs millions) ; lecture des montants corrigée (panneau, pastilles, détail, devis PDF) ; garde-fou : un total au-delà de 200 000 € n'est jamais affiché

= 3.0.5 =
* Photos de réalisations : audit image par image (303 photos) avec les valeurs du configurateur — toiture, système, bardage et teinte, couverture, portes et fenêtres, extension, gouttière, porte de garage, poteaux / bandeau / fermeture du carport, taille ; 274 vraies photos retenues (images IA, rendus, montages, vues intérieures, studios et ouvrages repeints écartés)
* Choix de la photo : ressemblance sur tous ces critères, seulement pour les options réellement choisies ; trois ouvrages différents ; ligne « En commun avec votre projet »

= 3.0.4 =
* Vignettes d'options plus grandes à côté du visuel : jamais moins de 120 px (images de 32 à 110 px pour Type / Matière / Style), libellés sans coupure de mots ; Type sur une ligne, Matière et Style côte à côte

= 3.0.3 =
* Devis : « dont éco-participation » (le libellé du générateur commence déjà par « Dont », il était doublé)

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
