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
/** Adresse du visiteur ; en IPv6, le préfixe /64 (une box = un /64 : sinon chaque adresse aurait son propre compteur). */
function cer3d_ip() {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0';
	$b  = @inet_pton( $ip ); // phpcs:ignore
	return ( $b && 16 === strlen( $b ) ) ? bin2hex( substr( $b, 0, 8 ) ) : $ip;
}
/** Au plus $max demandes par heure et par visiteur. */
function cer3d_limite( $cle, $max ) {
	$t  = 'cer3d_' . $cle . '_' . md5( cer3d_ip() );
	$n  = (int) get_transient( $t );
	if ( $n >= $max ) {
		return false;
	}
	set_transient( $t, $n + 1, HOUR_IN_SECONDS );
	return true;
}
/** Plafond du jour, tous visiteurs confondus : $max_n demandes et $max_o octets. */
function cer3d_quota( $cle, $max_n, $max_o = 0, $o = 0 ) {
	$k = 'cer3d_q_' . $cle . '_' . gmdate( 'Ymd' );
	$q = (array) get_transient( $k ) + [ 'n' => 0, 'o' => 0 ];
	if ( $q['n'] >= $max_n || ( $max_o && $q['o'] + $o > $max_o ) ) {
		return false;
	}
	set_transient( $k, [ 'n' => $q['n'] + 1, 'o' => $q['o'] + $o ], 2 * DAY_IN_SECONDS );
	return true;
}
/** Les deux points d'entrée ne répondent qu'aux pages du site (un autre site ne peut pas s'en servir via ses visiteurs). */
function cer3d_permission( WP_REST_Request $r ) {
	$h = function ( $u ) { return preg_replace( '/^www\./', '', strtolower( (string) wp_parse_url( $u, PHP_URL_HOST ) ) ); };
	$o = (string) $r->get_header( 'origin' );
	return 'off' !== cer3d_mode() && '' !== $o && $h( $o ) === $h( home_url() );
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
	if ( ! file_exists( $base . '.htaccess' ) ) {
		wp_mkdir_p( $base );
		// types MIME : Quick Look (iPhone) n'ouvre un .usdz que s'il est servi en model/vnd.usdz+zip ; rien d'autre n'est servi
		@file_put_contents( $base . '.htaccess', "AddType model/vnd.usdz+zip .usdz\nAddType model/gltf-binary .glb\nOptions -Indexes\n<FilesMatch \"\\.(?!(glb|usdz)$)[^.]+$\">\nRequire all denied\n</FilesMatch>\n<IfModule mod_headers.c>\nHeader set X-Content-Type-Options nosniff\n</IfModule>\n" ); // phpcs:ignore
	}
	return [ $base . ( $id ? $id . '/' : '' ), $url . ( $id ? $id . '/' : '' ) ];
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'cer/v1', '/ar', [ 'methods' => 'POST', 'permission_callback' => 'cer3d_permission', 'callback' => 'cer3d_rest_ar' ] );
	register_rest_route( 'cer/v1', '/dossier', [ 'methods' => 'POST', 'permission_callback' => 'cer3d_permission', 'callback' => 'cer3d_rest_dossier' ] );
} );

