<?php
/**
 * Configurateurs de vente Abri Cerisier (abri, garage, carport) : visuel en direct, plans joints au panier.
 *
 * - Sur les 3 fiches configurateur, ajoute le panneau « Votre abri en direct » (moteur de dessin du générateur de plan).
 * - Mode « test » : actif seulement avec ?apercu=plan dans l'adresse (les visiteurs ne voient rien de changé).
 *   Mode « tous » : actif pour tout le monde. Mode « off » : rien.
 * - À l'ajout au panier, les vues dessinées (JPEG) et la configuration lue sont enregistrées en fichiers
 *   (uploads/cer-plans/…), jamais dans la session ; la façade sert de vignette au panier ; les plans suivent la commande.
 */
defined( 'ABSPATH' ) || exit;

if ( ! defined( 'CER_CFG_VERSION' ) ) {
	define( 'CER_CFG_VERSION', '1.0.0' );
}

/** Fiches configurateur : identifiant produit → type. */
function cer_cfg_produits() {
	return apply_filters( 'cer_cfg_produits', [ 3302 => 'abri', 7319 => 'carport', 7644 => 'garage' ] );
}

/** Mode : 'off', 'test' (lien ?apercu=plan) ou 'tous'. */
function cer_cfg_mode() {
	if ( defined( 'CER_CFG_MODE' ) ) {
		return CER_CFG_MODE;
	}
	return get_option( 'cer_cfg_mode', 'test' );
}

function cer_cfg_actif_ici() {
	if ( ! function_exists( 'is_product' ) || ! is_product() ) {
		return false;
	}
	$kind = cer_cfg_produits()[ get_queried_object_id() ] ?? null;
	if ( ! $kind ) {
		return false;
	}
	$mode = cer_cfg_mode();
	if ( 'tous' === $mode ) {
		return $kind;
	}
	if ( 'test' === $mode && isset( $_GET['apercu'] ) && 'plan' === $_GET['apercu'] ) { // phpcs:ignore WordPress.Security.NonceVerification
		return $kind;
	}
	return false;
}

/** URL et dossier des fichiers JS/CSS (plugin, ou copie de test). */
function cer_cfg_assets() {
	if ( defined( 'CER_CFG_URL' ) ) {
		return [ CER_CFG_URL, CER_CFG_DIR ];
	}
	return [ plugins_url( 'assets/', dirname( __FILE__ ) . '/abri-cerisier-fiche-technique.php' ), dirname( __DIR__ ) . '/assets/' ];
}

add_action( 'wp_enqueue_scripts', function () {
	$kind = cer_cfg_actif_ici();
	if ( ! $kind ) {
		return;
	}
	if ( ! defined( 'DONOTCACHEPAGE' ) ) {
		define( 'DONOTCACHEPAGE', true ); // version test : jamais en cache
	}
	list( $url, $dir ) = cer_cfg_assets();
	$v = function ( $f ) use ( $dir ) { return CER_CFG_VERSION . '-' . ( file_exists( $dir . $f ) ? filemtime( $dir . $f ) : 0 ); };
	wp_enqueue_style( 'cer-configurateur', $url . 'cer-configurateur.css', [], $v( 'cer-configurateur.css' ) );
	wp_enqueue_script( 'cer-plan-moteur', $url . 'acft-engine.js', [], $v( 'acft-engine.js' ), true );
	wp_enqueue_script( 'cer-configurateur', $url . 'cer-configurateur.js', [ 'cer-plan-moteur' ], $v( 'cer-configurateur.js' ), true );
	wp_add_inline_script( 'cer-plan-moteur', 'window.CER_CFG=' . wp_json_encode( [ 'kind' => $kind, 'version' => CER_CFG_VERSION ] ) . ';', 'before' );
}, 30 );

