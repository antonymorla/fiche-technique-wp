<?php
/**
 * Abri Cerisier — vue 3D, réalité augmentée et dossier mairie des configurateurs.
 *
 * Réglage : Réglages → Fiche Technique → « Vue 3D et dossier mairie » : désactivé / test / tous les visiteurs.
 * En test, le lien ?apercu=3d (sur une fiche configurateur) pose un cookie de 30 jours : on peut ensuite naviguer sans le paramètre.
 * Les coordonnées laissées avant le téléchargement du dossier mairie sont enregistrées dans l'admin (menu « Dossiers mairie »),
 * sans aucun envoi de mail automatique.
 */
defined( 'ABSPATH' ) || exit;

/** Mode : 'off', 'test' (lien ?apercu=3d) ou 'tous'. */
function cer3d_mode() {
	if ( defined( 'CER_3D_MODE' ) ) {
		return CER_3D_MODE;
	}
	return get_option( 'cer_3d_mode', 'test' );
}

function cer3d_lien_test() {
	return isset( $_GET['apercu'] ) && '3d' === $_GET['apercu']; // phpcs:ignore WordPress.Security.NonceVerification
}

function cer3d_actif() {
	if ( ! function_exists( 'cer_cfg_actif_ici' ) || ! cer_cfg_actif_ici() ) {
		return false;
	}
	$mode = cer3d_mode();
	if ( 'tous' === $mode ) {
		return true;
	}
	if ( 'test' !== $mode ) {
		return false;
	}
	return cer3d_lien_test() || ( isset( $_COOKIE['cer_apercu_3d'] ) && '1' === $_COOKIE['cer_apercu_3d'] );
}