/** GLB : en-tête glTF 2, longueur exacte, bloc JSON lisible (version 2.0). */
function cer3d_glb_ok( $f ) {
	$t = filesize( $f );
	$h = fopen( $f, 'rb' ); // phpcs:ignore
	$b = $h ? (string) fread( $h, 20 ) : ''; // phpcs:ignore
	if ( 20 !== strlen( $b ) ) {
		if ( $h ) { fclose( $h ); } // phpcs:ignore
		return false;
	}
	$e  = unpack( 'a4m/Vv/Vl/Vj/a4t', $b );
	$ok = 'glTF' === $e['m'] && 2 === $e['v'] && $e['l'] === $t && 'JSON' === $e['t'] && $e['j'] > 0 && $e['j'] < 4 * MB_IN_BYTES;
	$js = $ok ? json_decode( (string) fread( $h, $e['j'] ), true ) : null; // phpcs:ignore
	fclose( $h ); // phpcs:ignore
	return is_array( $js ) && '2.0' === ( $js['asset']['version'] ?? '' );
}
/** USDZ : ZIP non compressé dont le premier fichier est la scène .usda/.usdc, puis des images (format produit par la vue 3D). */
function cer3d_usdz_ok( $f ) {
	$b = (string) file_get_contents( $f, false, null, 0, 30 + 255 ); // phpcs:ignore
	if ( strlen( $b ) < 30 || "PK\x03\x04" !== substr( $b, 0, 4 ) ) {
		return false;
	}
	$e   = unpack( 'vmeth', substr( $b, 8, 2 ) ) + unpack( 'vnl', substr( $b, 26, 2 ) );
	$nom = substr( $b, 30, $e['nl'] );
	if ( 0 !== $e['meth'] || ! preg_match( '/^[\w.-]+\.usd[ac]$/i', $nom ) ) {
		return false;
	}
	if ( ! class_exists( 'ZipArchive' ) ) {
		return true;
	}
	$z = new ZipArchive();
	if ( true !== $z->open( $f ) ) {
		return false;
	}
	$ok = $z->numFiles > 0 && $z->numFiles < 300;
	for ( $i = 0; $ok && $i < $z->numFiles; $i++ ) {
		$st = $z->statIndex( $i );
		$ok = $st && 0 === (int) $st['comp_method'] && false === strpos( $st['name'], '..' )
			&& preg_match( $i ? '#^[\w/.-]+\.(usd[ac]|png|jpe?g)$#i' : '#^[\w.-]+\.usd[ac]$#i', $st['name'] );
	}
	$z->close();
	return (bool) $ok;
}

function cer3d_rest_ar( WP_REST_Request $r ) {
	if ( ! cer3d_jeton_ok( $r->get_param( 'jeton' ) ) ) {
		return new WP_Error( 'cer3d_jeton', 'La page a expiré : rechargez-la puis réessayez.', [ 'status' => 403 ] );
	}
	if ( ! cer3d_limite( 'ar', 15 ) ) {
		return new WP_Error( 'cer3d_limite', 'Trop de demandes : réessayez dans une heure.', [ 'status' => 429 ] );
	}
	// 1. tout vérifier avant d'écrire quoi que ce soit (rien d'orphelin sur le disque)
	$files = $r->get_file_params();
	$ok    = [];
	$poids = 0;
	foreach ( [ 'glb' => 'cer3d_glb_ok', 'usdz' => 'cer3d_usdz_ok' ] as $k => $test ) {
		$tmp = $files[ $k ]['tmp_name'] ?? '';
		if ( ! is_string( $tmp ) || '' === $tmp || ! is_uploaded_file( $tmp ) ) {
			continue;
		}
		$taille = (int) ( $files[ $k ]['size'] ?? 0 );
		if ( $taille > 25 * MB_IN_BYTES ) {
			return new WP_Error( 'cer3d_taille', 'Modèle trop lourd.', [ 'status' => 413 ] );
		}
		if ( ! $test( $tmp ) ) {
			return new WP_Error( 'cer3d_format', 'Fichier non reconnu.', [ 'status' => 415 ] );
		}
		$ok[ $k ] = $tmp;
		$poids   += $taille;
	}
	if ( empty( $ok['glb'] ) ) {
		return new WP_Error( 'cer3d_vide', 'Aucun modèle reçu.', [ 'status' => 400 ] );
	}
	// 2. plafond du jour pour tout le site : 150 modèles, 3 Go
	if ( ! cer3d_quota( 'ar', 150, 3 * GB_IN_BYTES, $poids ) ) {
		return new WP_Error( 'cer3d_quota', 'La réalité augmentée est très demandée aujourd\'hui : réessayez demain.', [ 'status' => 503 ] );
	}
	// 3. écriture
	$id = strtolower( wp_generate_password( 12, false, false ) );
	list( $dir, $url ) = cer3d_dossier_ar( $id );
	wp_mkdir_p( $dir );
	$out = [];
	foreach ( $ok as $k => $tmp ) {
		if ( ! @move_uploaded_file( $tmp, $dir . 'abri.' . $k ) ) { // phpcs:ignore
			array_map( 'unlink', (array) glob( $dir . '*' ) );
			@rmdir( $dir ); // phpcs:ignore
			return new WP_Error( 'cer3d_disque', 'Enregistrement impossible.', [ 'status' => 500 ] );
		}
		$out[ $k ] = $url . 'abri.' . $k;
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
		// coordonnées de prospects : administrateurs et gestionnaires de la boutique seulement
		'capabilities'    => [ 'create_posts' => 'do_not_allow', 'edit_posts' => 'manage_woocommerce', 'edit_others_posts' => 'manage_woocommerce', 'edit_private_posts' => 'manage_woocommerce',
			'read_private_posts' => 'manage_woocommerce', 'delete_posts' => 'manage_woocommerce', 'delete_others_posts' => 'manage_woocommerce', 'delete_private_posts' => 'manage_woocommerce', 'publish_posts' => 'do_not_allow' ],
		'map_meta_cap'    => true,
	] );
} );

