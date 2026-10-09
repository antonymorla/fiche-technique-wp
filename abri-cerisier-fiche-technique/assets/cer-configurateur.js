/*!
 * Visuel en direct des configurateurs Abri Cerisier (abri, garage, carport).
 * Lit les choix du configurateur du site (WAPF), dessine l'abri avec le moteur du générateur de plan (CerPlan),
 * affiche la fiche technique avec les cotes calculées comme le site, et joint les vues au panier pour le devis.
 * Réglages fournis par le plugin : window.CER_CFG = { kind: 'abri' | 'garage' | 'carport', version }.
 */
(function () {
  'use strict';
  var CFG = window.CER_CFG || {};
  if (!window.CerPlan || !CFG.kind) return;
  var E = window.CerPlan, ST = E.ST;

  // ── Champs des configurateurs (identifiants WAPF relevés sur les pages du site) ──
  var MAPS = {
    abri: {
      lar: { sm: 'abd0e3e', sel: '3d0c5fd', num: 'ea2e8b7' }, pro: { sm: '2b198c4', sel: 'f5301a4', num: 'ceb97a0' },
      toit: ['ab05175'], orient: ['65ad968', 'e14f4f0'], pente: ['d345f3d', '316d1b5'], sys: ['3ec5448'], ep: ['5b29cdd'],
      bard: ['cfad244', '6c48ecc', '1e0e5a2', 'fa4ccc4'], couv: ['feabbf9', '3fa0fbb', '42f2a4f'], gout: ['ee8bcb3'],
      reh: { q: '4cfda5e', n: 'af57fcc' }, plan: ['d85fc32'], pign: ['5ed03dc'], profu: ['3869f3f'], soub: ['fd182b9'],
      ext: { q: '2a21884', m: { fond: '332ab45', gauche: 'fb3dce9', droite: '4dbeea3', face: '417e37c' },
        rq: { face: '8e6cf2b', fond: 'f0ec21a', gauche: 'fadfe0f', droite: '8aa219a' },
        rs: { face: '50e0fac', fond: '0a1e6b8', gauche: '3ffcfa1', droite: '95db202' }, type: ['2fdae02', 'fb4fb2c'] },
      pext: { q: 'd7e07ef' },
      men: { type: 'ae1b55e', specific: ['ea71efa', 'fc21333', 'e583b9f', '5955c88', 'da2562f', '91dfcf4', '84ddbca', 'c0df40d', '41dbb3d', '1fd6c5b', 'bbc4dca', '23affe1'],
        opt: ['d86e030', '8fe32da'], garage: null }
    },
    garage: {
      lar: { sm: '54eee0e', sel: 'ae1de82', num: '3ef605e' }, pro: { sm: '24e5c52', sel: 'a1d354f', num: 'ab80f95' },
      toit: ['e0656df'], orient: ['0813bd0', '8eca213'], pente: ['deffd3c', 'ebef2f6'], sys: ['eceeadb'], ep: ['dbbbb52'],
      bard: ['4a06bf9', '2a3b113', '5bfec13', '5a0e9f2'], couv: ['d1ac115', 'a72f0f0', '32350ae'], gout: ['fa9b171'],
      reh: { q: '1d54ffa', n: '02eefe8' }, plan: ['629bcda'], pign: ['f1d4e6f'], profu: ['d71daf3'], soub: ['478fa40'],
      ext: { q: 'c13ccea', m: { fond: 'fd1f800', gauche: 'dac3caf', droite: '74ec3e5', face: 'ae31213' },
        rq: { face: 'f40cca6', fond: '7c29fac', gauche: '1e23fe8', droite: '5cee052' },
        rs: { face: 'c4b422c', fond: '51bea7d', gauche: 'a7403ef', droite: 'eace337' }, type: ['a326aeb', 'acfbece'] },
      pext: { q: 'a3fda0a' },
      men: { type: '4fa82ea', specific: ['b4f2bdc', '0aa34c0', 'a154c3e', '0dd9ae4', '7f72ea9', '5ae35e5', 'e4ea58b', 'baa8b15', '6bbd4d4', 'd504110', 'dc7ffad', 'adb330a'],
        opt: ['abd0fbd', '2c9edd0'], garage: '9dfacda' }
    },
    carport: {
      lar: { sm: '6a0b809', sel: '05254a4', num: '1196d7b' }, pro: { sm: '3d89f71', sel: 'baec4ce', num: '8be1c4f' },
      ados: ['1ce6f02'], toit: ['a14d4e4'], bandeau: ['afcef0a'], orient: ['02a009e', 'ee27fe6'], pente: ['eef52ce', '1604e95'],
      pot: ['25251c8'], espL: ['29ccded'], espP: ['2199535'], reh: { q: 'd292e23', n: ['bff5905', '1049eb0', 'e99494f'] },
      clos: { q: '71bc1a9', sides: '15b2a59', type: ['9ccc9e2', 'a3d30ce'] }, couv: ['2dc93ac', 'b12bc55'], gout: ['b9ea023'], supp: ['75b3e36']
    }
  };
  var M = MAPS[CFG.kind];
  // Réalisations : vraies photos de pose des modèles préconçus du site (première photo de chaque fiche), avec leurs caractéristiques
  // k = abri / garage / carport, t = toit, s = système, b = bardage, L × P = dimensions, c = légende, u = fiche, p = photo
  var REAL = [{"k":"abri","t":"QUADRO","s":"ossature","b":"bac","L":null,"P":null,"c":"Abri QUADRO · ossature bois · bardage bac acier","u":"https://abri-cerisier.fr/produit/abri-de-jardin-quadro-ossature-bois-bardage-bac-acier","p":"https://abri-cerisier.fr/wp-content/uploads/2026/04/ChatGPT-Image-15-avr.-2026-a-16_38_52-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":null,"P":null,"c":"Carport toit plat","u":"https://abri-cerisier.fr/produit/carport-faux-toit-plat-6-50-m-x-6-m-destockage-modele-neuf-en-stock","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/carport-TP-3X6-Poteaux-19-660x440.png"},{"k":"abri","t":"QUADRO","s":"ossature","b":"","L":3.5,"P":3.0,"c":"Abri QUADRO · ossature bois · 3,5 × 3 m · avec abri bûches","u":"https://abri-cerisier.fr/produit/abri-bois-moderne-quadro-350-x-3-m-abri-buches-destockage","p":"https://abri-cerisier.fr/wp-content/uploads/2026/04/IMG_9526-660x495.jpeg"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":3.0,"P":6.0,"c":"Carport 3 × 6 m · bandeau Clin 28mm · poteaux bois 12x12cm","u":"https://abri-cerisier.fr/produit/carport-6x6m-poteaux-bois-12x12cm-bandeaux-clin-28mm-2","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/ChatGPT-Image-14-oct.-2025-a-16_06_20-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":6.0,"P":6.0,"c":"Carport 6 × 6 m · bandeau Clin 28mm · poteaux bois 12x12cm","u":"https://abri-cerisier.fr/produit/carport-6x6m-poteaux-alu-15x15cm-bandeaux-acier-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/ChatGPT-Image-14-oct.-2025-a-16_19_07-660x660.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":6.0,"P":6.0,"c":"Carport 6 × 6 m · bandeau Acier ral 7016 · poteaux alu 15x15cm","u":"https://abri-cerisier.fr/produit/carport-6x6m-poteaux-bois-exo-17x17cm-bandeaux-clin-28mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/05/IMG_4077-660x396.jpg"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"ayous","L":6.0,"P":6.0,"c":"Carport 6 × 6 m · bandeau Ayous vertical section aléatoir · poteaux bois capoté alu 12x12cm","u":"https://abri-cerisier.fr/produit/carport-6x6m-poteaux-bois-exo-17x17cm-bandeaux-ayous-vertical-section-aleatoir","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/CARPORT-6X6-POTEAUX-CAPOT-ALU-BARDAGE-AYOU-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":3.0,"P":6.0,"c":"Carport 3 × 6 m · bandeau Acier ral 7016 · poteaux bois 12x12cm","u":"https://abri-cerisier.fr/produit/carport-3x6m-poteaux-bois-12x12cm-bandeaux-acier-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/ChatGPT-Image-14-oct.-2025-a-16_57_22-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":3.0,"P":6.0,"c":"Carport 3 × 6 m · bandeau Clin 21mm vertical · poteaux bois 12x12cm","u":"https://abri-cerisier.fr/produit/carport-3x6m-poteaux-bois-12x12cm-bandeaux-clin-21mm-vertical","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/CARPORT-3X6-12X12-BANDEAU-VERT-VERTICAL-AJOURE-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":3.0,"P":6.0,"c":"Carport 3 × 6 m · bandeau Ajouré gris 20x70mm · poteaux bois 12x12cm","u":"https://abri-cerisier.fr/produit/carport-3x6m-poteaux-bois-12x12cm-bandeaux-ajoure-gris-20x70mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/CARPORT-3X6-12-X-12-BANDEAU-GRIS-VERTICAL-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":3.0,"P":6.0,"c":"Carport 3 × 6 m · bandeau Clin 28mm · poteaux bois 19x19cm","u":"https://abri-cerisier.fr/produit/carport-3x6m-poteaux-bois-19x19cm-bandeaux-clin-28mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/carport-TP-3X6-Poteaux-19-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":3.0,"P":6.0,"c":"Carport 3 × 6 m · bandeau Clin 28mm · poteaux bois 14x14cm","u":"https://abri-cerisier.fr/produit/carport-3x6m-poteaux-bois-14x14cm-bandeaux-clin-28mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/05/IMG_20230627_124700-002-660x880.jpg"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":3.0,"P":6.0,"c":"Carport 3 × 6 m · bandeau Clin 28mm · poteaux bois 12x12cm","u":"https://abri-cerisier.fr/produit/carport-3x6m-poteaux-bois-12x12cm-bandeaux-clin-28mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/ChatGPT-Image-15-oct.-2025-a-11_47_23-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":6.0,"P":6.0,"c":"Carport 6 × 6 m · bandeau Clin 28mm · poteaux bois 19x19cm","u":"https://abri-cerisier.fr/produit/carport-6x6m-poteaux-bois-19x19cm-bandeaux-clin-28mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/05/IMG_5604-660x495.jpg"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":6.0,"P":6.0,"c":"Carport 6 × 6 m · bandeau Clin 28mm · poteaux bois capoté alu 12x12cm","u":"https://abri-cerisier.fr/produit/carport-6x6m-poteaux-bois-17x17cm-bandeaux-clin-28mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/CARPORT-6X6-POTEAUX-CAPOT-ALU-ST-SPOT-660x440.png"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":6.0,"P":6.0,"c":"Carport 6 × 6 m · bandeau Clin 28mm · poteaux bois 14x14cm","u":"https://abri-cerisier.fr/produit/carport-6x6m-poteaux-bois-14x14cm-bandeaux-clin-28mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/05/IMG_6786-660x495.jpg"},{"k":"carport","t":"TOIT_PLAT","s":"","b":"","L":6.0,"P":6.0,"c":"Carport 6 × 6 m · bandeau Clin 28mm · poteaux bois 12x12cm","u":"https://abri-cerisier.fr/produit/carport-6x6m-poteaux-bois-12x12cm-bandeaux-clin-28mm","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_6787-660x495.jpg"},{"k":"abri","t":"QUADRO","s":"ossature","b":"srn_gris","L":5.0,"P":4.0,"c":"Abri QUADRO · ossature bois · bardage SRN gris · 5 × 4 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-5x4m-couverture-epdm-colle-sur-osb","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/20210901_193214-002-660x495.jpg"},{"k":"abri","t":"QUADRO","s":"ossature","b":"ayous","L":4.0,"P":3.0,"c":"Abri QUADRO · ossature bois · bardage Ayous · 4 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-quadro-en-ossature-bois-bardage-ayous-21x45mm-et-21x90mm-4x3m-couverture-epdm-colle-sur-osb","p":"https://abri-cerisier.fr/wp-content/uploads/2025/09/Image-1-660x440.jpg"},{"k":"abri","t":"QUADRO","s":"ossature","b":"srn_gris","L":3.0,"P":3.0,"c":"Abri QUADRO · ossature bois · bardage SRN gris · 3 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-3x3m-couverture-epdm-colle-sur-osb","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/Resized_20230629_101306.jpg"},{"k":"abri","t":"QUADRO","s":"ossature","b":"srn_gris","L":3.0,"P":2.0,"c":"Abri QUADRO · ossature bois · bardage SRN gris · 3 × 2 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-3x2m-couverture-epdm-colle-sur-osb","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_20230517_122318-002-660x880.jpg"},{"k":"abri","t":"QUADRO","s":"ossature","b":"sr","L":2.5,"P":2.0,"c":"Abri QUADRO · ossature bois · bardage sapin rouge · 2,5 × 2 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-21x130-25x2m-couverture-epdm-colle-sur-osb","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/0b3cb74f-4891-48cd-b508-ae29779010f2-660x990.png"},{"k":"abri","t":"QUADRO","s":"ossature","b":"srn_gris","L":2.5,"P":2.0,"c":"Abri QUADRO · ossature bois · bardage SRN gris · 2,5 × 2 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-25x2m-couverture-epdm-colle-sur-osb","p":"https://abri-cerisier.fr/wp-content/uploads/2025/10/a5d6ee40-ad60-4df0-9c87-e5ae7fd038b1-e1759393115287-660x543.png"},{"k":"abri","t":"1PAN","s":"ossature","b":"sr","L":3.0,"P":4.0,"c":"Abri 1 pan · ossature bois · bardage sapin rouge · 3 × 4 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-brun-21x130-3x4m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/Abri-de-jardin-MONTFORT-250-m-x-4-m-660x495.jpg"},{"k":"abri","t":"1PAN","s":"ossature","b":"sr","L":2.5,"P":5.0,"c":"Abri 1 pan · ossature bois · bardage sapin rouge · 2,5 × 5 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-25x5m-couverture-shingle-noir","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_2051-660x495.jpg"},{"k":"abri","t":"1PAN","s":"ossature","b":"sr","L":2.0,"P":2.5,"c":"Abri 1 pan · ossature bois · bardage sapin rouge · 2 × 2,5 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-2x25m-couverture-panneaux-tuiles-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/IMG_1846-660x495.jpeg"},{"k":"abri","t":"1PAN","s":"ossature","b":"sr","L":1.5,"P":3.0,"c":"Abri 1 pan · ossature bois · bardage sapin rouge · 1,5 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-15x3m-couverture-shingle-brun","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/Abri_jardin_BRUYERES_autoclave_15x35auvent_1C-rotated-e1738251834225-660x992.jpg"},{"k":"abri","t":"2PANS","s":"ossature","b":"sr","L":4.0,"P":2.5,"c":"Abri 2 pans · ossature bois · bardage sapin rouge · 4 × 2,5 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-brun-21x130-4x25m-couverture-shingle-brun","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_7580-660x495.jpeg"},{"k":"abri","t":"2PANS","s":"ossature","b":"sr","L":3.5,"P":3.0,"c":"Abri 2 pans · ossature bois · bardage sapin rouge · 3,5 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-35x3m-couverture-shingle-noir","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/Abri_jardin_NANDY_autoclave_350x350_1-660x513.jpg"},{"k":"abri","t":"2PANS","s":"ossature","b":"ayous","L":3.0,"P":3.0,"c":"Abri 2 pans · ossature bois · bardage Ayous · 3 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-ossature-bois-bardage-bardage-ayous-21x125-3x3m-couverture-panneaux-tuiles-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/20231005_120413-660x703.jpg"},{"k":"abri","t":"2PANS","s":"ossature","b":"sr","L":2.5,"P":2.0,"c":"Abri 2 pans · ossature bois · bardage sapin rouge · 2,5 × 2 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-25x2m-couverture-shingle-brun","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/IMG_9452-660x803.jpeg"},{"k":"abri","t":"TOIT_PLAT","s":"ossature","b":"sr","L":4.0,"P":3.0,"c":"Abri toit plat · ossature bois · bardage sapin rouge · 4 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-toit-plat-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-brun-21x130-4x3m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/01/Abri-de-jardin-moderne-ROQUEBRUNE-2.jpg"},{"k":"abri","t":"TOIT_PLAT","s":"ossature","b":"sr","L":2.5,"P":2.0,"c":"Abri toit plat · ossature bois · bardage sapin rouge · 2,5 × 2 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-toit-plat-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-25x2m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/01/Abri-de-jardin-MONTFORT-Toit-Plat-BARBIZON-660x474.jpg"},{"k":"garage","t":"QUADRO","s":"ossature","b":"srn_gris","L":3.5,"P":6.0,"c":"Garage QUADRO · ossature bois · bardage SRN gris · 3,5 × 6 m","u":"https://abri-cerisier.fr/produit/garage-bois-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-35x6m-couverture-epdm-colle-sur-osb","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_7754-660x495.jpg"},{"k":"garage","t":"1PAN","s":"ossature","b":"sr","L":3.5,"P":6.0,"c":"Garage 1 pan · ossature bois · bardage sapin rouge · 3,5 × 6 m","u":"https://abri-cerisier.fr/produit/garage-bois-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-35x6m-couverture-shingle-vert","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/PHOTO-2024-07-12-20-11-57-660x762.jpg"},{"k":"garage","t":"2PANS","s":"ossature","b":"sr","L":3.5,"P":5.5,"c":"Garage 2 pans · ossature bois · bardage sapin rouge · 3,5 × 5,5 m","u":"https://abri-cerisier.fr/produit/garage-bois-2-pans-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-35x55m-couverture-shingle-brun","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_1871-660x495.jpeg"},{"k":"garage","t":"TOIT_PLAT","s":"ossature","b":"sr","L":3.5,"P":6.0,"c":"Garage toit plat · ossature bois · bardage sapin rouge · 3,5 × 6 m","u":"https://abri-cerisier.fr/produit/garage-bois-toit-plat-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-35x6m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_3422-660x495.jpg"},{"k":"garage","t":"TOIT_PLAT","s":"madrier45","b":"","L":6.0,"P":6.0,"c":"Garage toit plat · madrier 45 mm · 6 × 6 m","u":"https://abri-cerisier.fr/produit/garage-bois-toit-plat-en-madrier-ep-45mm-6x6m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/DSCF1404-660x495.jpg"},{"k":"garage","t":"2PANS","s":"madrier45","b":"","L":4.5,"P":6.0,"c":"Garage 2 pans · madrier 45 mm · 4,5 × 6 m","u":"https://abri-cerisier.fr/produit/garage-bois-2-pans-en-madrier-ep-45mm-45x6m-couverture-panneaux-tuiles-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_1013-660x445.jpg"},{"k":"garage","t":"TOIT_PLAT","s":"madrier28","b":"","L":3.5,"P":5.0,"c":"Garage toit plat · madrier 28 mm · 3,5 × 5 m","u":"https://abri-cerisier.fr/produit/garage-bois-toit-plat-en-madrier-ep-28mm-35x5m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMGP0526-660x495.jpg"},{"k":"garage","t":"2PANS","s":"madrier28","b":"","L":3.0,"P":5.0,"c":"Garage 2 pans · madrier 28 mm · 3 × 5 m","u":"https://abri-cerisier.fr/produit/garage-bois-2-pans-en-madrier-ep-28mm-3x5m-couverture-shingle-brun","p":"https://abri-cerisier.fr/wp-content/uploads/2025/04/IMG_1014-660x483.jpg"},{"k":"abri","t":"TOIT_PLAT","s":"madrier45","b":"","L":4.2,"P":4.75,"c":"Abri toit plat · madrier 45 mm · 4,2 × 4,75 m","u":"https://abri-cerisier.fr/produit/studio-de-jardin-toit-plat-en-madrier-ep-45mm-42x475m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2024/11/Image_6-Photo-660x371.jpg"},{"k":"abri","t":"TOIT_PLAT","s":"madrier28","b":"","L":3.33,"P":2.83,"c":"Abri toit plat · madrier 28 mm · 3,33 × 2,83 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-toit-plat-en-madrier-ep-28mm-333x283m-couverture-bac-acier-63-100mm-gris-ral-7016-3","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/4bb2acbe-3c71-4c1f-9631-3d25aab776a0-660x589.jpg"},{"k":"abri","t":"TOIT_PLAT","s":"madrier28","b":"","L":3.33,"P":2.83,"c":"Abri toit plat · madrier 28 mm · 3,33 × 2,83 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-toit-plat-en-madrier-ep-28mm-333x283m-couverture-bac-acier-63-100mm-gris-ral-7016-2","p":"https://abri-cerisier.fr/wp-content/uploads/2025/09/Resized_20230629_171126-660x577.jpg"},{"k":"abri","t":"TOIT_PLAT","s":"madrier28","b":"","L":2.83,"P":2.33,"c":"Abri toit plat · madrier 28 mm · 2,83 × 2,33 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-toit-plat-en-madrier-ep-28mm-283x233m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/4bb2acbe-3c71-4c1f-9631-3d25aab776a0-660x589.jpg"},{"k":"abri","t":"TOIT_PLAT","s":"madrier28","b":"","L":3.33,"P":2.83,"c":"Abri toit plat · madrier 28 mm · 3,33 × 2,83 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-toit-plat-en-madrier-ep-28mm-333x283m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/01/Abri-CONTEMPORAIN-10-660x442.jpg"},{"k":"abri","t":"TOIT_PLAT","s":"madrier28","b":"","L":2.83,"P":2.83,"c":"Abri toit plat · madrier 28 mm · 2,83 × 2,83 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-toit-plat-en-madrier-ep-28mm-283x283m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/01/IMG_1615-660x691.jpg"},{"k":"abri","t":"TOIT_PLAT","s":"madrier28","b":"","L":2.83,"P":1.83,"c":"Abri toit plat · madrier 28 mm · 2,83 × 1,83 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-toit-plat-en-madrier-ep-28mm-283x183m-couverture-bac-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/IMG_5501-660x495.jpg"},{"k":"abri","t":"1PAN","s":"madrier28","b":"","L":1.5,"P":3.0,"c":"Abri 1 pan · madrier 28 mm · 1,5 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-1-pan-en-madrier-ep-28mm-15x3m-couverture-shingle-vert","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/IMG_6948-660x604.jpeg"},{"k":"abri","t":"2PANS","s":"madrier28","b":"","L":3.5,"P":3.0,"c":"Abri 2 pans · madrier 28 mm · 3,5 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-madrier-ep-28mm-35x3m-couverture-shingle-brun","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/IMG_7686-660x880.jpg"},{"k":"abri","t":"2PANS","s":"madrier28","b":"","L":3.0,"P":2.5,"c":"Abri 2 pans · madrier 28 mm · 3 × 2,5 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-madrier-ep-28mm-3x25m-couverture-panneaux-tuiles-acier-63-100mm-gris-ral-7016","p":"https://abri-cerisier.fr/wp-content/uploads/2025/01/Abri-de-jardin-ISOLA-660x371.jpg"},{"k":"abri","t":"2PANS","s":"madrier28","b":"","L":2.5,"P":2.0,"c":"Abri 2 pans · madrier 28 mm · 2,5 × 2 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-madrier-ep-28mm-25x2m-couverture-shingle-noir","p":"https://abri-cerisier.fr/wp-content/uploads/2025/01/IMG_3136-660x582.jpg"},{"k":"abri","t":"2PANS","s":"madrier28","b":"","L":4.0,"P":3.0,"c":"Abri 2 pans · madrier 28 mm · 4 × 3 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-madrier-ep-28mm-4x3m-couverture-shingle-vert","p":"https://abri-cerisier.fr/wp-content/uploads/2025/01/DSC01300-660x495.jpg"},{"k":"abri","t":"2PANS","s":"madrier28","b":"","L":2.0,"P":2.0,"c":"Abri 2 pans · madrier 28 mm · 2 × 2 m","u":"https://abri-cerisier.fr/produit/abri-de-jardin-2-pans-en-madrier-ep-28mm-2x2m-couverture-shingle-brun","p":"https://abri-cerisier.fr/wp-content/uploads/2024/06/20230404_145244-660x880.jpg"}];
  if (!M) return;

  var form = null;
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  var fr = function (v, d) { return (Math.round(v * 100) / 100).toFixed(d == null ? 2 : d).replace('.', ','); };

  // ── Lecture du formulaire (champs visibles seulement, comme ce que le site retient) ──
  function nm(fid, suf) { return 'wapf[field_' + fid + (suf || '') + ']'; }
  function els(fid, suf) {
    var n = nm(fid, suf);
    return Array.prototype.filter.call(form.querySelectorAll('[name="' + n + '"],[name="' + n + '[]"]'), function (e) {
      return !e.disabled && e.type !== 'hidden' && !e.closest('.wapf-hide');
    });
  }
  function choices(fid, suf) {
    var out = [];
    els(fid, suf).forEach(function (e) {
      if (e.tagName === 'SELECT') {
        var o = e.options[e.selectedIndex];
        if (o && o.value) out.push({ label: o.text.trim(), price: o.getAttribute('data-wapf-price') || '', value: o.value });
      } else if ((e.type === 'radio' || e.type === 'checkbox') && e.checked) {
        out.push({ label: e.getAttribute('data-wapf-label') || '', price: e.getAttribute('data-wapf-price') || '', value: e.value });
      }
    });
    return out;
  }
  function choice(fid, suf) { return choices(fid, suf)[0] || null; }
  function first(list, suf) { for (var i = 0; i < (list || []).length; i++) { var c = choice(list[i], suf); if (c) return c; } return null; }
  function num(fid, suf) {
    var e = els(fid, suf).filter(function (x) { return x.type === 'number' || x.type === 'text'; })[0];
    if (!e) return null;
    var v = parseFloat(String(e.value).replace(',', '.'));
    return isNaN(v) ? null : v;
  }
  function yes(fid) { var c = choice(fid); return !!c && /^oui/i.test(c.label); }
  function dim(D) { // dimension choisie : liste, ou saisie sur mesure
    var sm = choice(D.sm);
    if (sm && /^oui/i.test(sm.label)) return num(D.num);
    var c = choice(D.sel);
    var v = c ? parseFloat(String(c.label).replace(',', '.')) : NaN;
    return isNaN(v) ? null : v;
  }

  // ── Traduction des libellés du site vers les réglages du moteur ──
  var T = {
    toit: function (l) { return /1 PAN/i.test(l) ? '1PAN' : /2 PANS/i.test(l) ? '2PANS' : /TOIT PLAT/i.test(l) ? 'TOIT_PLAT' : /QUADRO/i.test(l) ? 'QUADRO' : null; },
    orient: function (l) { return /fond/i.test(l) ? 'fond' : /droite/i.test(l) ? 'droite' : /gauche/i.test(l) ? 'gauche' : /avant/i.test(l) ? 'face' : null; },
    pente: function (l) { var m = /(\d+)\s*°/.exec(l || ''); return m ? m[1] : null; },
    bard: function (l) {
      return /Dibond/i.test(l) ? 'dibond' : /SRN|gris/i.test(l) ? 'srn_gris' : /Douglas/i.test(l) ? 'douglas_noir'
        : /21x45|aléatoire/i.test(l) ? 'ayous_alea' : /Ayous/i.test(l) ? 'ayous125' : /brun/i.test(l) ? 'sr_brun' : 'sr_vert';
    },
    couv: function (l) {
      return /EPDM/i.test(l) ? 'epdm' : /Shingle Noir/i.test(l) ? 'shingle_n' : /Shingle brun/i.test(l) ? 'shingle_b' : /Shingle vert/i.test(l) ? 'shingle_v'
        : /tuiles?.*Rou|Prêt pour tuiles/i.test(l) ? 'tuile_r' : /tuiles?/i.test(l) ? 'tuile_g' : 'bac';
    },
    plan: function (l) { return !l || /^non/i.test(l) ? 'non' : /pin/i.test(l) ? 'pin21' : /21\s*mm/i.test(l) ? 'epicea21iso' : 'epicea15'; },
    pot: function (l) { return /19/.test(l) ? 0.19 : /14/.test(l) ? 0.14 : /aluminium 15/i.test(l) ? 0.15 : 0.12; },
    // bandeaux du carport (options du site) : bac acier, ajouré gris 20×70, ajouré vert 20×60, Ayous aléatoire 21×45 / 21×90
    bandeau: function (l) { return /bac acier|métallique/i.test(l) ? 'bac_bandeau' : /Ayou/i.test(l) ? 'ayous_alea' : /gris/i.test(l) ? 'srn_gris' : /ajour/i.test(l) ? 'ps_vert_ajoure' : /vertical/i.test(l) ? 'sr_vert_v' : 'sr_vert'; },
    remplissage: function (l) { return /ajour/i.test(l) ? 'ajouree' : /clin/i.test(l) ? 'clin' : 'ossature'; }
  };
  // Code de prix du site → menuiserie du catalogue du moteur (même codes ; « vitrée » du site = 3/4 vitrée)
  var CODE2P = {};
  E.MPRESETS.forEach(function (p) { if (p.sku) CODE2P[p.sku] = p; });
  CODE2P.PBSV = CODE2P.PBSV34; CODE2P.PBDV = CODE2P.PBDV34;
  function codeOf(c) { var m = /menuiseries;\s*([A-Za-z0-9]+)/.exec((c && c.price) || ''); return m ? m[1] : null; }

  // ── Placement des menuiseries : automatique, ajustable par le client (mémorisé par menuiserie) ──
  var PLACE = {};   // clé (suffixe WAPF) → { wall, pos, rail, auto:false }
  var adosSide = 'gauche';

  function suffixes(fid) {
    var s = {}, re = new RegExp('^wapf\\[field_' + fid + '(_clone_\\d+)?\\]');
    Array.prototype.forEach.call(form.querySelectorAll('[name^="wapf[field_' + fid + '"]'), function (e) {
      var m = re.exec(e.name);
      if (m && !e.closest('.wapf-hide')) s[m[1] || ''] = 1;
    });
    return Object.keys(s).sort(function (a, b) { return (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0); });
  }

  function readMenus(d, cfg) {
    var out = [], gdoor = null;
    if (!M.men) return { menus: out, gdoor: gdoor };
    suffixes(M.men.type).forEach(function (suf) {
      var ty = choice(M.men.type, suf);
      if (!ty) return;
      if (M.men.garage && /garage/i.test(ty.label)) {
        var g = choice(M.men.garage, suf), gc = codeOf(g);
        if (gc && !gdoor) gdoor = { code: gc, label: g.label };
        return;
      }
      var c = first(M.men.specific, suf), code = codeOf(c), p = code && CODE2P[code];
      if (!p) return;
      var o = first(M.men.opt, suf);
      var optCode = o ? (/lookuptable\(menuiseries;\s*([A-Za-z0-9]+)/.exec(o.price) || [])[1] : '';
      if (optCode === 'SV') optCode = '';
      out.push({ key: suf || 'm0', preset: p.id, label: p.label, siteLabel: c.label, type: p.type, lw: p.lw, lh: p.lh, img: p.img || '', opt: optCode || '', code: code });
    });
    return { menus: out, gdoor: gdoor };
  }

  // Pose automatique : portes en façade puis côtés ; fenêtres réparties ; rien qui chevauche
  function autoPlace(list, d, gW) {
    var walls = ST.type === 'carport' ? E.closList().slice() : ['face', 'gauche', 'droite', 'fond'];
    var len = function (w) { return (w === 'face' || w === 'fond') ? d.L * 100 : d.P * 100; };
    var used = {};
    walls.forEach(function (w) { used[w] = []; });
    if (gW && used.face) used.face.push([d.L * 50 - gW / 2 - 10, d.L * 50 + gW / 2 + 10]);
    var fits = function (w, a, b) { return a >= 10 && b <= len(w) - 10 && used[w].every(function (u) { return b <= u[0] || a >= u[1]; }); };
    var order = list.slice().sort(function (a, b) { return (a.type === 'porte' ? 0 : 1) - (b.type === 'porte' ? 0 : 1); });
    order.forEach(function (m) {
      var pl = PLACE[m.key];
      if (pl && !pl.auto) return;
      var pref = m.type === 'porte' ? ['face', 'gauche', 'droite', 'fond'] : ['face', 'gauche', 'droite', 'fond'];
      var done = false;
      for (var i = 0; i < pref.length && !done; i++) {
        var w = pref[i];
        if (!used[w]) continue;
        var L = len(w), cands = [0.5, 0.25, 0.75, 0.15, 0.85, 0.35, 0.65];
        for (var j = 0; j < cands.length && !done; j++) {
          var c = cands[j] * L, a = c - m.lw / 2 - 15, b = c + m.lw / 2 + 15;
          var zone = E.isSliding(m) ? m.lw : 0; // une coulissante a besoin de la place pour s'ouvrir
          if (fits(w, a - zone, b)) { used[w].push([a - zone, b]); PLACE[m.key] = { wall: w, pos: Math.round(c / L * 100), rail: 'gauche', auto: true }; done = true; }
        }
      }
      if (!done) PLACE[m.key] = { wall: walls[0] || 'face', pos: 50, rail: 'gauche', auto: true };
    });
  }

  // ── Cotes du site (mêmes formules que le configurateur) ──
  function siteDims(s) {
    var o = {};
    if (CFG.kind === 'carport') {
      var ados = s.ados !== 'non';
      o.L = r2(s.Lr - (ados ? 0.2 : 0.4)); o.P = r2(s.Pr - (ados ? 0.2 : 0.4));
      o.intL = r2(o.L - s.sec * (ados ? 1 : 2)); o.intP = r2(o.P - s.sec * (ados ? 1 : 2));
      o.hInt = s.hRehausse || 2.1;
      o.htL = s.Lr; o.htP = s.Pr;
      var espL = (s.espL === 6 || s.toit === '2PANS' || s.toit === '1PAN') ? 6 : 4, espP = s.espP === 6 ? 6 : 4;
      o.nCols = Math.ceil(s.Lr / espL) + (ados ? 0 : 1); o.nRows = Math.ceil(s.Pr / espP) + 1; o.nPosts = o.nCols * o.nRows;
      o.ov = ados ? { L: s.ados === 'gauche' ? 0 : 0.2, R: s.ados === 'droite' ? 0 : 0.2, F: 0.1, B: 0.1 } : { L: 0.2, R: 0.2, F: 0.2, B: 0.2 };
      return o;
    }
    var madrier = s.sys !== 'ossature', tp = s.toit === 'TOIT_PLAT';
    o.L = tp && madrier ? r2(s.Lr - 0.17) : s.Lr; o.P = tp && madrier ? r2(s.Pr - 0.17) : s.Pr;
    var wt = s.sys === 'madrier28' ? 0.028 : s.sys === 'madrier45' ? 0.045 : 0.07;
    o.intL = r2(o.L - 2 * wt); o.intP = r2(o.P - 2 * wt);
    var eL = s.ext.gauche + s.ext.droite, eP = s.ext.face + s.ext.fond;
    var ht = function (base, e) {
      if (tp) return r2((madrier ? base + e - 0.17 + 0.2 : base + e + 0.2) + 0.056);
      if (s.toit === '1PAN' || s.toit === '2PANS') return r2(base + e + 0.2 + 0.056);
      return r2(base + e); // QUADRO
    };
    o.htL = ht(s.Lr, eL); o.htP = ht(s.Pr, eP);
    // Formule du site (hauteur_interieur) : la règle QUADRO s'applique avant celle de l'ossature (le QUADRO ne pose pas la question du système)
    var base = s.toit === 'QUADRO' ? 2.12 : (s.sys === 'ossature' ? 2 : 2.08);
    var nReh = s.reh || 0;
    o.hInt = r2((CFG.kind === 'garage' ? (nReh + 2) * 0.13 : nReh * 0.13) + base);
    var stdL = Math.max(0, (o.htL - o.L - eL) / 2), stdP = Math.max(0, (o.htP - o.P - eP) / 2);
    o.ov = { L: stdL + s.ext.gauche, R: stdL + s.ext.droite, F: stdP + s.ext.face, B: stdP + s.ext.fond };
    return o;
  }

  // ── Lecture complète → état du moteur ──
  var LAST = null;
  function read() {
    var s = { Lr: dim(M.lar), Pr: dim(M.pro) };
    if (!s.Lr || !s.Pr) return null;
    var toitC = first(M.toit); s.toit = toitC ? T.toit(toitC.label) : (CFG.kind === 'carport' ? '2PANS' : '2PANS');
    var oc = first(M.orient); s.orient = (oc && T.orient(oc.label)) || 'droite';
    var pc = first(M.pente); s.pente = (pc && T.pente(pc.label)) || '18';
    var cfg = { 'f-rendu': 'real', 'f-lar': String(Math.round(s.Lr * 100)), 'f-pro': String(Math.round(s.Pr * 100)), 'f-toit': s.toit, 'f-orient': s.orient,
      'f-pente': s.pente, 'f-df': '0', 'f-db': '0', 'f-dl': '0', 'f-dr': '0', 'f-gout': 'non', 'f-plan': 'non', 'f-iso': 'non', 'f-reh': '0',
      'f-couv': 'bac', 'f-bard': 'sr_vert', 'f-ext-ferm': 'non', 'f-ext-plan': 'non', 'f-clos': 'aucune', 'f-ados': 'non', 'f-pot': '0.12', 'f-esp': '4',
      'f-pgtype': 'PGM', 'f-pglw': '237', 'f-pglh': '200', 'f-sys': 'madrier28', 'f-clos-type': '', 'f-bandeau': '', 'f-espL': '' };
    var cv = first(M.couv); if (cv) cfg['f-couv'] = T.couv(cv.label);
    // Sous-face vue d'en dessous (carport) : planchettes, OSB (EPDM), feutre anti-condensation ou bac acier nu
    cfg['f-sousface'] = cv ? (/planchette/i.test(cv.label) ? 'planchette' : /OSB/i.test(cv.label) ? 'osb' : /feutre/i.test(cv.label) ? 'feutre' : 'non') : '';
    var gt = first(M.gout); if (gt && /^oui/i.test(gt.label)) cfg['f-gout'] = 'oui';
    ST.ext = {};
    if (CFG.kind === 'carport') {
      var ad = first(M.ados); s.ados = ad && /adoss/i.test(ad.label) ? adosSide : 'non'; cfg['f-ados'] = s.ados;
      var po = first(M.pot); s.sec = po ? T.pot(po.label) : 0.12; cfg['f-pot'] = String(s.sec);
      cfg['f-potalu'] = po && /alu/i.test(po.label) ? 'oui' : 'non'; // poteau alu ou bois capoté alu : noir
      var eL = first(M.espL), eP = first(M.espP); s.espL = eL && /6/.test(eL.label) ? 6 : 4; s.espP = eP && /6/.test(eP.label) ? 6 : 4;
      cfg['f-esp'] = String(s.espP); cfg['f-espL'] = String(s.espL);
      if (yes(M.reh.q)) { for (var i = 0; i < M.reh.n.length; i++) { var h = num(M.reh.n[i]); if (h) { s.hRehausse = h; break; } } }
      if (yes(M.clos.q)) {
        var sides = choices(M.clos.sides).map(function (c) { return c.label.toLowerCase(); }).filter(function (x) { return x === 'gauche' || x === 'droite' || x === 'fond'; });
        if (sides.length) cfg['f-clos'] = sides.join('+');
        var ty = first(M.clos.type); cfg['f-clos-type'] = ty ? T.remplissage(ty.label) : '';
      }
      var bd = first(M.bandeau); if (bd) cfg['f-bandeau'] = T.bandeau(bd.label);
      // Pieds de poteaux : plots béton, pieds galva à visser (réglables ou non), à sceller ; sinon platine
      var sp = first(M.supp);
      cfg['f-supp'] = !sp || /^non/i.test(sp.label) ? 'non' : /b[ée]ton/i.test(sp.label) ? 'plot' : /r[ée]glable/i.test(sp.label) ? 'reglable' : /scell/i.test(sp.label) ? 'scelle' : 'visser';
      s.ext = { face: 0, fond: 0, gauche: 0, droite: 0 };
    } else {
      var sy = first(M.sys), ep = first(M.ep);
      // Le QUADRO est toujours en ossature bois (le site ne pose pas la question : système constructif = 2 dans ses formules)
      s.sys = s.toit === 'QUADRO' || (sy && /ossature/i.test(sy.label)) ? 'ossature' : (ep && /45/.test(ep.label) ? 'madrier45' : 'madrier28');
      cfg['f-sys'] = s.sys;
      var bd2 = first(M.bard); if (bd2) cfg['f-bard'] = T.bard(bd2.label);
      s.reh = yes(M.reh.q) ? (num(M.reh.n) || 0) : 0; cfg['f-reh'] = String(s.reh);
      var pl = first(M.plan); cfg['f-plan'] = pl ? T.plan(pl.label) : 'non';
      // Pignon (classique / biseauté), profilés alu d'angle, soubassement parpaing (+20 cm)
      var pg = first(M.pign); cfg['f-pignon'] = pg && /biseau/i.test(pg.label) ? 'biseaute' : 'classique';
      cfg['f-profu'] = yes(M.profu[0]) ? 'oui' : 'non';
      cfg['f-soub'] = yes(M.soub[0]) ? 'oui' : 'non';
      s.ext = { face: 0, fond: 0, gauche: 0, droite: 0 };
      if (yes(M.ext.q)) {
        ['face', 'fond', 'gauche', 'droite'].forEach(function (k) { s.ext[k] = num(M.ext.m[k]) || 0; });
        var typeR = first(M.ext.type), anyR = false;
        ['face', 'fond', 'gauche', 'droite'].forEach(function (k) {
          if (!s.ext[k] || !yes(M.ext.rq[k])) return;
          var cs = choices(M.ext.rs[k]).map(function (c) { return c.label.toLowerCase(); });
          // flancs a / b et bout c, comme dans le générateur
          var flanks = (k === 'droite' || k === 'gauche') ? ['face', 'fond'] : ['gauche', 'droite'];
          ST.ext[k] = { a: cs.indexOf(flanks[0]) >= 0, b: cs.indexOf(flanks[1]) >= 0, c: cs.indexOf(k) >= 0 };
          anyR = true;
        });
        if (anyR) cfg['f-ext-ferm'] = typeR ? (T.remplissage(typeR.label) === 'ajouree' ? 'ajouree' : 'pleine') : 'pleine';
        if (M.pext && yes(M.pext.q)) cfg['f-ext-plan'] = 'oui';
      }
    }
    ST.type = CFG.kind; ST.cfg = cfg; ST.site = null;
    // dimensions de base pour placer les menuiseries
    s.site = siteDims(s); ST.site = s.site;
    var d = E.calcDims();
    var men = readMenus(d, cfg), gW = 0;
    if (men.gdoor) { cfg['f-pgtype'] = men.gdoor.code; gW = 237; }
    var keys = {};
    men.menus.forEach(function (m) { keys[m.key] = 1; });
    Object.keys(PLACE).forEach(function (k) { if (!keys[k]) delete PLACE[k]; });
    autoPlace(men.menus, d, CFG.kind === 'garage' && men.gdoor ? gW : 0);
    ST.menus = men.menus.map(function (m, i) {
      var pl = PLACE[m.key] || { wall: 'face', pos: 50, rail: 'gauche' };
      var seuil = m.type === 'fenetre' ? Math.max(20, Math.min(100, Math.round((d.hInt - 0.08) * 100 - m.lh))) : 0;
      if (pl.seuil != null) seuil = pl.seuil;
      return { id: i + 1, key: m.key, preset: m.preset, label: m.label, siteLabel: m.siteLabel, type: m.type, lw: m.lw, lh: m.lh, img: m.img, opt: m.opt,
        wall: pl.wall, pos: pl.pos, rail: pl.rail || 'gauche', seuil: seuil, code: m.code };
    });
    LAST = { s: s, d: d, gdoor: men.gdoor };
    return LAST;
  }

  // ── Panneau ──
  var P = null, VIEW = 'face', VIEWS = [['face', 'Façade'], ['gauche', 'Gauche'], ['droite', 'Droite'], ['fond', 'Fond'], ['plan', 'Plan']];
  var NOUN = { abri: 'abri', garage: 'garage', carport: 'carport' }[CFG.kind];
  var DOCK = window.matchMedia('(max-width: 899.98px), (max-width: 1099.98px) and (orientation: portrait)');
  function build() {
    var sum = form.closest('.summary') || form.parentNode;
    document.body.classList.add('cer-plan-on');
    sum.classList.add('cer-plan-grid');
    P = document.createElement('aside');
    P.className = 'cer-plan';
    P.innerHTML =
      '<div class="cer-plan__in">' +
      '<div class="cer-plan__prix" hidden><span>Prix de votre ' + NOUN + '</span><strong></strong></div>' +
      '<div class="cer-plan__head"><div class="cer-plan__heading"><span class="cer-plan__kicker">Votre ' + NOUN + ' sur mesure</span><span class="cer-plan__title"><span class="cer-l">Le plan se dessine avec vos choix</span><span class="cer-s">Votre ' + NOUN + ' en direct</span></span></div>' +
      '<button type="button" class="cer-plan__expand">Agrandir</button><button type="button" class="cer-plan__close" aria-label="Réduire">×</button></div>' +
      // onglets + dessin : bloc qui reste en haut du plein écran (téléphone) pendant qu'on règle les menuiseries juste dessous
      '<div class="cer-plan__vis">' +
      '<div class="cer-plan__tabs" role="tablist">' + VIEWS.map(function (v) { return '<button type="button" role="tab" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>' +
      '<div class="cer-plan__stage"><svg id="cer-sv-main" xmlns="http://www.w3.org/2000/svg"></svg><div class="cer-plan__empty">Choisissez la largeur et la profondeur : le dessin apparaît ici.</div></div>' +
      '</div>' +
      '<div class="cer-plan__warn"></div>' +
      '<details class="cer-plan__place"><summary>Placer mes portes et fenêtres</summary><div class="cer-plan__places"></div></details>' +
      '<dl class="cer-plan__dims"></dl>' +
      '<div class="cer-plan__real"></div>' +
      '<details class="cer-plan__detail"><summary>Détail de votre configuration</summary><div class="cer-plan__lignes"></div></details>' +
      '<p class="cer-plan__note">Dessin à l\'échelle d\'après votre configuration. Les plans définitifs sont validés avec votre conseiller Abri Cerisier.</p>' +
      '</div>';
    sum.appendChild(P);
    var fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'cer-plan-fab'; fab.textContent = 'Voir mon ' + NOUN;
    document.body.appendChild(fab);
    // Tablette / téléphone : ancré en bas ; × replie en bouton (ou quitte le plein écran) ; « Agrandir » ouvre le plein écran
    var B = document.body;
    fab.addEventListener('click', function () { B.classList.remove('cer-plan-min'); memo(''); draw(); });
    var openPlace = function () { if (ST.menus.length) P.querySelector('.cer-plan__place').open = true; };
    P.querySelector('.cer-plan__expand').addEventListener('click', function () { B.classList.add('cer-plan-open'); P.querySelector('.cer-plan__detail').open = true; openPlace(); draw(); });
    P.querySelector('.cer-plan__close').addEventListener('click', function () {
      if (B.classList.contains('cer-plan-open')) { B.classList.remove('cer-plan-open'); }
      else { B.classList.add('cer-plan-min'); memo('min'); }
    });
    B.classList.add('cer-plan-min'); // replié tant que rien n'est dessiné
    // téléphone / tablette portrait : un appui sur le dessin l'ouvre en plein écran
    var openFull = function () { if (DOCK.matches && !B.classList.contains('cer-plan-open')) { B.classList.add('cer-plan-open'); P.querySelector('.cer-plan__detail').open = true; openPlace(); draw(); } };
    P.querySelector('.cer-plan__stage').addEventListener('click', openFull);
    P.querySelector('.cer-plan__prix').addEventListener('click', openFull);
    // place réservée en bas de page = hauteur réelle du visuel ancré (le bouton « Ajouter au panier » reste accessible)
    var pad = function () { B.style.paddingBottom = (DOCK.matches && !B.classList.contains('cer-plan-min') && !B.classList.contains('cer-plan-open')) ? (P.querySelector('.cer-plan__in').offsetHeight + 16) + 'px' : ''; };
    if (window.ResizeObserver) new ResizeObserver(pad).observe(P.querySelector('.cer-plan__in'));
    new MutationObserver(pad).observe(B, { attributes: true, attributeFilter: ['class'] });
    if (DOCK.addEventListener) DOCK.addEventListener('change', pad);
    P.querySelector('.cer-plan__tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'); if (!b) return; VIEW = b.getAttribute('data-v'); draw();
    });
    P.querySelector('.cer-plan__places').addEventListener('change', onPlace);
    P.querySelector('.cer-plan__real').addEventListener('click', onReal);
    P.querySelector('.cer-plan__places').addEventListener('input', onPlace);
  }
  function memo(v) { try { sessionStorage.setItem('cerPlanDock', v); } catch (e) { } }
  function memoGet() { try { return sessionStorage.getItem('cerPlanDock') || ''; } catch (e) { return ''; } }
  var shownOnce = false;
  function onPlace(e) {
    var row = e.target.closest('[data-k]'); if (!row) return;
    var k = row.getAttribute('data-k'), pl = PLACE[k] || {};
    pl.auto = false;
    pl.wall = row.querySelector('.w').value; pl.pos = parseInt(row.querySelector('.p').value, 10) || 50;
    var r = row.querySelector('.r'); if (r) pl.rail = r.value;
    PLACE[k] = pl;
    schedule(e.type === 'input' ? 0 : 0, true);
  }
  function renderPlaces() {
    var box = P.querySelector('.cer-plan__places');
    if (!ST.menus.length) { box.innerHTML = '<p class="cer-plan__hint">Ajoutez des menuiseries dans le configurateur : elles se placent ici automatiquement, vous pourrez les déplacer.</p>'; return; }
    var walls = ST.type === 'carport' ? E.closList() : ['face', 'gauche', 'droite', 'fond'];
    var WL = { face: 'Façade', gauche: 'Côté gauche', droite: 'Côté droit', fond: 'Fond' };
    var open = box.querySelector(':focus');
    if (open) return; // ne pas reconstruire pendant une saisie
    box.innerHTML = ST.menus.map(function (m) {
      return '<div class="cer-plan__pl" data-k="' + m.key + '"><div class="n">' + (m.siteLabel || m.label) + '</div>' +
        '<label>Mur <select class="w">' + walls.map(function (w) { return '<option value="' + w + '"' + (w === m.wall ? ' selected' : '') + '>' + WL[w] + '</option>'; }).join('') + '</select></label>' +
        '<label>Position <input class="p" type="range" min="5" max="95" value="' + m.pos + '"></label>' +
        (E.isSliding(m) && !E.isDoubleM(m) ? '<label>Coulisse <select class="r"><option value="gauche"' + (m.rail !== 'droite' ? ' selected' : '') + '>vers la gauche</option><option value="droite"' + (m.rail === 'droite' ? ' selected' : '') + '>vers la droite</option></select></label>' : '') +
        '</div>';
    }).join('');
  }
  function dimsList(L) {
    var d = L.d, s = L.s, rows;
    if (CFG.kind === 'carport') {
      rows = [['Dimensions hors tout', fr(d.htL) + ' × ' + fr(d.htP) + ' m'], ['Emprise des poteaux', fr(d.L) + ' × ' + fr(d.P) + ' m'],
        ['Passage entre poteaux', fr(d.intL) + ' × ' + fr(d.intP) + ' m'], ['Hauteur sous ferme', fr(d.hInt) + ' m'],
        ['Hauteur au faîtage', fr(d.hExt + d.rH) + ' m'], ['Surface couverte', fr(d.htL * d.htP) + ' m²'], ['Poteaux', d.nPosts + ' (' + Math.round(s.sec * 100) + ' × ' + Math.round(s.sec * 100) + ' cm)']];
    } else {
      rows = [['Dimensions extérieures', fr(d.L) + ' × ' + fr(d.P) + ' m'], ['Dimensions intérieures', fr(d.intL) + ' × ' + fr(d.intP) + ' m'],
        ['Surface intérieure', fr(d.intL * d.intP) + ' m²'], ['Hauteur intérieure', fr(d.hInt) + ' m'],
        d.rH > 0 ? ['Hauteur au faîtage', fr(d.hExt + d.rH + (d.base || 0)) + ' m'] : null, ['Emprise toiture (hors tout)', fr(d.htL) + ' × ' + fr(d.htP) + ' m']].filter(Boolean);
    }
    return rows;
  }
  // ── Réalisations : la photo de pose la plus proche de la configuration (toit, système, bardage, dimensions) ──
  function realScore(r, s, cfg) {
    if (r.k !== CFG.kind) return -1;
    var sc = 0, sys = cfg['f-sys'] || '', b = cfg['f-bard'] || '';
    if (r.t && r.t === s.toit) sc += 4;
    if (CFG.kind !== 'carport' && r.s && sys) sc += r.s === sys ? 3 : (r.s.slice(0, 7) === sys.slice(0, 7) ? 2 : 0);
    var fam = /^sr/.test(b) ? 'sr' : /ayous/.test(b) ? 'ayous' : b === 'srn_gris' ? 'srn_gris' : '';
    if (sys === 'ossature' && r.b && fam && r.b === fam) sc += 2;
    if (r.L && s.Lr) sc += Math.max(0, 1.5 - (Math.abs(r.L - s.Lr) + Math.abs(r.P - s.Pr)) / 2);
    return sc;
  }
  function realisations() {
    var box = P && P.querySelector('.cer-plan__real'); if (!box || !LAST) return;
    var s = LAST.s, cfg = ST.cfg || {};
    var list = REAL.map(function (r) { return { r: r, sc: realScore(r, s, cfg) }; }).filter(function (x) { return x.sc >= 3; })
      .sort(function (a, b) { return b.sc - a.sc; }).slice(0, 3);
    var key = list.map(function (x) { return x.r.p; }).join('|');
    if (box.getAttribute('data-k') === key) return;
    box.setAttribute('data-k', key); box._list = list;
    if (!list.length) { box.innerHTML = ''; return; }
    var r0 = list[0].r;
    box.innerHTML = '<div class="cer-plan__realh"><span>En vrai</span>Une réalisation proche de votre projet</div>' +
      '<figure class="cer-plan__realmain"><button type="button" class="z" aria-label="Agrandir la photo"><img loading="lazy" src="' + r0.p + '" alt="' + r0.c + '"></button><figcaption>' + r0.c + '</figcaption></figure>' +
      (list.length > 1 ? '<div class="cer-plan__realth">' + list.map(function (x, i) { return '<button type="button" data-i="' + i + '"' + (i ? '' : ' class="on"') + ' aria-label="' + x.r.c + '"><img loading="lazy" src="' + x.r.p + '" alt=""></button>'; }).join('') + '</div>' : '') +
      '<p class="cer-plan__realn">Photo d\'un modèle posé, proche de votre configuration (non contractuelle). <a href="' + r0.u + '" target="_blank" rel="noopener">Voir ce modèle</a></p>';
  }
  function onReal(e) {
    var box = e.currentTarget, list = box._list || [], th = e.target.closest('.cer-plan__realth button');
    if (th) {
      var r = list[+th.getAttribute('data-i')].r;
      box.querySelector('.cer-plan__realmain img').src = r.p; box.querySelector('.cer-plan__realmain figcaption').textContent = r.c;
      box.querySelector('.cer-plan__realn a').href = r.u;
      Array.prototype.forEach.call(box.querySelectorAll('.cer-plan__realth button'), function (b) { b.classList.toggle('on', b === th); });
      return;
    }
    if (e.target.closest('.cer-plan__realmain .z')) { // agrandissement plein écran
      var lb = document.createElement('div'); lb.className = 'cer-lb';
      lb.innerHTML = '<img src="' + box.querySelector('.cer-plan__realmain img').src + '" alt=""><p>' + box.querySelector('figcaption').textContent + '</p><button type="button" aria-label="Fermer">×</button>';
      lb.addEventListener('click', function () { lb.remove(); }); document.body.appendChild(lb);
    }
  }

  // ── Habillage du formulaire du site (version test) : titres d'étape, prix en pastilles, boutons − / + sur les dimensions ──
  var money0 = function (v) { return v.toLocaleString('fr-FR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'; };
  function habiller() {
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-field-label span'), function (sp) { // puces « • » retirées
      var n = sp.firstChild; if (n && n.nodeType === 3 && /^\s*[•·]\s*/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/^\s*[•·]\s*/, '');
    });
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-section.TITRE, .wapf-section.TITRE2'), function (sec) { // titre d'étape = 1re question visible
      var first = null;
      Array.prototype.forEach.call(sec.querySelectorAll('.wapf-field-container > .wapf-field-label'), function (l) {
        l.classList.remove('cer-step-h');
        if (!first && l.offsetParent !== null && !l.closest('.cerisier-toggle') && l.textContent.trim()) first = l;
      });
      if (first) first.classList.add('cer-step-h');
    });
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-pricing-hint'), function (h) { // « (+480,00 €) » → pastille « +480 € » / « Inclus »
      var tx = h.textContent; if (h.getAttribute('data-cer') === tx) return;
      var v = numTxt(tx), nt = isNaN(v) ? tx : (v === 0 ? 'Inclus' : (v > 0 ? '+' : '−') + money0(Math.abs(v)));
      h.textContent = nt; h.setAttribute('data-cer', nt); h.classList.add('cer-pill'); h.classList.toggle('cer-pill--0', v === 0);
    });
    Array.prototype.forEach.call(form.querySelectorAll('.cerisier-toggle .wapf-swatch--text span'), function (sp) { // guides : simple lien
      var n = sp.firstChild; if (n && n.nodeType === 3 && /▼|guide|Comparer/i.test(n.nodeValue)) n.nodeValue = window.matchMedia('(max-width: 767.98px)').matches ? 'Comparer' : 'Comparer les options';
    });
    [M.lar && M.lar.sel, M.pro && M.pro.sel].forEach(function (fid) { // dimensions : − / + autour de la liste
      if (!fid) return;
      var sel = form.querySelector('select[name="' + nm(fid) + '"]'); if (!sel || sel.parentNode.classList.contains('cer-stepper')) return;
      var w = document.createElement('div'); w.className = 'cer-stepper'; sel.parentNode.insertBefore(w, sel);
      var mk = function (d, txt) { var b = document.createElement('button'); b.type = 'button'; b.className = 'cer-stepper__b'; b.textContent = txt; b.setAttribute('aria-label', d < 0 ? 'Diminuer' : 'Augmenter');
        b.addEventListener('click', function () { var i = Math.min(sel.options.length - 1, Math.max(1, (sel.selectedIndex || 0) + d)); if (i === sel.selectedIndex) return; sel.selectedIndex = i;
          if (window.jQuery) window.jQuery(sel).trigger('change'); else sel.dispatchEvent(new Event('change', { bubbles: true })); });
        return b; };
      w.appendChild(mk(-1, '−')); w.appendChild(sel); w.appendChild(mk(1, '+'));
    });
  }
  var PREV_TOT = null;
  function deltaPrix(tot) { // variation du prix à chaque choix : « +480 € » pendant 2 s
    if (PREV_TOT != null && !isNaN(tot) && Math.abs(tot - PREV_TOT) >= 0.01 && PREV_TOT > 0) {
      var box = P.querySelector('.cer-plan__prix'), d = tot - PREV_TOT, el = document.createElement('span');
      el.className = 'cer-plan__delta ' + (d > 0 ? 'up' : 'down'); el.textContent = (d > 0 ? '+' : '−') + money0(Math.abs(d));
      box.appendChild(el); setTimeout(function () { el.classList.add('out'); }, 1800); setTimeout(function () { el.remove(); }, 2400);
    }
    if (!isNaN(tot) && tot > 0) PREV_TOT = tot;
  }

  function draw() {
    if (!P) return;
    var L = LAST, svg = P.querySelector('#cer-sv-main'), empty = P.querySelector('.cer-plan__empty');
    Array.prototype.forEach.call(P.querySelectorAll('.cer-plan__tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-v') === VIEW); });
    if (!L) { svg.style.display = 'none'; empty.style.display = ''; P.querySelector('.cer-plan__dims').innerHTML = ''; return; }
    svg.style.display = ''; empty.style.display = 'none';
    if (!shownOnce) { shownOnce = true; if (memoGet() !== 'min') document.body.classList.remove('cer-plan-min'); }
    svg.setAttribute('data-v', VIEW === 'plan' ? 'plan' : 'vue');
    ST.scaleBar = true;                                   // barre d'échelle sur chaque vue
    ST.scale = E.commonScale(L.d, 380, 280);              // les quatre élévations à la même échelle
    ST.planScale = null;
    if (VIEW === 'plan') { svg.setAttribute('viewBox', '0 0 480 340'); E.drawPlan(svg, L.d, 480, 340); }
    else { svg.setAttribute('viewBox', '0 0 380 280'); E.drawElev(svg, L.d, VIEW, 380, 280); }
    P.querySelector('.cer-plan__dims').innerHTML = dimsList(L).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
    realisations();
    var W = E.menuWarnings(L.d).filter(function (w) { return !/pas de prix/.test(w); });
    P.querySelector('.cer-plan__warn').innerHTML = W.map(function (w) { return '<p>' + w.replace(/Ouverture (\d+)/g, function (_, n) { var m = ST.menus[n - 1]; return m ? (m.siteLabel || m.label) : 'Ouverture ' + n; }) + '</p>'; }).join('');
    renderPlaces();
    polish();
  }
  // Prix et détail de la configuration lus dans le configurateur du site (ses blocs du haut sont masqués)
  var money = function (v) { return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; };
  var numTxt = function (t) { var v = parseFloat(String(t || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')); return isNaN(v) ? NaN : v; };
  var LABELS = [
    [/^Largeur \(m\)/i, 'Largeur', 'Dimensions'], [/^Profondeur \(m\)/i, 'Profondeur', 'Dimensions'],
    [/^Largeur sur-mesure/i, 'Largeur sur mesure', 'Dimensions'], [/^profondeur sur-mesure/i, 'Profondeur sur mesure', 'Dimensions'],
    [/implantation/i, 'Implantation', 'Structure'], [/type de toiture/i, 'Toiture', 'Toiture'], [/orientation/i, 'Sens de la pente', 'Toiture'],
    [/degr[ée] de pente/i, 'Pente', 'Toiture'], [/Bandeau/i, 'Bandeau', 'Toiture'], [/couverture/i, 'Couverture', 'Toiture'], [/isolation de toiture/i, 'Isolation de toiture', 'Toiture'],
    [/goutti[èe]re/i, 'Gouttière', 'Toiture'], [/syst[èe]me constructif/i, 'Construction', 'Structure'], [/[ée]paisseur des madriers/i, 'Madriers', 'Structure'],
    [/profile? "U"/i, 'Profil « U » de finition', 'Structure'], [/type de pignon/i, 'Pignon', 'Structure'], [/bardage souhaitez/i, 'Bardage', 'Structure'],
    [/pare-pluie/i, 'Pare-pluie', 'Structure'], [/poteaux souhaitez/i, 'Poteaux', 'Structure'], [/Espacement.*largeur/i, 'Espacement des poteaux (largeur)', 'Structure'],
    [/Espacement.*profondeur/i, 'Espacement des poteaux (profondeur)', 'Structure'], [/support de poteaux/i, 'Supports de poteaux', 'Structure'],
    [/^Rehausse/i, 'Rehausses', 'Structure'], [/plancher sur/i, 'Plancher', 'Options'], [/isolation entre les montants/i, 'Isolation des murs', 'Options'],
    [/^(Fond|Gauche|Droite|Face) \(/i, null, 'Extension'], [/^Remplissage$/i, 'Côtés fermés', 'Extension'], [/Type de remplissage|type de remplissage souhaitez/i, 'Fermeture', 'Extension'],
    [/quel c[ôo]t[ée].*fermeture/i, 'Côtés fermés', 'Fermetures'], [/plancher ext[ée]rieur \?/i, 'Plancher extérieur', 'Options'], [/^Largeur en m/i, 'Plancher extérieur, largeur', 'Options'],
    [/^Profondeur en m/i, 'Plancher extérieur, profondeur', 'Options'], [/soubassement/i, 'Soubassement', 'Options'], [/livraison/i, 'Livraison', 'Livraison et pose'],
    [/pose en R[ée]gion/i, 'Pose', 'Livraison et pose'], [/Porte de garage/i, 'Porte de garage', 'Menuiseries'],
    [/^(Fen[êe]tre|Porte|Coulissant|Baie)/i, 'Menuiserie', 'Menuiseries'], [/^Option (fen[êe]tre|porte)/i, 'Option', 'Menuiseries']
  ];
  var SKIP = /Aide au choix|Afficher le d[ée]tail|^info|souhaitez-vous (une extension|rehausser|un remplissage|fermer)|^Type$|^Mati[èe]re$|^$/i;
  // Écriture homogène des valeurs du site (OUI → Oui, 28mm → 28 mm, Pente de toit 18° → 18°, 2 PANS → 2 pans)
  function nice(v) {
    v = String(v).replace(/\s+/g, ' ').trim();
    if (/^(OUI|NON)$/.test(v)) return v.charAt(0) + v.slice(1).toLowerCase();
    if (/^(1 PAN|2 PANS|TOIT PLAT|QUADRO)$/.test(v)) return v === 'QUADRO' ? 'QUADRO' : v.charAt(0) + v.slice(1).toLowerCase();
    v = v.replace(/^Pente de toit\s*/i, '').replace(/(\d)\s*mm\b/g, '$1 mm').replace(/(\d)\s*cm\b/g, '$1 cm');
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
  function detailRows() {
    var rows = [];
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-field-container'), function (c) {
      if (c.classList.contains('wapf-hide') || c.closest('.wapf-hide') || c.closest('.blocdimpr, .blocdimpr1')) return;
      if (/wapf-field-(calc|p|section)\b/.test(c.className)) return;
      var labEl = c.querySelector(':scope > .wapf-field-label'), lab = labEl ? labEl.textContent.replace(/[••]/g, '').replace(/\(\+\.\.\.\)/, '').replace(/\s+/g, ' ').trim() : '';
      if (SKIP.test(lab)) return;
      var m = null; for (var i = 0; i < LABELS.length; i++) { if (LABELS[i][0].test(lab)) { m = LABELS[i]; break; } }
      if (!m) return;
      var vals = [], price = 0;
      Array.prototype.forEach.call(c.querySelectorAll('input:checked, select, input[type=number]'), function (e) {
        if (e.type === 'hidden' || e.disabled) return;
        if (e.tagName === 'SELECT') { var o = e.options[e.selectedIndex]; if (o && o.value) vals.push(o.text.replace(/\(\+[^)]*\)/, '').trim()); return; }
        if (e.type === 'number') { if (e.value !== '' && parseFloat(e.value) !== 0) vals.push(e.value.replace('.', ',')); return; }
        vals.push((e.getAttribute('data-wapf-label') || '').trim());
        var lb = e.closest('label') || e.closest('.wapf-swatch') || e.parentElement, h = lb && lb.querySelector('.wapf-pricing-hint');
        var pv = h ? numTxt(h.textContent) : NaN; if (!isNaN(pv)) price += pv;
      });
      vals = vals.filter(function (v) { return v && !/^non$/i.test(v); });
      if (!vals.length) return;
      if (!price) { // champ numérique : le prix s'affiche dans l'indication du libellé
        var lh = labEl && labEl.querySelector('.wapf-pricing-hint'), lv = lh ? numTxt(lh.textContent) : NaN;
        if (!isNaN(lv)) price = lv;
      }
      var key = m[1] || ('Extension ' + lab.replace(/\s*\(.*$/, '').toLowerCase());
      var v = vals.map(nice).join(', ');
      if (/^(Largeur|Profondeur)$/.test(key) || /^Extension /.test(key) || /^Plancher extérieur, /.test(key)) v += ' m';
      if (key === 'Rehausses') v += ' × 13 cm';
      rows.push({ g: m[2], k: key, v: v, p: price });
    });
    var ORDER = ['Dimensions', 'Structure', 'Toiture', 'Menuiseries', 'Extension', 'Fermetures', 'Options', 'Livraison et pose'];
    return rows.map(function (r, i) { r.i = i; return r; }).sort(function (a, b) { return (ORDER.indexOf(a.g) - ORDER.indexOf(b.g)) || (a.i - b.i); });
  }
  function polish() {
    var tot = numTxt((form.querySelector('.blocdimpr1 .wapf-calc-text, .field-453ead0 .wapf-calc-text, .field-d0abad4 .wapf-calc-text') || {}).textContent);
    var base = numTxt((form.querySelector('.field-4a1fc24 .wapf-calc-text, .field-b53e07d .wapf-calc-text, .field-d0aafc5 .wapf-calc-text') || {}).textContent);
    var box = P.querySelector('.cer-plan__prix');
    if (!isNaN(tot) && tot > 0) { box.hidden = false; box.querySelector('strong').innerHTML = money(tot) + '<small>TTC</small>'; } else box.hidden = true;
    deltaPrix(tot);
    var rows = detailRows(), html = '', g = '';
    if (!isNaN(base) && base > 0 && LAST) html += '<div class="g">Votre ' + NOUN + '</div><div class="l"><span class="k">Modèle de base</span><span class="v">' + fr(LAST.s.Lr) + ' × ' + fr(LAST.s.Pr) + ' m</span><span class="p">' + money(base) + '</span></div>';
    rows.forEach(function (r) {
      if (r.g !== g) { g = r.g; html += '<div class="g">' + g + '</div>'; }
      html += '<div class="l"><span class="k">' + r.k + '</span><span class="v">' + r.v + '</span><span class="p">' + (r.p ? '+ ' + money(r.p) : '') + '</span></div>';
    });
    // Contrôle : base + options = total du site ; un écart restant est affiché tel quel (jamais de total qui ne tombe pas juste)
    if (!isNaN(tot) && tot > 0 && !isNaN(base)) {
      var ecart = Math.round((tot - base - rows.reduce(function (a, r) { return a + (r.p || 0); }, 0)) * 100) / 100;
      if (Math.abs(ecart) >= 0.01) html += '<div class="l"><span class="k">Autres éléments de la configuration</span><span class="v">calculés par le configurateur</span><span class="p">' + (ecart > 0 ? '+\u00a0' : '−\u00a0') + money(Math.abs(ecart)) + '</span></div>';
    }
    if (!isNaN(tot) && tot > 0) html += '<div class="tot"><span>Total TTC</span><span>' + money(tot) + '</span></div>';
    P.querySelector('.cer-plan__lignes').innerHTML = html || '<p class="cer-plan__hint">Le détail apparaît au fil de vos choix.</p>';
  }


  // ── Images jointes au panier (vues dessinées, rendues en JPEG) ──
  function svgToJpeg(svg, w, h) {
    return new Promise(function (resolve) {
      var c = svg.cloneNode(true);
      c.setAttribute('width', w); c.setAttribute('height', h);
      c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var src = new XMLSerializer().serializeToString(c);
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        try { resolve(cv.toDataURL('image/jpeg', 0.9)); } catch (e) { resolve(''); }
      };
      img.onerror = function () { resolve(''); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    });
  }
  var OFF = null;
  function offscreen() {
    if (OFF) return OFF;
    OFF = document.createElement('div');
    OFF.style.cssText = 'position:absolute;left:-10000px;top:0;width:10px;height:10px;overflow:hidden';
    OFF.innerHTML = ['plan', 'face', 'gauche', 'droite', 'fond'].map(function (v) { return '<svg id="cer-off-' + v + '" xmlns="http://www.w3.org/2000/svg"></svg>'; }).join('');
    document.body.appendChild(OFF);
    return OFF;
  }
  var IMG_STATE = { sig: '', busy: null };
  function signature() { return JSON.stringify([ST.cfg, ST.menus.map(function (m) { return [m.preset, m.wall, m.pos, m.rail, m.opt, m.seuil]; }), ST.ext, ST.site]); }
  function attach() {
    if (!LAST) return Promise.resolve(false);
    var sig = signature();
    if (sig === IMG_STATE.sig && form.querySelector('input[name="cer_plan[config]"]')) return Promise.resolve(true);
    if (IMG_STATE.busy) return IMG_STATE.busy;
    offscreen();
    var jobs = [], d = LAST.d, scales = {};
    ST.scaleBar = true; ST.scale = E.commonScale(d, 380, 280); ST.planScale = null;
    ['plan', 'face', 'gauche', 'droite', 'fond'].forEach(function (v) {
      var svg = document.getElementById('cer-off-' + v);
      if (v === 'plan') { svg.setAttribute('viewBox', '0 0 480 340'); E.drawPlan(svg, d, 480, 340); jobs.push(svgToJpeg(svg, 1440, 1020).then(function (u) { return [v, u]; })); }
      else { svg.setAttribute('viewBox', '0 0 380 280'); E.drawElev(svg, d, v, 380, 280); jobs.push(svgToJpeg(svg, 1330, 980).then(function (u) { return [v, u]; })); }
      scales[v] = parseFloat(svg.getAttribute('data-sc')) || null; // unités du dessin par mètre : impression à l'échelle dans le devis
    });
    IMG_STATE.busy = Promise.all(jobs).then(function (res) {
      Array.prototype.forEach.call(form.querySelectorAll('input[name^="cer_plan["]'), function (e) { e.remove(); });
      var add = function (n, v) { var i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; form.appendChild(i); };
      res.forEach(function (r) { if (r[1]) add('cer_plan[vues][' + r[0] + ']', r[1]); });
      add('cer_plan[config]', JSON.stringify({
        v: CFG.version || '', kind: CFG.kind, cfg: ST.cfg, ext: ST.ext, site: ST.site,
        menus: ST.menus.map(function (m) { return { preset: m.preset, label: m.siteLabel || m.label, code: m.code, type: m.type, lw: m.lw, lh: m.lh, wall: m.wall, pos: m.pos, seuil: m.seuil, rail: m.rail, opt: m.opt }; }),
        gdoor: LAST.gdoor, dims: dimsList(LAST), warnings: E.menuWarnings(d),
        scales: scales, vb: { elev: [380, 280], plan: [480, 340] }, d: { L: d.L, P: d.P, htL: d.htL, htP: d.htP, intL: d.intL, intP: d.intP, hInt: d.hInt, hExt: d.hExt, rH: d.rH, soub: d.base || 0, pente: d.pente, toit: d.toit }
      }));
      IMG_STATE.sig = sig; IMG_STATE.busy = null;
      return true;
    });
    return IMG_STATE.busy;
  }

  // ── Mise à jour (après chaque choix, avec un léger délai) ──
  var tmr = null, imgTmr = null;
  function schedule(ms, keepPlace) {
    clearTimeout(tmr);
    tmr = setTimeout(function () {
      try { read(); } catch (e) { LAST = null; if (window.console) console.warn('[Cerisier plan]', e); }
      draw();
      try { habiller(); } catch (e) { if (window.console) console.warn('[Cerisier habillage]', e); }
      clearTimeout(imgTmr);
      imgTmr = setTimeout(function () { attach(); }, 1500);
    }, ms == null ? 120 : ms);
  }

  function init() {
    form = document.querySelector('form.cart');
    if (!form || !form.querySelector('.wapf-wrapper, .wapf-field-group')) return;
    build();
    form.addEventListener('change', function () { schedule(); });
    form.addEventListener('input', function () { schedule(250); });
    form.addEventListener('click', function (e) { if (e.target.closest('.wapf-add-clone, .wapf-del-clone, .wapf-swatch, label')) schedule(200); });
    new MutationObserver(function () { schedule(300); }).observe(form, { childList: true, subtree: true });
    // Ajout au panier : les vues doivent être jointes et à jour
    form.addEventListener('submit', function (e) {
      if (!LAST) return;
      if (signature() === IMG_STATE.sig && form.querySelector('input[name="cer_plan[config]"]')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var sub = e.submitter;
      attach().then(function () { if (form.requestSubmit) form.requestSubmit(sub || undefined); else form.submit(); });
    }, true);
    schedule(0);
  }
  window.CerConfigurateur = { read: function () { return read(); }, attach: attach, draw: draw, state: function () { return LAST; }, place: PLACE,
    setAdosSide: function (s) { adosSide = s; schedule(0); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
