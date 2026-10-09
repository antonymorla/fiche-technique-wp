<?php
/**
 * Devis Abri Cerisier, mise en page dédiée (configurateurs abri, garage, carport).
 *
 * Branché sur le générateur de devis commun par le filtre `wqg_quote_pdf` (même mécanisme que le nouveau devis
 * d'Abri Français) : renvoie le PDF, ou null pour laisser le générateur produire l'ancien devis.
 *
 * Règle d'or : au moindre doute, null (ancien devis, jamais un devis faux).
 *   - un configurateur du panier sans plans joints ;
 *   - modèle de base + options ≠ prix de la ligne du panier ;
 *   - total du devis ≠ total du panier ;
 *   - lignes manuelles du commercial (gardées sur l'ancien devis).
 * Tous les montants viennent du panier (prix retenus par le configurateur), aucun n'est recalculé.
 */
defined( 'ABSPATH' ) || exit;

add_filter( 'wqg_quote_pdf', 'cer_devis_pdf', 20, 2 );

// Essais de l'équipe : avec le cookie cer_essai_devis, pas de mail « Un de vos clients a généré un devis » (Bérénice n'est pas dérangée)
add_filter( 'pre_wp_mail', function ( $retour, $atts ) {
	if ( isset( $_COOKIE['cer_essai_devis'] ) && 'sans-mail' === $_COOKIE['cer_essai_devis'] // phpcs:ignore
		&& 0 === strpos( (string) ( $atts['subject'] ?? '' ), 'Un de vos clients a généré un devis' ) ) {
		return true;
	}
	return $retour;
}, 10, 2 );

function cer_devis_pdf( $pdf, $client ) {
	if ( null !== $pdf || ! function_exists( 'WC' ) || ! WC()->cart || ! function_exists( 'cer_cfg_produits' ) ) {
		return $pdf;
	}
	$mode = function_exists( 'cer_cfg_mode' ) ? cer_cfg_mode() : 'off';
	if ( 'off' === $mode ) {
		return null;
	}
	try {
		if ( ! empty( $client['manual_items'] ) ) {
			throw new RuntimeException( 'lignes manuelles' );
		}
		$d = cer_devis_donnees( WC()->cart, (array) $client );
		if ( ! $d ) {
			return null; // pas de configurateur avec plans dans ce panier : ancien devis
		}
		// lien de commande créé seulement une fois les contrôles passés
		if ( function_exists( 'wqg_create_shared_cart' ) && function_exists( 'wqg_get_shared_cart_url' ) ) {
			$d['lien'] = wqg_get_shared_cart_url( wqg_create_shared_cart( [] ) );
		}
		$vendor = WP_PLUGIN_DIR . '/woocommerce-quote-generator/vendor';
		return cer_devis_rendre( $d, $vendor );
	} catch ( Throwable $e ) {
		error_log( '[devis Cerisier] ancien devis utilisé : ' . $e->getMessage() );
		return null;
	}
}

/** Nombre au format du site (« 1 234,50 ») ou texte d'indication « (+168,00 €) » → float. */
function cer_devis_num( $t ) {
	$t = html_entity_decode( wp_strip_all_tags( (string) $t ), ENT_QUOTES, 'UTF-8' );
	if ( ! preg_match( '/-?[\d\s\x{202F}\x{00A0}.]*\d(?:,\d+)?/u', $t, $m ) ) {
		return null;
	}
	$n = preg_replace( '/[\s\x{202F}\x{00A0}]/u', '', $m[0] );
	$n = str_replace( ',', '.', preg_replace( '/\.(?=\d{3}(\D|$))/', '', $n ) );
	return is_numeric( $n ) ? (float) $n : null;
}

/**
 * Libellé de champ du configurateur → [groupe, libellé propre] ; null = ligne non reprise.
 * Même table que le panneau « Votre abri en direct » (cer-configurateur.js, LABELS), pour que le devis dise la même chose.
 */