function cer3d_champs() {
	return [ 'prenom' => 'Prénom', 'nom' => 'Nom', 'tel' => 'Téléphone', 'email' => 'Email', 'adresse' => 'Adresse du terrain', 'cp' => 'Code postal', 'ville' => 'Ville',
		'secteur' => 'Secteur protégé', 'parcelle' => 'Parcelle', 'modele' => 'Projet', 'surface' => 'Surface', 'formalite' => 'Formalité', 'page' => 'Configurateur', 'consentement' => 'Accord du client' ];
}

function cer3d_rest_dossier( WP_REST_Request $r ) {
	if ( strlen( (string) $r->get_body() ) > 16 * KB_IN_BYTES ) {
		return new WP_Error( 'cer3d_taille', 'Demande trop longue.', [ 'status' => 413 ] );
	}
	$p = (array) $r->get_json_params();
	if ( ! cer3d_jeton_ok( is_string( $p['jeton'] ?? '' ) ? $p['jeton'] : '' ) ) {
		return new WP_Error( 'cer3d_jeton', 'La page a expiré : rechargez-la puis réessayez.', [ 'status' => 403 ] );
	}
	if ( ! empty( $p['site_web'] ) ) { // champ piège invisible : robots
		return [ 'ok' => true ];
	}
	if ( ! cer3d_limite( 'dossier', 12 ) ) {
		return new WP_Error( 'cer3d_limite', 'Trop de demandes : réessayez dans une heure.', [ 'status' => 429 ] );
	}
	if ( ! cer3d_quota( 'dossier', 300 ) ) {
		return new WP_Error( 'cer3d_quota', 'Service très demandé aujourd\'hui : réessayez demain ou appelez-nous.', [ 'status' => 503 ] );
	}
	$t   = function ( $k, $max = 200 ) use ( $p ) { return mb_substr( sanitize_text_field( (string) ( $p[ $k ] ?? '' ) ), 0, $max ); };
	$v   = [ 'prenom' => $t( 'prenom', 80 ), 'nom' => $t( 'nom', 80 ), 'tel' => $t( 'tel', 30 ), 'email' => mb_substr( sanitize_email( is_string( $p['email'] ?? '' ) ? $p['email'] : '' ), 0, 254 ), 'adresse' => $t( 'adresse' ),
		'cp' => $t( 'cp', 5 ), 'ville' => $t( 'ville', 120 ), 'secteur' => $t( 'secteur', 20 ), 'parcelle' => $t( 'parcelle', 160 ), 'modele' => $t( 'modele', 300 ),
		'surface' => $t( 'surface', 120 ), 'formalite' => $t( 'formalite', 80 ), 'page' => '' ];
	$page = esc_url_raw( is_string( $p['page'] ?? '' ) ? $p['page'] : '' ); // seulement une page du site (lien cliquable dans l'admin)
	if ( $page && wp_parse_url( $page, PHP_URL_HOST ) === wp_parse_url( home_url(), PHP_URL_HOST ) ) {
		$v['page'] = mb_substr( $page, 0, 500 );
	}
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
	// même client dans les dernières 24 h (« Continuer » cliqué deux fois, retour en arrière) : on met son dossier à jour
	$deja = get_posts( [ 'post_type' => 'cer_dossier', 'post_status' => 'private', 'fields' => 'ids', 'posts_per_page' => 1,
		'meta_key' => '_cer_email', 'meta_value' => $v['email'], 'date_query' => [ [ 'after' => '24 hours ago' ] ] ] ); // phpcs:ignore
	$post = [
		'post_type'   => 'cer_dossier',
		'post_status' => 'private',
		'post_title'  => trim( $v['prenom'] . ' ' . $v['nom'] ) . ' — ' . $v['ville'],
		'meta_input'  => array_combine( array_map( function ( $k ) { return '_cer_' . $k; }, array_keys( $v ) ), array_values( $v ) ),
	];
	if ( $deja ) {
		$post['ID'] = $deja[0];
	}
	$id = $deja ? wp_update_post( $post, true ) : wp_insert_post( $post, true );
	if ( is_wp_error( $id ) ) {
		return new WP_Error( 'cer3d_enreg', 'Enregistrement impossible, réessayez.', [ 'status' => 500 ] );
	}
	return [ 'ok' => true ];
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

// RGPD : dossiers effacés 3 ans après leur dernière mise à jour (recommandation CNIL pour les prospects)
add_action( 'cer_cfg_nettoyage', function () {
	foreach ( get_posts( [ 'post_type' => 'cer_dossier', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 200,
		'date_query' => [ [ 'column' => 'post_modified_gmt', 'before' => '3 years ago' ] ] ] ) as $id ) {
		wp_delete_post( $id, true );
	}
} );
// Outils → Exporter / Effacer les données personnelles : les dossiers mairie sont pris en compte (recherche par email)
function cer3d_dossiers_de( $email ) {
	return get_posts( [ 'post_type' => 'cer_dossier', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => -1, 'meta_key' => '_cer_email', 'meta_value' => $email ] ); // phpcs:ignore
}
add_filter( 'wp_privacy_personal_data_exporters', function ( $e ) {
	$e['cer_dossier'] = [ 'exporter_friendly_name' => 'Dossiers mairie (Abri Cerisier)', 'callback' => function ( $email ) {
		$items = [];
		foreach ( cer3d_dossiers_de( $email ) as $id ) {
			$data = [];
			foreach ( cer3d_champs() as $k => $lab ) {
				$data[] = [ 'name' => $lab, 'value' => (string) get_post_meta( $id, '_cer_' . $k, true ) ];
			}
			$items[] = [ 'group_id' => 'cer_dossier', 'group_label' => 'Dossiers mairie', 'item_id' => 'cer-dossier-' . $id, 'data' => $data ];
		}
		return [ 'data' => $items, 'done' => true ];
	} ];
	return $e;
} );
add_filter( 'wp_privacy_personal_data_erasers', function ( $e ) {
	$e['cer_dossier'] = [ 'eraser_friendly_name' => 'Dossiers mairie (Abri Cerisier)', 'callback' => function ( $email ) {
		$ids = cer3d_dossiers_de( $email );
		foreach ( $ids as $id ) {
			wp_delete_post( $id, true );
		}
		return [ 'items_removed' => count( $ids ), 'items_retained' => false, 'messages' => [], 'done' => true ];
	} ];
	return $e;
} );