add_action( 'template_redirect', function () {
	if ( ! empty( $_GET['cer-ar'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		cer3d_page_ar( sanitize_key( wp_unslash( $_GET['cer-ar'] ) ) ); // phpcs:ignore WordPress.Security.NonceVerification
	}
	if ( cer3d_lien_test() && 'test' === cer3d_mode() ) {
		setcookie( 'cer_apercu_3d', '1', time() + 30 * DAY_IN_SECONDS, COOKIEPATH ? COOKIEPATH : '/', COOKIE_DOMAIN, is_ssl(), true );
		$_COOKIE['cer_apercu_3d'] = '1';
	}
}, 1 );

// WP Rocket : pas de page en cache pour les testeurs (cookie), ni pour les pages de réalité augmentée
add_filter( 'rocket_cache_reject_cookies', function ( $c ) { $c[] = 'cer_apercu_3d'; return $c; } );
add_filter( 'rocket_cache_reject_uri', function ( $u ) { $u[] = '/(.*)\?cer-ar=(.*)'; return $u; } );
add_filter( 'rocket_delay_js_exclusions', function ( $l ) { $l[] = 'cer-vue3d'; $l[] = 'cer-mairie'; $l[] = 'CER_3D'; return $l; } );
add_filter( 'rocket_exclude_js', function ( $l ) { $l[] = '(.*)cer-vue3d(.*).js'; $l[] = '(.*)cer-mairie(.*).js'; return $l; } );
add_filter( 'rocket_exclude_defer_js', function ( $l ) { $l[] = 'cer-vue3d'; $l[] = 'cer-mairie'; return $l; } );

/** Jeton du jour pour les dépôts (pages en cache possibles : un jeton daté plutôt qu'un nonce de session). */
function cer3d_jeton( $decalage = 0 ) {
	return substr( hash_hmac( 'sha256', 'cer3d-' . gmdate( 'Ymd', time() - $decalage * DAY_IN_SECONDS ), wp_salt( 'auth' ) ), 0, 32 );
}
function cer3d_jeton_ok( $j ) {
	$j = (string) $j;
	return '' !== $j && ( hash_equals( cer3d_jeton( 0 ), $j ) || hash_equals( cer3d_jeton( 1 ), $j ) );
}
/** Au plus $max demandes par heure et par adresse IP. */
function cer3d_limite( $cle, $max ) {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0';
	$t  = 'cer3d_' . $cle . '_' . md5( $ip );
	$n  = (int) get_transient( $t );
	if ( $n >= $max ) {
		return false;
	}
	set_transient( $t, $n + 1, HOUR_IN_SECONDS );
	return true;
}

add_action( 'wp_enqueue_scripts', function () {
	if ( ! cer3d_actif() ) {
		return;
	}
	if ( 'test' === cer3d_mode() && ! defined( 'DONOTCACHEPAGE' ) ) {
		define( 'DONOTCACHEPAGE', true );
	}
	list( $url, $dir ) = cer_cfg_assets();
	$v = function ( $f ) use ( $dir ) { return CER_CFG_VERSION . '-' . ( file_exists( $dir . $f ) ? filemtime( $dir . $f ) : 0 ); };
	// la vue 3D (cer-vue3d.js, Three.js, textures) n'est téléchargée qu'au clic sur « Voir en 3D » : seule son adresse est donnée à la page
	wp_enqueue_script( 'cer-mairie', $url . 'cer-mairie.js', [ 'cer-plan-moteur' ], $v( 'cer-mairie.js' ), true );
	wp_add_inline_script( 'cer-mairie', 'window.CER_3D=' . wp_json_encode( [
		'vue3d'  => add_query_arg( 'ver', $v( 'cer-vue3d.js' ), $url . 'cer-vue3d.js' ),
		'rest'   => esc_url_raw( rest_url( 'cer/v1/' ) ),
		'jeton'  => cer3d_jeton(),
		'site'   => home_url( '/' ),
		'mode'   => cer3d_mode(),
		'nom'    => 'Abri Cerisier',
		'confid' => get_privacy_policy_url(),
		'tex'    => $url . 'tex/', // photos du bois et couvertures (dossier « 4• Textures » des modèles SketchUp)
	] ) . ';', 'before' );
}, 31 );

/* ───────── Réalité augmentée : dépôt des modèles (GLB et USDZ) et page à scanner ───────── */
function cer3d_dossier_ar( $id = '' ) {
	list( $base, $url ) = cer_cfg_upload( 'ar/' );
	if ( ! is_dir( $base ) ) {
		wp_mkdir_p( $base );
		// types MIME : Quick Look (iPhone) n'ouvre un .usdz que s'il est servi en model/vnd.usdz+zip
		@file_put_contents( $base . '.htaccess', "AddType model/vnd.usdz+zip .usdz\nAddType model/gltf-binary .glb\nOptions -Indexes\n" ); // phpcs:ignore
	}
	return [ $base . ( $id ? $id . '/' : '' ), $url . ( $id ? $id . '/' : '' ) ];
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'cer/v1', '/ar', [ 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'cer3d_rest_ar' ] );
	register_rest_route( 'cer/v1', '/dossier', [ 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'cer3d_rest_dossier' ] );
} );