function cer_devis_libelle( $lab ) {
	$l = html_entity_decode( wp_strip_all_tags( (string) $lab ), ENT_QUOTES, 'UTF-8' );
	$l = trim( preg_replace( '/\s+/u', ' ', str_replace( [ '•', '(+...)' ], '', $l ) ) );
	$l = preg_replace( '/^MENUISERIE N°\s*\d+\s*-\s*/iu', '', $l ); // menuiseries ajoutées : « MENUISERIE N°2 - Porte Contemporaine »
	if ( '' === $l || preg_match( '/Aide au choix|Afficher le d[ée]tail|^info|souhaitez-vous (une extension|rehausser|un remplissage|fermer)|^Type$|^Mati[èe]re$|^Style$|^PRIX/iu', $l ) ) {
		return null;
	}
	$T = [
		[ '/^Largeur \(m\)/i', 'Largeur', 'Dimensions' ], [ '/^Profondeur \(m\)/i', 'Profondeur', 'Dimensions' ],
		[ '/^Largeur sur-mesure/i', 'Largeur sur mesure', 'Dimensions' ], [ '/^profondeur sur-mesure/i', 'Profondeur sur mesure', 'Dimensions' ],
		[ '/implantation/i', 'Implantation', 'Structure' ], [ '/type de toiture/i', 'Toiture', 'Toiture' ], [ '/orientation/i', 'Sens de la pente', 'Toiture' ],
		[ '/degr[ée] de pente/i', 'Pente', 'Toiture' ], [ '/Bandeau/i', 'Bandeau', 'Toiture' ], [ '/couverture/i', 'Couverture', 'Toiture' ], [ '/isolation de toiture/i', 'Isolation de toiture', 'Toiture' ],
		[ '/goutti[èe]re/i', 'Gouttière', 'Toiture' ], [ '/syst[èe]me constructif/i', 'Construction', 'Structure' ], [ '/[ée]paisseur des madriers/i', 'Madriers', 'Structure' ],
		[ '/profile? "U"/i', 'Profil « U » de finition', 'Structure' ], [ '/type de pignon/i', 'Pignon', 'Structure' ], [ '/bardage souhaitez/i', 'Bardage', 'Structure' ],
		[ '/pare-pluie/i', 'Pare-pluie', 'Structure' ], [ '/poteaux souhaitez/i', 'Poteaux', 'Structure' ], [ '/Espacement.*largeur/i', 'Espacement des poteaux (largeur)', 'Structure' ],
		[ '/Espacement.*profondeur/i', 'Espacement des poteaux (profondeur)', 'Structure' ], [ '/support de poteaux/i', 'Supports de poteaux', 'Structure' ],
		[ '/^Rehausse/i', 'Rehausses', 'Structure' ], [ '/plancher sur/i', 'Plancher', 'Options' ], [ '/isolation entre les montants/i', 'Isolation des murs', 'Options' ],
		[ '/^(Fond|Gauche|Droite|Face)$/i', null, 'Extension' ], [ '/^Remplissage$/i', 'Côtés fermés', 'Extension' ], [ '/Type de remplissage|type de remplissage souhaitez/i', 'Fermeture', 'Extension' ],
		[ '/quel c[ôo]t[ée].*fermeture/i', 'Côtés fermés', 'Fermetures' ], [ '/plancher ext[ée]rieur \?/i', 'Plancher extérieur', 'Options' ], [ '/^Largeur en m/i', 'Plancher extérieur, largeur', 'Options' ],
		[ '/^Profondeur en m/i', 'Plancher extérieur, profondeur', 'Options' ], [ '/soubassement/i', 'Soubassement', 'Options' ], [ '/livraison/i', 'Livraison', 'Livraison et pose' ],
		[ '/pose en R[ée]gion/i', 'Pose', 'Livraison et pose' ], [ '/Porte de garage/i', 'Porte de garage', 'Menuiseries' ],
		[ '/^(Fen[êe]tre|Porte|Coulissant|Baie)/i', 'Menuiserie', 'Menuiseries' ], [ '/^Option (fen[êe]tre|porte)/i', 'Option', 'Menuiseries' ],
	];
	foreach ( $T as $r ) {
		if ( preg_match( $r[0] . 'u', $l ) ) {
			return [ $r[2], $r[1] ?? ( 'Extension ' . mb_strtolower( preg_replace( '/\s*\(.*$/u', '', $l ) ) ) ];
		}
	}
	return [ '', $l ]; // champ inconnu : repris seulement s'il est payant
}

function cer_devis_valeur( $v ) {
	$v = trim( preg_replace( '/\s+/u', ' ', $v ) );
	if ( preg_match( '/^(OUI|NON)$/', $v ) ) {
		return ucfirst( strtolower( $v ) );
	}
	if ( preg_match( '/^(1 PAN|2 PANS|TOIT PLAT)$/', $v ) ) {
		return ucfirst( strtolower( $v ) );
	}
	$v = preg_replace( [ '/^Pente de toit\s*/iu', '/(\d)\s*mm\b/u', '/(\d)\s*cm\b/u' ], [ '', '$1 mm', '$1 cm' ], $v );
	return mb_strtoupper( mb_substr( $v, 0, 1 ) ) . mb_substr( $v, 1 );
}

/**
 * Composition d'une ligne configurateur : prix du modèle de base et options retenues, lus dans le panier.
 * Chaque option garde le prix affiché par le configurateur ; un champ inconnu mais payant est repris tel quel.
 */
function cer_devis_composition( array $it ) {
	$opts = function_exists( 'wqg_get_cart_item_options' ) ? wqg_get_cart_item_options( $it ) : [];
	$base = null;
	$rows = [];
	foreach ( $opts as $o ) {
		$lab = html_entity_decode( wp_strip_all_tags( (string) $o['label'] ), ENT_QUOTES, 'UTF-8' );
		$val = html_entity_decode( wp_strip_all_tags( (string) $o['value'] ), ENT_QUOTES, 'UTF-8' );
		if ( preg_match( '/^PRIX$/i', trim( $lab ) ) ) {
			$base = cer_devis_num( $val );
			continue;
		}
		$map  = cer_devis_libelle( $lab );
		$prix = 0.0;
		if ( preg_match_all( '/\(\s*\+\s*([^)]*?€)\s*\)/u', $val, $mm, PREG_SET_ORDER ) ) {
			foreach ( $mm as $m ) {
				$prix += (float) cer_devis_num( $m[1] );
				$val   = str_replace( $m[0], '', $val );
			}
		}
		$val = trim( preg_replace( '/\s*,\s*(,\s*)*/u', ', ', $val ), " ,\t" );
		if ( ! $map || ( '' === $map[0] && ! $prix ) ) {
			continue;
		}
		if ( '' === $val || ( preg_match( '/^non$/i', $val ) && ! $prix ) ) {
			continue;
		}
		$val = implode( ', ', array_map( 'cer_devis_valeur', explode( ', ', $val ) ) );
		$cle = $map[1];
		if ( ( in_array( $cle, [ 'Largeur', 'Profondeur' ], true ) || 0 === strpos( $cle, 'Extension ' ) || 0 === strpos( $cle, 'Plancher extérieur, ' ) ) && ! preg_match( '/\bm$/u', $val ) ) {
			$val .= ' m';
		}
		if ( 'Rehausses' === $cle ) {
			$val .= ' × 13 cm';
		}
		if ( in_array( $cle, [ 'Largeur', 'Profondeur' ], true ) && ! $prix ) {
			continue; // reprises dans la ligne du modèle de base
		}
		$rows[] = [ $map[0] ?: 'Options', $cle, $val, round( $prix, 2 ) ];
	}
	// La couverture figure toujours sur le devis : si le client ne l'a pas choisie (question facultative), on le dit.
	if ( ! in_array( 'Couverture', array_column( $rows, 1 ), true ) ) {
		$rows[] = [ 'Toiture', 'Couverture', 'Non choisie dans la configuration, à préciser avec votre conseiller', null ];
	}
	$ordre = [ 'Dimensions', 'Structure', 'Toiture', 'Menuiseries', 'Extension', 'Fermetures', 'Options', 'Livraison et pose' ];
	foreach ( $rows as $i => &$r ) {
		$r[4] = $i;
	}
	unset( $r );
	usort( $rows, function ( $a, $b ) use ( $ordre ) {
		return ( array_search( $a[0], $ordre, true ) <=> array_search( $b[0], $ordre, true ) ) ?: ( $a[4] <=> $b[4] );
	} );
	return [ $base, $rows ];
}