// WP Rocket : nos scripts s'exécutent tout de suite (pas de retardement ni de regroupement)
add_filter( 'rocket_delay_js_exclusions', function ( $l ) { $l[] = 'acft-engine'; $l[] = 'cer-configurateur'; $l[] = 'CER_CFG'; return $l; } );
add_filter( 'rocket_exclude_js', function ( $l ) { $l[] = '(.*)acft-engine(.*).js'; $l[] = '(.*)cer-configurateur(.*).js'; return $l; } );
add_filter( 'rocket_exclude_defer_js', function ( $l ) { $l[] = 'acft-engine'; $l[] = 'cer-configurateur'; return $l; } );

/** Dossier des plans. */
function cer_cfg_upload( $sous = '' ) {
	$u = wp_upload_dir();
	return [ trailingslashit( $u['basedir'] ) . 'cer-plans/' . $sous, trailingslashit( $u['baseurl'] ) . 'cer-plans/' . $sous ];
}

/**
 * Ajout au panier : vues et configuration enregistrées en fichiers.
 * Accepté seulement pour une fiche configurateur, avec des JPEG valides et une configuration lisible.
 */
add_filter( 'woocommerce_add_cart_item_data', function ( $data, $product_id ) {
	$kind = cer_cfg_produits()[ (int) $product_id ] ?? null;
	if ( ! $kind || empty( $_POST['cer_plan']['config'] ) || empty( $_POST['cer_plan']['vues'] ) || ! is_array( $_POST['cer_plan']['vues'] ) ) { // phpcs:ignore
		return $data;
	}
	$config = json_decode( wp_unslash( $_POST['cer_plan']['config'] ), true ); // phpcs:ignore
	if ( ! is_array( $config ) || strlen( wp_unslash( $_POST['cer_plan']['config'] ) ) > 60000 ) { // phpcs:ignore
		return $data;
	}
	$id   = gmdate( 'Y/m/' ) . wp_generate_password( 20, false );
	list( $dir ) = cer_cfg_upload( $id . '/' );
	$vues = [];
	foreach ( [ 'face', 'gauche', 'droite', 'fond', 'plan' ] as $nom ) {
		$uri = isset( $_POST['cer_plan']['vues'][ $nom ] ) ? wp_unslash( $_POST['cer_plan']['vues'][ $nom ] ) : ''; // phpcs:ignore
		if ( 0 !== strpos( $uri, 'data:image/jpeg;base64,' ) || strlen( $uri ) > 3000000 ) {
			continue;
		}
		$bin = base64_decode( substr( $uri, 23 ), true );
		$inf = $bin ? @getimagesizefromstring( $bin ) : false;
		if ( ! $inf || IMAGETYPE_JPEG !== $inf[2] || $inf[0] > 4000 || $inf[1] > 4000 ) {
			continue;
		}
		if ( ! wp_mkdir_p( $dir ) ) {
			return $data;
		}
		file_put_contents( $dir . $nom . '.jpg', $bin );
		$vues[] = $nom;
	}
	if ( ! in_array( 'face', $vues, true ) ) {
		return $data;
	}
	file_put_contents( $dir . 'config.json', wp_json_encode( $config, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT ) );
	@file_put_contents( dirname( $dir ) . '/index.html', '' );
	$data['cer_plan'] = [ 'id' => $id, 'kind' => $kind, 'vues' => $vues, 'v' => sanitize_text_field( $config['v'] ?? '' ) ];
	return $data;
}, 20, 2 );

/** Chemin et URL d'une vue d'un article du panier ou d'une commande. */
function cer_cfg_vue( array $plan, $nom = 'face' ) {
	if ( empty( $plan['id'] ) || ! preg_match( '#^[0-9]{4}/[0-9]{2}/[A-Za-z0-9]+$|^commandes/[0-9]+-[0-9]+$#', $plan['id'] ) || ! in_array( $nom, (array) ( $plan['vues'] ?? [] ), true ) ) {
		return null;
	}
	list( $dir, $url ) = cer_cfg_upload( $plan['id'] . '/' );
	return file_exists( $dir . $nom . '.jpg' ) ? [ $dir . $nom . '.jpg', $url . $nom . '.jpg' ] : null;
}
function cer_cfg_config( array $plan ) {
	list( $dir ) = cer_cfg_upload( ( $plan['id'] ?? '' ) . '/' );
	$j = file_exists( $dir . 'config.json' ) ? json_decode( (string) file_get_contents( $dir . 'config.json' ), true ) : null;
	return is_array( $j ) ? $j : [];
}