function cer3d_rest_ar( WP_REST_Request $r ) {
	if ( 'off' === cer3d_mode() ) {
		return new WP_Error( 'cer3d_off', 'Fonction désactivée.', [ 'status' => 404 ] );
	}
	if ( ! cer3d_jeton_ok( $r->get_param( 'jeton' ) ) ) {
		return new WP_Error( 'cer3d_jeton', 'La page a expiré : rechargez-la puis réessayez.', [ 'status' => 403 ] );
	}
	if ( ! cer3d_limite( 'ar', 30 ) ) {
		return new WP_Error( 'cer3d_limite', 'Trop de demandes : réessayez dans une heure.', [ 'status' => 429 ] );
	}
	$files = $r->get_file_params();
	$id    = strtolower( wp_generate_password( 12, false, false ) );
	list( $dir, $url ) = cer3d_dossier_ar( $id );
	$out = [];
	foreach ( [ 'glb' => 'glTF', 'usdz' => 'PK' ] as $k => $magie ) {
		if ( empty( $files[ $k ]['tmp_name'] ) || ! is_uploaded_file( $files[ $k ]['tmp_name'] ) ) {
			continue;
		}
		if ( (int) $files[ $k ]['size'] > 30 * MB_IN_BYTES ) {
			return new WP_Error( 'cer3d_taille', 'Modèle trop lourd.', [ 'status' => 413 ] );
		}
		$tete = (string) file_get_contents( $files[ $k ]['tmp_name'], false, null, 0, 4 ); // phpcs:ignore
		if ( 0 !== strpos( $tete, $magie ) ) {
			return new WP_Error( 'cer3d_format', 'Fichier non reconnu.', [ 'status' => 415 ] );
		}
		wp_mkdir_p( $dir );
		if ( ! @move_uploaded_file( $files[ $k ]['tmp_name'], $dir . 'abri.' . $k ) ) { // phpcs:ignore
			return new WP_Error( 'cer3d_disque', 'Enregistrement impossible.', [ 'status' => 500 ] );
		}
		$out[ $k ] = $url . 'abri.' . $k;
	}
	if ( empty( $out['glb'] ) ) {
		return new WP_Error( 'cer3d_vide', 'Aucun modèle reçu.', [ 'status' => 400 ] );
	}
	$out['id']   = $id;
	$out['page'] = add_query_arg( 'cer-ar', $id, home_url( '/' ) );
	return $out;
}