/** Données du devis lues dans le panier ; null si le panier n'a pas de configurateur avec plans. */
function cer_devis_donnees( WC_Cart $cart, array $client ) {
	$produits  = cer_cfg_produits();
	$avec_plan = false;
	$lignes    = [];
	$tva       = 0.0; // TVA réelle après remises, comme le générateur de devis
	foreach ( $cart->get_cart() as $it ) {
		$kind = $produits[ (int) ( $it['product_id'] ?? 0 ) ] ?? null;
		$prod = $it['data'] ?? null;
		$qte  = max( 1, (int) ( $it['quantity'] ?? 1 ) );
		$l_ht = round( (float) ( $it['line_subtotal'] ?? 0 ), 2 );
		$l_tx = round( (float) ( $it['line_subtotal_tax'] ?? 0 ), 2 );
		$tva += (float) ( $it['line_tax'] ?? $l_tx );
		$ttc  = round( $l_ht + $l_tx, 2 );
		if ( ! $kind ) {
			$img = '';
			if ( $prod && $prod->get_image_id() && function_exists( 'wqg_get_image_for_mpdf' ) ) {
				$img = (string) wqg_get_image_for_mpdf( (int) $prod->get_image_id(), 'woocommerce_thumbnail' );
			}
			$lignes[] = [ 'type' => 'produit', 'nom' => $prod ? $prod->get_name() : '', 'qte' => $qte, 'ht' => $l_ht, 'tva' => $l_tx, 'ttc' => $ttc, 'img' => $img ];
			continue;
		}
		if ( empty( $it['cer_plan'] ) ) {
			throw new RuntimeException( 'configurateur sans plans joints' );
		}
		$avec_plan = true;
		$conf = cer_cfg_config( $it['cer_plan'] );
		$vues = [];
		foreach ( [ 'face', 'gauche', 'droite', 'fond', 'plan' ] as $nom ) {
			$f = cer_cfg_vue( $it['cer_plan'], $nom );
			if ( $f ) {
				$vues[ $nom ] = $f[0];
			}
		}
		if ( empty( $vues['face'] ) || empty( $vues['plan'] ) || ! $conf ) {
			throw new RuntimeException( 'vues ou configuration manquantes' );
		}
		list( $base, $rows ) = cer_devis_composition( $it );
		if ( null === $base ) {
			throw new RuntimeException( 'prix du modèle de base absent' );
		}
		$somme = round( $base + array_sum( array_column( $rows, 3 ) ), 2 );
		$unite = round( $ttc / $qte, 2 );
		if ( abs( $somme - $unite ) > 0.02 ) {
			throw new RuntimeException( sprintf( 'composition %.2f ≠ ligne du panier %.2f', $somme, $unite ) );
		}
		$lignes[] = [ 'type' => 'config', 'kind' => $kind, 'nom' => $prod ? $prod->get_name() : '', 'qte' => $qte, 'ht' => $l_ht, 'tva' => $l_tx, 'ttc' => $ttc,
			'base' => $base, 'rows' => $rows, 'vues' => $vues, 'conf' => $conf ];
	}
	if ( ! $avec_plan ) {
		return null;
	}
	// Remises (montants TTC) et livraison choisie, lues comme le générateur de devis
	$remises = [];
	$masquer = '1' === get_option( 'wqg_hide_coupon_codes', '0' );
	$parcode = $cart->get_coupon_discount_totals();
	$partax  = $cart->get_coupon_discount_tax_totals();
	foreach ( $cart->get_applied_coupons() as $code ) {
		$r = round( (float) ( $parcode[ $code ] ?? 0 ) + (float) ( $partax[ $code ] ?? 0 ), 2 );
		if ( $r > 0 ) {
			$remises[] = [ $masquer ? 'Remise' : 'Remise ' . strtoupper( $code ), $r ];
		}
	}
	$liv_ht  = round( (float) $cart->get_shipping_total(), 2 );
	$liv_tx  = round( (float) $cart->get_shipping_tax(), 2 );
	$tva    += $liv_tx;
	$liv_lib = '';
	if ( WC()->session ) {
		foreach ( (array) WC()->session->get( 'chosen_shipping_methods', [] ) as $id ) {
			$p = explode( ':', (string) $id, 2 );
			$s = isset( $p[1] ) ? (array) get_option( 'woocommerce_' . $p[0] . '_' . (int) $p[1] . '_settings', [] ) : [];
			$liv_lib = trim( (string) ( $s['title'] ?? '' ) );
		}
	}
	$avant  = round( array_sum( array_column( $lignes, 'ttc' ) ), 2 );
	$total  = round( $avant - array_sum( array_column( $remises, 1 ) ) + $liv_ht + $liv_tx, 2 );
	$panier = round( (float) $cart->get_total( 'edit' ), 2 );
	if ( abs( $total - $panier ) > 0.05 ) {
		throw new RuntimeException( sprintf( 'total %.2f ≠ panier %.2f', $total, $panier ) );
	}
	$tva = round( $tva, 2 );
	// Société, conseiller, client
	$logo = (string) get_option( 'wqg_company_logo', '' );
	if ( $logo && function_exists( 'wqg_url_to_local_path' ) ) {
		$logo = (string) wqg_url_to_local_path( $logo );
	}
	$adresse = trim( (string) ( $client['address'] ?? '' ) );
	$dep     = '';
	if ( function_exists( 'cer_devis_departement_du_cp' ) && preg_match_all( '/(?<!\d)(\d{5})(?!\d)/', $adresse, $mm ) ) {
		$x   = cer_devis_departement_du_cp( end( $mm[1] ) );
		$dep = $x ? $x[0] . ' – ' . $x[1] : '';
	}
	$paris = new DateTimeZone( 'Europe/Paris' );
	return [
		'numero'     => (string) ( $client['quote_number'] ?? '' ),
		'date'       => wp_date( 'd/m/Y', null, $paris ),
		'valable'    => wp_date( 'd/m/Y', strtotime( '+1 week' ), $paris ),
		'societe'    => [ 'nom' => (string) get_option( 'wqg_company_name', '' ), 'adresse' => (string) get_option( 'wqg_company_address', '' ),
			'logo' => ( $logo && is_file( $logo ) ) ? $logo : '', 'pied' => trim( wp_strip_all_tags( (string) get_option( 'wqg_custom_footer', '' ) ) ), 'cgv' => (string) get_option( 'wqg_terms_conditions_url', '' ) ],
		'conseiller' => array_filter( (array) ( $client['sales_rep'] ?? [] ) ),
		'client'     => [ 'nom' => trim( ( $client['name'] ?? '' ) . ' ' . ( $client['surname'] ?? '' ) ), 'adresse' => $adresse, 'departement' => $dep,
			'tel' => (string) ( $client['phone'] ?? '' ), 'email' => (string) ( $client['email'] ?? '' ) ],
		'lignes'     => $lignes,
		'remises'    => $remises,
		'livraison'  => [ 'libelle' => $liv_lib, 'ttc' => round( $liv_ht + $liv_tx, 2 ) ],
		'eco'        => function_exists( 'wqg_eco_participation' ) ? wqg_eco_participation() : null,
		'total_ttc'  => $total,
		'total_tva'  => $tva,
		'total_ht'   => round( $total - $tva, 2 ),
		'lien'       => '',
	];
}