// Vignette du panier : la façade dessinée
add_filter( 'woocommerce_cart_item_thumbnail', function ( $html, $item ) {
	$f = ! empty( $item['cer_plan'] ) ? cer_cfg_vue( $item['cer_plan'], 'face' ) : null;
	return $f ? '<img src="' . esc_url( $f[1] ) . '" alt="' . esc_attr__( 'Votre configuration', 'ac-fiche-technique' ) . '" class="cer-plan-vignette" style="width:100%;height:auto;object-fit:contain;background:#f8f8f5;border-radius:8px" />' : $html;
}, 20, 2 );

// Commande : les plans sont recopiés pour la commande (ils ne s'effacent plus) et rattachés à la ligne
add_action( 'woocommerce_checkout_create_order_line_item', function ( $line, $key, $values, $order ) {
	if ( empty( $values['cer_plan']['id'] ) ) {
		return;
	}
	$line->add_meta_data( '_cer_plan', $values['cer_plan'], true );
}, 20, 4 );
add_action( 'woocommerce_checkout_order_processed', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		return;
	}
	foreach ( $order->get_items() as $item_id => $item ) {
		$p = $item->get_meta( '_cer_plan' );
		if ( empty( $p['id'] ) || 0 === strpos( $p['id'], 'commandes/' ) ) {
			continue;
		}
		list( $src ) = cer_cfg_upload( $p['id'] . '/' );
		$nid          = 'commandes/' . (int) $order_id . '-' . (int) $item_id;
		list( $dst )  = cer_cfg_upload( $nid . '/' );
		if ( is_dir( $src ) && wp_mkdir_p( $dst ) ) {
			foreach ( glob( $src . '*' ) as $f ) {
				@copy( $f, $dst . basename( $f ) );
			}
			$p['id'] = $nid;
			$item->update_meta_data( '_cer_plan', $p );
			$item->save();
		}
	}
} );
// Admin de la commande : vignettes cliquables des plans
add_action( 'woocommerce_after_order_itemmeta', function ( $item_id, $item ) {
	$p = is_callable( [ $item, 'get_meta' ] ) ? $item->get_meta( '_cer_plan' ) : null;
	if ( empty( $p['vues'] ) ) {
		return;
	}
	echo '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">';
	foreach ( $p['vues'] as $nom ) {
		$f = cer_cfg_vue( $p, $nom );
		if ( $f ) {
			echo '<a href="' . esc_url( $f[1] ) . '" target="_blank" title="' . esc_attr( $nom ) . '"><img src="' . esc_url( $f[1] ) . '" style="width:96px;height:auto;border:1px solid #ddd;border-radius:4px;background:#fff" alt="" /></a>';
		}
	}
	echo '</div>';
}, 10, 2 );

// Nettoyage : plans de paniers sans commande, après 90 jours (les plans des commandes sont dans commandes/, gardés)
add_action( 'cer_cfg_nettoyage', function () {
	list( $base ) = cer_cfg_upload();
	$limite      = time() - 90 * DAY_IN_SECONDS;
	foreach ( (array) glob( $base . '[0-9][0-9][0-9][0-9]/[0-9][0-9]/*', GLOB_ONLYDIR ) as $d ) {
		if ( filemtime( $d ) < $limite ) {
			array_map( 'unlink', (array) glob( $d . '/*' ) );
			@rmdir( $d );
		}
	}
} );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'cer_cfg_nettoyage' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'cer_cfg_nettoyage' );
	}
} );