function cer3d_page_ar( $id ) {
	if ( ! preg_match( '/^[a-z0-9]{12}$/', $id ) ) {
		return;
	}
	list( $dir, $url ) = cer3d_dossier_ar( $id );
	if ( ! file_exists( $dir . 'abri.glb' ) ) {
		status_header( 404 );
		nocache_headers();
		echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font:16px Arial;padding:24px">Ce lien a expiré (30 jours). Refaites la vue 3D depuis le configurateur.</p>';
		exit;
	}
	$glb  = esc_url( $url . 'abri.glb' );
	$usdz = file_exists( $dir . 'abri.usdz' ) ? esc_url( $url . 'abri.usdz' ) : '';
	nocache_headers();
	header( 'X-Robots-Tag: noindex, nofollow' );
	?><!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mon abri Cerisier dans mon jardin</title>
<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script>
<style>
body{margin:0;font-family:Jost,Futura,Arial,sans-serif;background:#f4f2ec;color:#2b2b22}
header{padding:14px 16px;font-weight:600;font-size:17px}
model-viewer{width:100%;height:68vh;background:#dfe7ec;--poster-color:#dfe7ec}
.ar{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);border:0;border-radius:24px;padding:13px 20px;background:#515136;color:#fff;font:600 16px Jost,Arial,sans-serif}
p{padding:6px 16px 24px;line-height:1.5;max-width:60ch}
</style></head><body>
<header>Abri Cerisier · votre abri en taille réelle</header>
<model-viewer src="<?php echo $glb; // phpcs:ignore ?>" <?php echo $usdz ? 'ios-src="' . $usdz . '"' : ''; // phpcs:ignore ?> ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto" ar-placement="floor" camera-controls touch-action="pan-y" shadow-intensity="1" exposure="1" environment-image="neutral" alt="Votre abri Cerisier en 3D">
<button slot="ar-button" class="ar">Voir dans mon jardin</button>
</model-viewer>
<p>Touchez « Voir dans mon jardin », visez le sol de votre jardin quelques secondes, puis posez l'abri. Il est affiché à sa taille réelle : faites le tour, prenez une capture d'écran.</p>
</body></html>
	<?php
	exit;
}

add_action( 'cer_cfg_nettoyage', function () { // modèles de réalité augmentée : 30 jours
	list( $base ) = cer3d_dossier_ar();
	$limite = time() - 30 * DAY_IN_SECONDS;
	foreach ( (array) glob( $base . '*', GLOB_ONLYDIR ) as $d ) {
		if ( filemtime( $d ) < $limite ) {
			array_map( 'unlink', (array) glob( $d . '/*' ) );
			@rmdir( $d ); // phpcs:ignore
		}
	}
} );

/* ───────── Dossiers mairie : coordonnées et projet, visibles dans l'admin ───────── */
add_action( 'init', function () {
	register_post_type( 'cer_dossier', [
		'labels'          => [ 'name' => 'Dossiers mairie', 'singular_name' => 'Dossier mairie', 'menu_name' => 'Dossiers mairie', 'all_items' => 'Tous les dossiers', 'edit_item' => 'Dossier mairie', 'search_items' => 'Chercher un dossier', 'not_found' => 'Aucun dossier pour l\'instant' ],
		'public'          => false,
		'show_ui'         => true,
		'show_in_menu'    => true,
		'menu_icon'       => 'dashicons-media-document',
		'menu_position'   => 56,
		'supports'        => [ 'title' ],
		'capability_type' => 'post',
		'capabilities'    => [ 'create_posts' => 'do_not_allow' ],
		'map_meta_cap'    => true,
	] );
} );

function cer3d_champs() {
	return [ 'prenom' => 'Prénom', 'nom' => 'Nom', 'tel' => 'Téléphone', 'email' => 'Email', 'adresse' => 'Adresse du terrain', 'cp' => 'Code postal', 'ville' => 'Ville',
		'secteur' => 'Secteur protégé', 'parcelle' => 'Parcelle', 'modele' => 'Projet', 'surface' => 'Surface', 'formalite' => 'Formalité', 'page' => 'Configurateur', 'consentement' => 'Accord du client' ];
}

function cer3d_rest_dossier( WP_REST_Request $r ) {
	if ( 'off' === cer3d_mode() ) {
		return new WP_Error( 'cer3d_off', 'Fonction désactivée.', [ 'status' => 404 ] );
	}
	$p = (array) $r->get_json_params();
	if ( ! cer3d_jeton_ok( $p['jeton'] ?? '' ) ) {
		return new WP_Error( 'cer3d_jeton', 'La page a expiré : rechargez-la puis réessayez.', [ 'status' => 403 ] );
	}
	if ( ! empty( $p['site_web'] ) ) { // champ piège invisible : robots
		return [ 'ok' => true ];
	}
	if ( ! cer3d_limite( 'dossier', 12 ) ) {
		return new WP_Error( 'cer3d_limite', 'Trop de demandes : réessayez dans une heure.', [ 'status' => 429 ] );
	}
	$t   = function ( $k, $max = 200 ) use ( $p ) { return mb_substr( sanitize_text_field( (string) ( $p[ $k ] ?? '' ) ), 0, $max ); };
	$v   = [ 'prenom' => $t( 'prenom', 80 ), 'nom' => $t( 'nom', 80 ), 'tel' => $t( 'tel', 30 ), 'email' => sanitize_email( (string) ( $p['email'] ?? '' ) ), 'adresse' => $t( 'adresse' ),
		'cp' => $t( 'cp', 5 ), 'ville' => $t( 'ville', 120 ), 'secteur' => $t( 'secteur', 20 ), 'parcelle' => $t( 'parcelle', 160 ), 'modele' => $t( 'modele', 300 ),
		'surface' => $t( 'surface', 120 ), 'formalite' => $t( 'formalite', 80 ), 'page' => esc_url_raw( (string) ( $p['page'] ?? '' ) ) ];
	$err = [];
	foreach ( [ 'prenom', 'nom', 'adresse', 'ville' ] as $k ) {
		if ( '' === $v[ $k ] ) {
			$err[] = $k;
		}
	}
	if ( ! is_email( $v['email'] ) ) {
		$err[] = 'email';
	}
	if ( ! preg_match( '/^(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}$/', preg_replace( '/\s+/', ' ', $v['tel'] ) ) ) {
		$err[] = 'tel';
	}
	if ( ! preg_match( '/^\d{5}$/', $v['cp'] ) ) {
		$err[] = 'cp';
	}
	if ( empty( $p['consentement'] ) ) {
		$err[] = 'consentement';
	}
	if ( $err ) {
		return new WP_Error( 'cer3d_champs', 'Champs à compléter : ' . implode( ', ', $err ), [ 'status' => 400, 'champs' => $err ] );
	}
	$v['consentement'] = 'Oui, le ' . wp_date( 'd/m/Y à H:i' ) . ' (recontact au sujet du projet)';
	$id = wp_insert_post( [
		'post_type'   => 'cer_dossier',
		'post_status' => 'private',
		'post_title'  => trim( $v['prenom'] . ' ' . $v['nom'] ) . ' — ' . $v['ville'],
		'meta_input'  => array_combine( array_map( function ( $k ) { return '_cer_' . $k; }, array_keys( $v ) ), array_values( $v ) ),
	], true );
	if ( is_wp_error( $id ) ) {
		return new WP_Error( 'cer3d_enreg', 'Enregistrement impossible, réessayez.', [ 'status' => 500 ] );
	}
	return [ 'ok' => true, 'id' => $id ];
}

// Liste dans l'admin : les colonnes utiles pour rappeler le client
add_filter( 'manage_cer_dossier_posts_columns', function ( $c ) {
	return [ 'cb' => $c['cb'], 'title' => 'Client', 'cer_tel' => 'Téléphone', 'cer_email' => 'Email', 'cer_projet' => 'Projet', 'cer_formalite' => 'Formalité', 'date' => 'Date' ];
} );
add_action( 'manage_cer_dossier_posts_custom_column', function ( $col, $id ) {
	$g = function ( $k ) use ( $id ) { return (string) get_post_meta( $id, '_cer_' . $k, true ); };
	if ( 'cer_tel' === $col ) {
		echo '<a href="tel:' . esc_attr( preg_replace( '/[^\d+]/', '', $g( 'tel' ) ) ) . '">' . esc_html( $g( 'tel' ) ) . '</a>';
	} elseif ( 'cer_email' === $col ) {
		echo '<a href="mailto:' . esc_attr( $g( 'email' ) ) . '">' . esc_html( $g( 'email' ) ) . '</a>';
	} elseif ( 'cer_projet' === $col ) {
		echo esc_html( $g( 'modele' ) ) . '<br><small>' . esc_html( $g( 'surface' ) ) . '</small>';
	} elseif ( 'cer_formalite' === $col ) {
		echo esc_html( $g( 'formalite' ) );
	}
}, 10, 2 );
add_action( 'add_meta_boxes_cer_dossier', function () {
	add_meta_box( 'cer_dossier_fiche', 'Coordonnées et projet', function ( $post ) {
		echo '<table class="widefat striped" style="max-width:820px">';
		foreach ( cer3d_champs() as $k => $lab ) {
			$val = (string) get_post_meta( $post->ID, '_cer_' . $k, true );
			if ( 'page' === $k && $val ) {
				$val = '<a href="' . esc_url( $val ) . '" target="_blank" rel="noopener">' . esc_html( $val ) . '</a>';
			} else {
				$val = esc_html( $val );
			}
			echo '<tr><th style="width:180px">' . esc_html( $lab ) . '</th><td>' . $val . '</td></tr>'; // phpcs:ignore
		}
		echo '</table><p class="description">Le client a demandé le dossier mairie depuis le configurateur. Aucun mail ne lui a été envoyé automatiquement.</p>';
	}, 'cer_dossier', 'normal', 'high' );
} );