/**
 * Échelle d'impression commune à toutes les vues d'une configuration : la plus grande échelle normalisée
 * (1:50, 1:75, 1:100…) qui fait tenir le plan de masse et chaque élévation dans leur cadre A4.
 * 0 si l'échelle des dessins est inconnue (vues jointes avant cette version) : les vues restent cotées, sans échelle.
 */
function cer_devis_echelle( array $sc, array $vb ) {
	$ve = $vb['elev'] ?? [ 380, 280 ];
	$vp = $vb['plan'] ?? [ 480, 340 ];
	foreach ( [ 50, 75, 100, 125, 150, 200, 250 ] as $E ) {
		$ok = ! empty( $sc['plan'] ) && $vp[0] / $sc['plan'] * 1000 / $E <= 180 && $vp[1] / $sc['plan'] * 1000 / $E <= 125;
		foreach ( [ 'face', 'gauche', 'droite', 'fond' ] as $v ) {
			$ok = $ok && ! empty( $sc[ $v ] ) && $ve[0] / $sc[ $v ] * 1000 / $E <= 180 && $ve[1] / $sc[ $v ] * 1000 / $E <= 100;
		}
		if ( $ok ) {
			return $E;
		}
	}
	return 0;
}

/** Rendu du PDF (fonction pure : données → PDF). */
function cer_devis_rendre( array $d, $vendor ) {
	require_once $vendor . '/autoload.php';
	if ( ! class_exists( 'Mpdf\QrCode\QrCode' ) ) {
		spl_autoload_register( function ( $c ) {
			if ( 0 === strpos( $c, 'Mpdf\\QrCode\\' ) ) {
				$f = __DIR__ . '/qrcode/src/' . str_replace( '\\', '/', substr( $c, 12 ) ) . '.php';
				if ( is_file( $f ) ) {
					require $f;
				}
			}
		} );
	}
	$e   = function ( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); };
	$eur = function ( $v ) { return number_format( (float) $v, 2, ',', "\u{202F}" ) . "\u{00A0}€"; };
	$num = function ( $v ) { return number_format( (float) $v, 2, ',', "\u{202F}" ); };
	$mm  = function ( $v ) { return round( $v, 2 ) . 'mm'; };
	$noms = [ 'abri' => 'Abri de jardin', 'garage' => 'Garage', 'carport' => 'Carport' ];
	$murs = [ 'face' => 'Façade', 'gauche' => 'Côté gauche', 'droite' => 'Côté droit', 'fond' => 'Fond' ];
	$configs = array_values( array_filter( $d['lignes'], function ( $l ) { return 'config' === $l['type']; } ) );
	$autres  = array_values( array_filter( $d['lignes'], function ( $l ) { return 'produit' === $l['type']; } ) );
	$plusieurs = count( $configs ) > 1;

	$titre = function ( $L ) use ( $noms ) {
		$cfg  = (array) ( $L['conf']['cfg'] ?? [] );
		$sys  = [ 'madrier28' => 'madrier 28 mm', 'madrier45' => 'madrier 45 mm', 'ossature' => 'ossature bois' ][ $cfg['f-sys'] ?? '' ] ?? '';
		$toit = [ '1PAN' => 'toit 1 pan', '2PANS' => 'toit 2 pans', 'TOIT_PLAT' => 'toit plat', 'QUADRO' => 'toit QUADRO' ][ $cfg['f-toit'] ?? '' ] ?? '';
		return trim( $noms[ $L['kind'] ] . ( 'carport' !== $L['kind'] && $sys ? ' en ' . $sys : '' ) . ( $toit ? ', ' . $toit : '' ) );
	};
	$entete = function ( $kick, $h ) use ( $e ) {
		return '<div class="kick">' . $e( $kick ) . '</div><h2>' . $e( $h ) . '</h2>';
	};

	ob_start();
	// ─── Couverture et détail chiffré, pour chaque configuration ───
	foreach ( $configs as $n => $L ) {
		$c    = $L['conf'];
		$dd   = (array) ( $c['d'] ?? [] );
		$dims = (array) ( $c['dims'] ?? [] );
		$nom  = mb_strtolower( $noms[ $L['kind'] ] );
		$s    = [];
		if ( 'carport' === $L['kind'] && ! empty( $dd['htL'] ) ) {
			$s[] = $num( $dd['htL'] ) . ' × ' . $num( $dd['htP'] ) . ' m hors tout';
			$s[] = $num( $dd['htL'] * $dd['htP'] ) . ' m² couverts';
		} elseif ( ! empty( $dd['L'] ) ) {
			$s[] = $num( $dd['L'] ) . ' × ' . $num( $dd['P'] ) . ' m';
			if ( ! empty( $dd['intL'] ) ) {
				$s[] = $num( $dd['intL'] * $dd['intP'] ) . ' m² intérieurs';
			}
		}
		if ( isset( $dd['hExt'], $dd['rH'] ) ) {
			$s[] = 'faîtage à ' . $num( $dd['hExt'] + $dd['rH'] + (float) ( $dd['soub'] ?? 0 ) ) . ' m';
		}
		$taux = $L['ht'] > 0 ? round( $L['tva'] / $L['ht'] * 100, 1 ) : 0;
		if ( $n ) {
			echo '<pagebreak />';
		}
		?>
<div class="kick">Votre projet sur mesure<?= $plusieurs ? ' · ' . ( $n + 1 ) . ' / ' . count( $configs ) : '' ?></div>
<h1><?= $e( $titre( $L ) ) ?></h1>
<div class="sous"><?= $e( implode( ' · ', $s ) ) ?></div>
<div class="hero"><img src="<?= $e( $L['vues']['face'] ) ?>" style="width:150mm;height:110.53mm" /></div>
<table width="100%" class="chiffres"><tr>
<?php foreach ( array_slice( $dims, 0, 4 ) as $k ) : ?>
  <td width="25%"><div class="cl"><?= $e( $k[0] ) ?></div><div class="cv"><?= $e( $k[1] ) ?></div></td>
<?php endforeach; ?>
</tr></table>
<table width="100%" class="blocs"><tr>
  <td width="50%" class="bloc"><div class="kick">Préparé pour</div>
    <div class="fort"><?= $e( $d['client']['nom'] ) ?></div>
    <div><?= nl2br( $e( $d['client']['adresse'] ) ) ?></div>
    <?php if ( $d['client']['departement'] ) : ?><div class="petit">Département <?= $e( $d['client']['departement'] ) ?></div><?php endif; ?>
    <div class="petit"><?= $e( implode( ' · ', array_filter( [ $d['client']['tel'], $d['client']['email'] ] ) ) ) ?></div></td>
  <td width="50%" class="bloc"><div class="kick">Votre conseiller</div>
    <?php if ( ! empty( $d['conseiller']['name'] ) ) : ?><div class="fort"><?= $e( $d['conseiller']['name'] ) ?></div>
    <div class="petit"><?= $e( implode( ' · ', array_filter( [ $d['conseiller']['phone'] ?? '', $d['conseiller']['email'] ?? '' ] ) ) ) ?></div><?php endif; ?>
    <div class="petit" style="margin-top:1.5mm"><?= $e( $d['societe']['nom'] ) ?><br /><?= $e( preg_replace( '/\s*\n\s*/', ', ', trim( $d['societe']['adresse'] ) ) ) ?></div></td>
</tr></table>
<div class="prix"><table width="100%"><tr>
  <td><div class="pk">Prix de votre <?= $e( $nom ) ?> configuré<?= $L['qte'] > 1 ? ' (× ' . (int) $L['qte'] . ')' : '' ?></div>
    <div class="ps">soit <?= $eur( $L['ht'] ) ?> HT + <?= $eur( $L['tva'] ) ?> de TVA (<?= $e( str_replace( '.', ',', (string) $taux ) ) ?> %)</div></td>
  <td class="r"><span class="pv"><?= $eur( $L['ttc'] ) ?></span><span class="pt"> TTC</span></td>
</tr></table></div>
<pagebreak />
<?= $entete( 'Le détail de votre ' . $nom, $titre( $L ) ) ?>
<table width="100%" class="det">
  <tr class="grp"><td colspan="3">Modèle</td></tr>
  <tr><td class="k">Modèle de base</td><td><?= $e( $noms[ $L['kind'] ] ) ?><?php
		if ( 'carport' === $L['kind'] && ! empty( $dd['htL'] ) ) {
			echo ' ' . $e( $num( $dd['htL'] ) . ' × ' . $num( $dd['htP'] ) . ' m hors tout' );
		} elseif ( ! empty( $dd['L'] ) ) {
			echo ' ' . $e( $num( $dd['L'] ) . ' × ' . $num( $dd['P'] ) . ' m' );
		}
		?></td><td class="r"><?= $eur( $L['base'] ) ?></td></tr>
<?php $g = ''; foreach ( $L['rows'] as $r ) : if ( $r[0] !== $g ) : $g = $r[0]; ?>
  <tr class="grp"><td colspan="3"><?= $e( $g ) ?></td></tr>
<?php endif; ?>
  <tr><td class="k"><?= $e( $r[1] ) ?></td><td><?= $e( $r[2] ) ?></td><td class="r"><?= null === $r[3] ? '' : ( $r[3] ? '+ ' . $eur( $r[3] ) : '<span class="inclus">inclus</span>' ) ?></td></tr>
<?php endforeach; ?>
  <tr class="st"><td colspan="2">Prix de la configuration<?= $L['qte'] > 1 ? ' × ' . (int) $L['qte'] : '' ?>, TTC</td><td class="r"><?= $eur( $L['ttc'] ) ?></td></tr>
</table>
		<?php
	}
	if ( $autres ) :
		?>
<div class="kick" style="margin-top:7mm">Articles complémentaires</div>
<table width="100%" class="det">
<?php foreach ( $autres as $a ) : ?>
  <tr><td><?= $e( $a['nom'] ) ?></td><td class="r" width="14%"><?= (int) $a['qte'] ?> ×</td><td class="r" width="22%"><?= $eur( $a['ttc'] ) ?></td></tr>
<?php endforeach; ?>
</table>
<?php endif; ?>
<table class="totaux" width="48%" align="right">
<?php if ( $d['remises'] || $d['livraison']['ttc'] > 0 || $autres || $plusieurs ) : ?>
  <tr><td>Sous-total</td><td class="r"><?= $eur( array_sum( array_column( $d['lignes'], 'ttc' ) ) ) ?></td></tr>
<?php endif; ?>
<?php foreach ( $d['remises'] as $r ) : ?><tr><td class="remise"><?= $e( $r[0] ) ?></td><td class="r remise">− <?= $eur( $r[1] ) ?></td></tr><?php endforeach; ?>
<?php if ( $d['livraison']['ttc'] > 0 ) : ?><tr><td>Livraison</td><td class="r"><?= $eur( $d['livraison']['ttc'] ) ?></td></tr><?php endif; ?>
  <tr><td class="m">Total HT</td><td class="r m"><?= $eur( $d['total_ht'] ) ?></td></tr>
  <tr><td class="m">TVA</td><td class="r m"><?= $eur( $d['total_tva'] ) ?></td></tr>
  <tr class="ttc"><td>Total TTC</td><td class="r"><?= $eur( $d['total_ttc'] ) ?></td></tr>
<?php if ( ! empty( $d['eco']['montant'] ) ) : ?><tr><td class="petit">dont <?= $e( $d['eco']['libelle'] ) ?></td><td class="r petit"><?= $eur( $d['eco']['montant'] ) ?></td></tr><?php endif; ?>
</table>
<div style="clear:both"></div>
<table width="100%" class="cond"><tr>
  <td width="<?= $d['lien'] ? '76%' : '100%' ?>"><div class="kick">Conditions</div>
    <p>Devis valable jusqu'au <?= $e( $d['valable'] ) ?>. Prix en euros TTC, TVA comprise ; livraison et pose selon les options retenues ci-dessus.</p>
    <p>Plans et cotes établis d'après votre configuration ; ils sont repris avec votre conseiller avant la mise en fabrication.</p>
    <?php if ( $d['societe']['cgv'] ) : ?><p>Conditions générales de vente : <?= $e( $d['societe']['cgv'] ) ?></p><?php endif; ?>
    <?php if ( $d['lien'] ) : ?><p><span class="fort">Commander en ligne :</span> scannez le code ou ouvrez le lien ci-dessous, votre configuration est conservée 60 jours.<br /><a href="<?= $e( $d['lien'] ) ?>" class="lien"><?= $e( preg_replace( '#^https?://#', '', $d['lien'] ) ) ?></a></p><?php endif; ?></td>
  <?php if ( $d['lien'] ) : ?><td width="24%" class="r"><barcode code="<?= $e( $d['lien'] ) ?>" type="QR" size="0.95" error="M" disableborder="1" /></td><?php endif; ?>
</tr></table>
<?php
	// ─── Plan de masse, fiche technique, menuiseries ; puis élévations, deux par page ───
	foreach ( $configs as $L ) {
		$c  = $L['conf'];
		$sc = (array) ( $c['scales'] ?? [] );
		$vb = (array) ( $c['vb'] ?? [] );
		$ve = $vb['elev'] ?? [ 380, 280 ];
		$vp = $vb['plan'] ?? [ 480, 340 ];
		$E  = cer_devis_echelle( $sc, $vb );
		// taille imprimée d'une vue : unités du dessin ÷ (unités par mètre) = mètres réels ; × 1000 ÷ E = millimètres sur la feuille
		$taille = function ( $v, $box, $defaut_w ) use ( $sc, $E, $mm ) {
			if ( $E ) {
				return 'width:' . $mm( $box[0] / $sc[ $v ] * 1000 / $E ) . ';height:' . $mm( $box[1] / $sc[ $v ] * 1000 / $E );
			}
			return 'width:' . $mm( $defaut_w ) . ';height:' . $mm( $defaut_w * $box[1] / $box[0] );
		};
		$echelle = function () use ( $E, $e ) {
			if ( ! $E ) {
				return '<div class="petit r">Vues cotées, sans échelle</div>';
			}
			$m = 1000 / $E; // 1 m sur la feuille
			return '<div class="ech">Échelle 1:' . (int) $E . '</div>'
				. '<table align="right" class="barre"><tr><td style="width:' . round( $m / 2, 2 ) . 'mm" class="n"></td><td style="width:' . round( $m / 2, 2 ) . 'mm" class="b"></td><td class="petit" style="padding-left:1.5mm">1 m</td></tr></table>'
				. '<div class="petit" style="clear:both;padding-top:0.8mm">A4, à imprimer en taille réelle (100 %)</div>';
		};
		$menus = (array) ( $c['menus'] ?? [] );
		$dd    = (array) ( $c['d'] ?? [] );
		?>
<pagebreak />
<table width="100%"><tr><td width="62%"><?= $entete( 'Plans et cotes' . ( $plusieurs ? ' · ' . $titre( $L ) : '' ), 'Plan de masse, vue du dessus' ) ?></td><td width="38%" class="r"><?= $echelle() ?></td></tr></table>
<div class="cadre"><img src="<?= $e( $L['vues']['plan'] ) ?>" style="<?= $taille( 'plan', $vp, 165 ) ?>" /></div>
<table width="100%" class="det fiche">
  <tr class="grp"><td colspan="4">Fiche technique</td></tr>
<?php foreach ( array_chunk( (array) ( $c['dims'] ?? [] ), 2 ) as $paire ) : ?>
  <tr><?php foreach ( $paire as $k ) : ?><td class="k" width="25%"><?= $e( $k[0] ) ?></td><td class="fort" width="25%"><?= $e( $k[1] ) ?></td><?php endforeach; ?><?= 1 === count( $paire ) ? '<td></td><td></td>' : '' ?></tr>
<?php endforeach; ?>
</table>
<?php if ( $menus ) : ?>
<table width="100%" class="det">
  <tr class="grp"><td>Portes et fenêtres</td><td>Largeur × hauteur</td><td>Mur</td><td class="r">Position</td></tr>
<?php foreach ( $menus as $m ) :
			$long = in_array( $m['wall'] ?? 'face', [ 'face', 'fond' ], true ) ? (float) ( $dd['L'] ?? 0 ) : (float) ( $dd['P'] ?? 0 );
			?>
  <tr><td width="42%"><?= $e( $m['label'] ?? '' ) ?></td>
    <td class="k" width="20%"><?= (int) ( $m['lw'] ?? 0 ) ?> × <?= (int) ( $m['lh'] ?? 0 ) ?> cm<?= ! empty( $m['seuil'] ) ? '<br /><span class="petit">allège ' . (int) $m['seuil'] . ' cm</span>' : '' ?></td>
    <td class="k" width="14%"><?= $e( $murs[ $m['wall'] ?? 'face' ] ?? '' ) ?></td>
    <td class="k r" width="24%"><?= $long ? 'axe à ' . $e( $num( $long * (float) ( $m['pos'] ?? 50 ) / 100 ) ) . ' m' : '' ?></td></tr>
<?php endforeach; ?>
</table>
<div class="petit" style="margin-top:1.5mm">Position : axe de l'ouverture mesuré depuis le bord gauche du mur, vu de l'extérieur (voir les élévations). Emplacements proposés d'après votre configuration, ajustables avec votre conseiller.</div>
<?php endif; ?>
<?php
		$vues = array_values( array_filter( [ 'face', 'gauche', 'droite', 'fond' ], function ( $v ) use ( $L ) { return ! empty( $L['vues'][ $v ] ); } ) );
		foreach ( array_chunk( $vues, 2 ) as $paire ) :
			?>
<pagebreak />
<table width="100%"><tr><td width="62%"><?= $entete( 'Plans et cotes', 'Élévations' ) ?></td><td width="38%" class="r"><?= $echelle() ?></td></tr></table>
<?php foreach ( $paire as $v ) : ?>
<div class="cadre"><div class="vt"><?= $e( $murs[ $v ] ) ?></div><img src="<?= $e( $L['vues'][ $v ] ) ?>" style="<?= $taille( $v, $ve, 140 ) ?>" /></div>
<?php endforeach; ?>
<?php if ( count( $paire ) === 2 && $paire[1] === end( $vues ) ) : ?>
<div class="petit" style="margin-top:2mm">Cotes en mètres, d'après la configuration choisie. Elles sont vérifiées avec votre conseiller avant la mise en fabrication.</div>
<?php endif; ?>
<?php
		endforeach;
	}
	$html = ob_get_clean();

	$OL = '#515136'; $OLD = '#3d3d28'; $SA = '#f5f3ee'; $LI = '#e4e0d5'; $DO = '#7a7863'; $TX = '#23251b';
	$css = "
body { font-family: sourcesans; font-size: 9.5pt; color: $TX; line-height: 1.42; }
p { margin: 0 0 1.4mm; }
.r { text-align: right; } .fort { font-weight: bold; } .petit { font-size: 7.8pt; color: $DO; }
.kick { font-size: 7.4pt; letter-spacing: 1.3pt; text-transform: uppercase; color: $DO; }
h1 { font-family: sourcessb; font-size: 22pt; color: $OLD; margin: 0.8mm 0 0; font-weight: normal; line-height: 1.15; }
h2 { font-family: sourcessb; font-size: 15pt; color: $OLD; margin: 0.6mm 0 3mm; font-weight: normal; }
.sous { font-size: 10.5pt; color: $DO; margin: 1.2mm 0 4.5mm; }
.hero { background-color: $SA; border-radius: 4mm; padding: 3mm 0; text-align: center; }
.chiffres { margin-top: 4mm; border-collapse: separate; border-spacing: 1.6mm 0; margin-left: -1.6mm; }
.chiffres td { background-color: $SA; border-radius: 2.5mm; padding: 2.6mm 3.2mm; vertical-align: top; }
.cl { font-size: 7.4pt; color: $DO; } .cv { font-family: sourcessb; font-size: 11.5pt; color: $OLD; margin-top: 0.6mm; }
.blocs { margin-top: 4mm; border-collapse: separate; border-spacing: 1.6mm 0; margin-left: -1.6mm; }
.bloc { border: 0.5pt solid $LI; border-radius: 2.5mm; padding: 3mm 3.8mm; vertical-align: top; }
.prix { margin-top: 5mm; background-color: $OL; border-radius: 3mm; padding: 4.2mm 5mm; }
.prix td { color: #ffffff; vertical-align: middle; }
.pk { font-size: 7.8pt; letter-spacing: 1.2pt; text-transform: uppercase; color: #ffffff; } .ps { font-size: 8.6pt; color: #e6e4d8; margin-top: 0.8mm; }
.pv { font-family: sourcessb; font-size: 23pt; color: #ffffff; } .pt { font-size: 9.5pt; color: #e6e4d8; }
.det { border-collapse: collapse; margin-top: 0.5mm; }
.det td { padding: 1.9mm 1.2mm; border-bottom: 0.4pt solid #ebe8de; vertical-align: top; }
.det td.k { color: $DO; } .det td.k:first-child { width: 33%; }
.det tr.grp td { padding: 4.2mm 1.2mm 1.2mm; font-size: 7.4pt; letter-spacing: 1.2pt; text-transform: uppercase; color: $OL; border-bottom: 0.7pt solid $OL; }
.det tr.st td { font-family: sourcessb; font-size: 10.5pt; color: $OLD; border-bottom: 0; padding-top: 3.2mm; }
.totaux { margin-top: 5mm; border-collapse: collapse; }
.totaux td { padding: 1.5mm 1.2mm; }
.totaux td.m { color: $DO; } .totaux td.remise { color: #8a4b2a; }
.totaux tr.ttc td { font-family: sourcessb; font-size: 12.5pt; color: #ffffff; background-color: $OL; padding: 2.6mm 3mm; }
.cond { margin-top: 8mm; border-top: 0.5pt solid $LI; } .cond td { padding-top: 3.2mm; vertical-align: top; font-size: 8.5pt; }
.lien { color: $OL; text-decoration: none; font-size: 8pt; }
.cadre { border: 0.5pt solid $LI; border-radius: 2.5mm; padding: 2.5mm 0; margin-top: 2.5mm; text-align: center; }
.vt { font-size: 7.2pt; letter-spacing: 1pt; text-transform: uppercase; color: $DO; text-align: left; padding: 0 3mm 1mm; }
.fiche { margin-top: 3mm; }
.tete td { vertical-align: top; }
.barre { border-collapse: collapse; margin-top: 1mm; }
.barre td { padding: 0; vertical-align: middle; }
.ech { font-family: sourcessb; font-size: 11pt; color: $OLD; }
.inclus { font-size: 8.4pt; color: $DO; }
.barre td.n { height: 1.6mm; background-color: $OLD; } .barre td.b { height: 1.6mm; border: 0.4pt solid $OLD; background-color: #ffffff; }
";
	$cfgV  = ( new Mpdf\Config\ConfigVariables() )->getDefaults();
	$fntV  = ( new Mpdf\Config\FontVariables() )->getDefaults();
	$fonts = ( defined( 'CER_CFG_DIR' ) && is_dir( CER_CFG_DIR . 'fonts' ) ) ? CER_CFG_DIR . 'fonts' : dirname( __DIR__ ) . '/assets/fonts';
	$tmp   = ( function_exists( 'wp_upload_dir' ) ? wp_upload_dir()['basedir'] : sys_get_temp_dir() ) . '/wqg-tmp';
	$mpdf  = new \Mpdf\Mpdf( [
		'mode'          => 'utf-8',
		'format'        => 'A4',
		'margin_top'    => 27,
		'margin_header' => 8,
		'margin_bottom' => 19,
		'margin_left'   => 15,
		'margin_right'  => 15,
		'margin_footer' => 8,
		'tempDir'       => $tmp,
		'fontDir'       => array_merge( $cfgV['fontDir'], [ $fonts ] ),
		'fontdata'      => $fntV['fontdata'] + [
			'sourcesans' => [ 'R' => 'SourceSansPro-Regular.ttf', 'B' => 'SourceSansPro-Bold.ttf' ],
			'sourcessb'  => [ 'R' => 'SourceSansPro-SemiBold.ttf' ],
		],
		'default_font'  => 'sourcesans',
	] );
	$mpdf->shrink_tables_to_fit = 0; // les vues à l'échelle ne doivent jamais être réduites
	$mpdf->img_dpi             = 96;
	$mpdf->SetTitle( 'Devis ' . $d['numero'] );
	$mpdf->SetAuthor( $d['societe']['nom'] );
	$pied = trim( $d['societe']['nom'] . ( $d['societe']['pied'] ? ' · ' . preg_replace( '/\s+/u', ' ', $d['societe']['pied'] ) : '' ) );
	// En-tête de chaque page : bandeau olive arrondi, logo de la marque (blanc) et références du devis
	$logo = $d['societe']['logo']
		? '<img src="' . $e( $d['societe']['logo'] ) . '" style="height:7.6mm" />'
		: '<span style="font-family: sourcessb; font-size: 14pt; color: #ffffff;">' . $e( $d['societe']['nom'] ) . '</span>';
	$mpdf->SetHTMLHeader(
		'<div style="background-color: #3d3d28; border-radius: 2.6mm; padding: 2.6mm 5mm;">'
		. '<table width="100%" style="border-collapse: collapse;"><tr>'
		. '<td style="vertical-align: middle;">' . $logo . '</td>'
		. '<td style="vertical-align: middle; text-align: right; font-family: sourcesans; color: #ffffff;">'
		. '<span style="font-size: 6.8pt; letter-spacing: 2pt; color: #d9d7c9;">DEVIS&nbsp;&nbsp;</span>'
		. '<span style="font-family: sourcessb; font-size: 10.5pt; color: #ffffff;">' . $e( $d['numero'] ) . '</span><br />'
		. '<span style="font-size: 7.4pt; color: #d9d7c9;">émis le ' . $e( $d['date'] ) . ' · valable jusqu\'au ' . $e( $d['valable'] ) . '</span>'
		. '</td></tr></table></div>'
	);
	$mpdf->SetHTMLFooter(
		'<table width="100%" style="font-family: sourcesans; font-size: 7.2pt; color: #7a7863; border-top: 0.4pt solid #e4e0d5;"><tr>'
		. '<td style="padding-top: 1.6mm;">' . $e( $pied ) . '</td>'
		. '<td style="padding-top: 1.6mm; text-align: right;">' . $e( $d['numero'] ) . ' · page {PAGENO} / {nbpg}</td>'
		. '</tr></table>'
	);
	@ini_set( 'pcre.backtrack_limit', '5000000' );
	$mpdf->WriteHTML( $css, \Mpdf\HTMLParserMode::HEADER_CSS );
	$mpdf->WriteHTML( $html, \Mpdf\HTMLParserMode::HTML_BODY );
	return $mpdf->Output( '', \Mpdf\Output\Destination::STRING_RETURN );
}
