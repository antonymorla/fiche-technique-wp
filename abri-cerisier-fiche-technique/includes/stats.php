<?php
/**
 * Abri Cerisier — mesure d'audience des configurateurs (demande d'Antony, 19/10/2026).
 *
 * Ce qui est noté : les étapes, les options changées, la vue 3D, la réalité augmentée, les clics sur le panier,
 * le devis et la commande, les refus d'ajout au panier et les erreurs de page. Sur les 3 fiches configurateur,
 * le panier, la page « Générer un devis » et la commande.
 *
 * Sans IP, sans navigateur, sans cookie : un identifiant de visite tiré au hasard dans l'onglet (sessionStorage),
 * perdu à sa fermeture. Mesure d'audience anonyme du site lui-même (exemption de consentement de la CNIL),
 * à mentionner dans la politique de confidentialité.
 *
 * Charge du serveur : un seul envoi groupé par page vue (navigator.sendBeacon, à la sortie de la page).
 *
 * Réglage : Réglages → Fiche Technique → « Mesure des configurateurs » : désactivé (code non chargé) /
 * essai (seulement après un passage par ?apercu=stats, visites notées « essai ») / tous les visiteurs.
 * L'équipe connectée et les essais de devis (cookie cer_essai_devis) sont notés à part, jamais mêlés aux clients.
 *
 * Lecture : écran Réglages → Fiche Technique → Statistiques, et /wp-json/cer/v1/stats/export pour le dashboard
 * (mot de passe d'application d'un administrateur).
 */
defined( 'ABSPATH' ) || exit;

define( 'CER_STATS_DB', '1' );

/** 'off', 'test' ou 'tous'. */
function cer_stats_mode() {
	if ( defined( 'CER_STATS_MODE' ) ) {
		return CER_STATS_MODE;
	}
	return get_option( 'cer_stats_mode', 'test' );
}

function cer_stats_table() {
	global $wpdb;
	return $wpdb->prefix . 'cer_stats';
}

/** Table créée à la première écriture ou au premier passage dans l'admin (une mise à jour de plugin ne relance pas l'activation). */
function cer_stats_installer() {
	if ( CER_STATS_DB === get_option( 'cer_stats_db' ) ) {
		return;
	}
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	$t = cer_stats_table();
	dbDelta( "CREATE TABLE $t (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		t datetime NOT NULL,
		visite char(12) NOT NULL DEFAULT '',
		page varchar(12) NOT NULL DEFAULT '',
		ev varchar(24) NOT NULL DEFAULT '',
		d varchar(400) NOT NULL DEFAULT '',
		appareil varchar(10) NOT NULL DEFAULT '',
		source varchar(20) NOT NULL DEFAULT '',
		essai tinyint(1) NOT NULL DEFAULT 0,
		PRIMARY KEY  (id),
		KEY t (t),
		KEY visite (visite)
	) " . $wpdb->get_charset_collate() . ';' );
	update_option( 'cer_stats_db', CER_STATS_DB, false );
}
add_action( 'admin_init', 'cer_stats_installer' );

/** Pages où le script de mesure est chargé : type de page, ou false. */
function cer_stats_page() {
	if ( function_exists( 'cer_cfg_produits' ) && function_exists( 'is_product' ) && is_product() ) {
		$k = cer_cfg_produits()[ get_queried_object_id() ] ?? null;
		return $k ? $k : false;
	}
	// la page devis contient le panier (is_cart() y est vrai) : elle passe avant
	if ( is_page( apply_filters( 'cer_stats_page_devis', 'generer-un-devis' ) ) ) {
		return 'devis';
	}
	if ( function_exists( 'is_cart' ) && is_cart() ) {
		return 'panier';
	}
	if ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) {
		return 'merci';
	}
	if ( function_exists( 'is_checkout' ) && is_checkout() ) {
		return 'commande';
	}
	return false;
}

add_action( 'wp_enqueue_scripts', function () {
	if ( 'off' === cer_stats_mode() ) {
		return;
	}
	// autres pages du site : le script retient seulement d'où vient la visite (rien n'est envoyé), chargé en bas de page
	$page = cer_stats_page();
	list( $url, $dir ) = cer_cfg_assets();
	$f = 'cer-stats.js';
	wp_enqueue_script( 'cer-stats', $url . $f, [], CER_CFG_VERSION . '-' . ( file_exists( $dir . $f ) ? filemtime( $dir . $f ) : 0 ), ! $page );
	wp_add_inline_script( 'cer-stats', 'window.CER_STATS=' . wp_json_encode( [
		'url'    => esc_url_raw( rest_url( 'cer/v1/stats' ) ),
		'page'   => $page ? $page : '',
		'mode'   => cer_stats_mode(),
		'equipe' => is_user_logged_in() && current_user_can( 'edit_posts' ), // pages jamais mises en cache pour les connectés
	] ) . ';', 'before' );
}, 29 );

// WP Rocket : le script part tout de suite, tel quel (ni retardé, ni regroupé, ni minifié)
add_filter( 'rocket_delay_js_exclusions', function ( $l ) { $l[] = 'cer-stats'; $l[] = 'CER_STATS'; return $l; } );
add_filter( 'rocket_exclude_js', function ( $l ) { $l[] = '(.*)cer-stats(.*).js'; return $l; } );
add_filter( 'rocket_exclude_defer_js', function ( $l ) { $l[] = 'cer-stats'; return $l; } );

/* ───────── Écriture ───────── */

const CER_STATS_EVS = '/^[a-z0-9_]{2,24}$/';

function cer_stats_ecrire( array $lignes ) {
	if ( ! $lignes ) {
		return 0;
	}
	cer_stats_installer();
	// garde-fou : 30 000 lignes par jour au plus (un client fait une trentaine d'événements par page)
	$jour = 'cer_stats_n_' . gmdate( 'Ymd' );
	$n    = (int) get_transient( $jour );
	if ( $n > 30000 ) {
		return 0;
	}
	set_transient( $jour, $n + count( $lignes ), DAY_IN_SECONDS );
	global $wpdb;
	$vals = [];
	$args = [];
	foreach ( $lignes as $l ) {
		$vals[] = '(%s,%s,%s,%s,%s,%s,%s,%d)';
		array_push( $args, $l['t'], $l['visite'], $l['page'], $l['ev'], $l['d'], $l['appareil'], $l['source'], $l['essai'] );
	}
	$t = cer_stats_table();
	$wpdb->query( $wpdb->prepare( "INSERT INTO $t (t,visite,page,ev,d,appareil,source,essai) VALUES " . implode( ',', $vals ), $args ) ); // phpcs:ignore
	// ménage : 400 jours de données, une fois par jour
	if ( ! get_transient( 'cer_stats_menage' ) ) {
		set_transient( 'cer_stats_menage', 1, DAY_IN_SECONDS );
		$wpdb->query( $wpdb->prepare( "DELETE FROM $t WHERE t < %s", gmdate( 'Y-m-d H:i:s', time() - 400 * DAY_IN_SECONDS ) ) ); // phpcs:ignore
	}
	return count( $lignes );
}

/** Détail d'un événement : petit objet JSON, valeurs courtes, rien d'autre que des nombres et des textes. */
function cer_stats_detail( $d ) {
	if ( ! is_array( $d ) ) {
		return '';
	}
	$o = [];
	foreach ( array_slice( $d, 0, 8, true ) as $k => $v ) {
		$k = preg_replace( '/[^a-z0-9_]/i', '', (string) $k );
		if ( '' === $k ) {
			continue;
		}
		if ( is_bool( $v ) ) {
			$v = $v ? 1 : 0;
		}
		if ( is_int( $v ) || is_float( $v ) ) {
			$o[ substr( $k, 0, 12 ) ] = is_finite( (float) $v ) ? $v + 0 : 0;
		} elseif ( is_string( $v ) ) {
			$o[ substr( $k, 0, 12 ) ] = mb_substr( wp_strip_all_tags( $v ), 0, 90 );
		}
	}
	$j = $o ? wp_json_encode( $o, JSON_UNESCAPED_UNICODE ) : '';
	return strlen( $j ) > 400 ? '' : $j;
}

/** Envoi du navigateur : seulement depuis une page du site (en-tête Origin, ou Referer à défaut). */
function cer_stats_origine( WP_REST_Request $r ) {
	$h = function ( $u ) { return preg_replace( '/^www\./', '', strtolower( (string) wp_parse_url( $u, PHP_URL_HOST ) ) ); };
	$o = (string) ( $r->get_header( 'origin' ) ?: $r->get_header( 'referer' ) );
	return 'off' !== cer_stats_mode() && '' !== $o && $h( $o ) === $h( home_url() );
}

function cer_stats_recevoir( WP_REST_Request $r ) {
	$corps = $r->get_body(); // sendBeacon : text/plain
	if ( strlen( $corps ) > 48000 ) {
		return new WP_REST_Response( null, 413 );
	}
	$j = json_decode( $corps, true );
	if ( ! is_array( $j ) || empty( $j['e'] ) || ! is_array( $j['e'] ) ) {
		return new WP_REST_Response( null, 400 );
	}
	$visite   = preg_match( '/^[a-z0-9]{12}$/', (string) ( $j['v'] ?? '' ) ) ? $j['v'] : '';
	$page     = preg_match( '/^[a-z]{2,12}$/', (string) ( $j['p'] ?? '' ) ) ? $j['p'] : '';
	$appareil = in_array( $j['a'] ?? '', [ 'mobile', 'tablette', 'ordinateur' ], true ) ? $j['a'] : '';
	$source   = preg_match( '/^[a-z0-9_-]{2,20}$/', (string) ( $j['s'] ?? '' ) ) ? $j['s'] : '';
	$essai    = (int) ( $j['x'] ?? 0 );
	$essai    = in_array( $essai, [ 0, 1, 2 ], true ) ? $essai : 1;
	if ( 'test' === cer_stats_mode() && 0 === $essai ) {
		$essai = 1; // en mode essai, rien ne compte comme un client
	}
	if ( ! $visite || ! $page ) {
		return new WP_REST_Response( null, 400 );
	}
	$now    = time();
	$lignes = [];
	foreach ( array_slice( $j['e'], 0, 150 ) as $e ) {
		if ( ! is_array( $e ) || ! isset( $e[0], $e[1] ) || ! preg_match( CER_STATS_EVS, (string) $e[1] ) ) {
			continue;
		}
		$ts       = (int) floor( (float) $e[0] / 1000 );
		$ts       = ( $ts > $now - 6 * HOUR_IN_SECONDS && $ts <= $now + 60 ) ? min( $ts, $now ) : $now;
		$lignes[] = [ 't' => gmdate( 'Y-m-d H:i:s', $ts ), 'visite' => $visite, 'page' => $page, 'ev' => $e[1], 'd' => cer_stats_detail( $e[2] ?? null ), 'appareil' => $appareil, 'source' => $source, 'essai' => $essai ];
	}
	cer_stats_ecrire( $lignes );
	return new WP_REST_Response( null, 204 );
}

/** Événement noté par le serveur (devis produit, repli sur l'ancien devis, commande) ; visite transmise par le formulaire. */
function cer_stats_serveur( $ev, $d = [], $page = 'serveur' ) {
	if ( 'off' === cer_stats_mode() || ! preg_match( CER_STATS_EVS, $ev ) ) {
		return;
	}
	$v     = isset( $_POST['cer_visite'] ) ? sanitize_key( wp_unslash( $_POST['cer_visite'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	$essai = ( isset( $_COOKIE['cer_essai_devis'] ) || ( is_user_logged_in() && current_user_can( 'edit_posts' ) ) ) ? 2 : ( isset( $_COOKIE['cer_apercu_stats'] ) ? 1 : 0 );
	if ( 'test' === cer_stats_mode() && 0 === $essai ) {
		$essai = 1;
	}
	cer_stats_ecrire( [ [ 't' => gmdate( 'Y-m-d H:i:s' ), 'visite' => preg_match( '/^[a-z0-9]{12}$/', $v ) ? $v : '', 'page' => $page, 'ev' => $ev, 'd' => cer_stats_detail( $d ), 'appareil' => '', 'source' => '', 'essai' => $essai ] ] );
}

// demande de devis reçue par le générateur commun (avant son traitement)
foreach ( [ 'admin_post_wqg_generate_quote', 'admin_post_nopriv_wqg_generate_quote' ] as $h ) {
	add_action( $h, function () { cer_stats_serveur( 'devis_demande', [], 'devis' ); }, 1 );
}

// commande passée : types de configurateur commandés
add_action( 'woocommerce_checkout_order_processed', function ( $order_id, $data, $order ) {
	if ( ! $order || ! function_exists( 'cer_cfg_produits' ) ) {
		return;
	}
	$types = [];
	foreach ( $order->get_items() as $it ) {
		$k = cer_cfg_produits()[ (int) $it->get_product_id() ] ?? null;
		if ( $k ) {
			$types[ $k ] = 1;
		}
	}
	cer_stats_serveur( 'commande_creee', [ 'cfg' => implode( '+', array_keys( $types ) ), 'ttc' => round( (float) $order->get_total() ) ], 'commande' );
}, 20, 3 );

/* ───────── Lecture pour le dashboard ───────── */

function cer_stats_export( WP_REST_Request $r ) {
	cer_stats_installer();
	global $wpdb;
	$t     = cer_stats_table();
	$apres = max( 0, (int) $r->get_param( 'apres' ) );
	$n     = min( 10000, max( 1, (int) ( $r->get_param( 'n' ) ?: 5000 ) ) );
	$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT id,t,visite,page,ev,d,appareil,source,essai FROM $t WHERE id > %d ORDER BY id LIMIT %d", $apres, $n ), ARRAY_A ); // phpcs:ignore
	return new WP_REST_Response( [ 'mode' => cer_stats_mode(), 'lignes' => $rows ?: [] ], 200 );
}

add_action( 'rest_api_init', function () {
	// réglage modifiable aussi par /wp-json/wp/v2/settings (administrateur), pour basculer sans passer par l'écran
	register_setting( 'acft_group', 'cer_stats_mode', [
		'type'              => 'string',
		'default'           => 'test',
		'show_in_rest'      => [ 'schema' => [ 'enum' => [ 'off', 'test', 'tous' ] ] ],
		'sanitize_callback' => function ( $v ) { return in_array( $v, [ 'off', 'test', 'tous' ], true ) ? $v : 'test'; },
	] );
	register_rest_route( 'cer/v1', '/stats', [ 'methods' => 'POST', 'permission_callback' => 'cer_stats_origine', 'callback' => 'cer_stats_recevoir' ] );
	register_rest_route( 'cer/v1', '/stats/export', [ 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => 'cer_stats_export' ] );
} );

/* ───────── Écran Réglages → Fiche Technique → Statistiques ───────── */

add_action( 'admin_menu', function () {
	add_submenu_page( 'options-general.php', 'Statistiques des configurateurs', 'Statistiques configurateurs', 'manage_options', 'cer-stats', 'cer_stats_ecran' );
} );

/** Étapes du parcours, dans l'ordre : événement → libellé. */
function cer_stats_entonnoir() {
	return [
		'vue'            => 'Ont ouvert un configurateur',
		'option'         => 'Ont changé au moins une option',
		'etape_finie'    => 'Ont fini au moins une étape',
		'3d_ouvrir'      => 'Ont cliqué sur « Voir en 3D »',
		'3d_pret'        => 'Ont vu la 3D s\'afficher',
		'ar'             => 'Ont lancé la réalité augmentée',
		'panier_clic'    => 'Ont cliqué sur « Ajouter au panier »',
		'champ_manquant' => 'Ont été bloqués par une question sans réponse',
		'panier_refus'   => 'Ont eu un refus d\'ajout au panier',
		'panier_ok'      => 'Ont ajouté au panier',
		'page_panier'    => 'Ont vu le panier',
		'clic_devis'     => 'Ont cliqué sur « Générer un devis »',
		'devis_invalide' => 'Ont eu un champ refusé dans le formulaire de devis',
		'devis_envoi'    => 'Ont envoyé la demande de devis',
		'clic_commande'  => 'Ont cliqué sur « Valider la commande »',
		'commande_ok'    => 'Ont validé une commande',
		'erreur_js'      => 'Ont eu une erreur de page',
	];
}

function cer_stats_ecran() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	cer_stats_installer();
	global $wpdb;
	$t      = cer_stats_table();
	$jours  = in_array( (int) ( $_GET['j'] ?? 30 ), [ 7, 30, 90 ], true ) ? (int) $_GET['j'] : 30; // phpcs:ignore
	$essai  = isset( $_GET['essai'] ) ? 1 : 0; // phpcs:ignore
	$depuis = gmdate( 'Y-m-d H:i:s', time() - $jours * DAY_IN_SECONDS );
	$where  = $essai ? 'essai > 0' : 'essai = 0';
	// visites passées par un configurateur, par type
	$vis = (array) $wpdb->get_results( $wpdb->prepare( "SELECT page, appareil, COUNT(DISTINCT visite) n FROM $t WHERE t >= %s AND $where AND ev = 'vue' AND page IN ('abri','garage','carport') GROUP BY page, appareil", $depuis ), ARRAY_A ); // phpcs:ignore
	$par = (array) $wpdb->get_results( $wpdb->prepare( "SELECT s.ev, COUNT(DISTINCT s.visite) n FROM $t s JOIN (SELECT DISTINCT visite FROM $t WHERE t >= %s AND $where AND ev = 'vue' AND page IN ('abri','garage','carport')) c ON c.visite = s.visite WHERE s.t >= %s GROUP BY s.ev", $depuis, $depuis ), OBJECT_K ); // phpcs:ignore
	$det = function ( $ev, $cle, $lim = 12 ) use ( $wpdb, $t, $depuis, $where ) {
		return (array) $wpdb->get_results( $wpdb->prepare( "SELECT JSON_UNQUOTE(JSON_EXTRACT(d, %s)) v, COUNT(*) n FROM $t WHERE t >= %s AND $where AND ev = %s AND d <> '' GROUP BY v ORDER BY n DESC LIMIT %d", '$.' . $cle, $depuis, $ev, $lim ), ARRAY_A ); // phpcs:ignore
	};
	$total = 0;
	foreach ( $vis as $v ) {
		$total += (int) $v['n'];
	}
	$url = admin_url( 'options-general.php?page=cer-stats' );
	?>
	<div class="wrap">
		<h1>Statistiques des configurateurs</h1>
		<p>Mode : <strong><?php echo esc_html( [ 'off' => 'désactivé', 'test' => 'essai (?apercu=stats)', 'tous' => 'tous les visiteurs' ][ cer_stats_mode() ] ?? cer_stats_mode() ); ?></strong>
			(<a href="<?php echo esc_url( admin_url( 'options-general.php?page=acft-settings' ) ); ?>">réglage</a>). Période :
			<?php foreach ( [ 7, 30, 90 ] as $j ) : ?>
				<a href="<?php echo esc_url( add_query_arg( array_filter( [ 'j' => $j, 'essai' => $essai ?: null ] ), $url ) ); ?>" style="<?php echo $j === $jours ? 'font-weight:700' : ''; ?>"><?php echo (int) $j; ?> jours</a>
			<?php endforeach; ?>
			· <a href="<?php echo esc_url( add_query_arg( array_filter( [ 'j' => $jours, 'essai' => $essai ? null : 1 ] ), $url ) ); ?>"><?php echo $essai ? 'Voir les clients' : 'Voir les essais et l\'équipe'; ?></a>
		</p>
		<p><?php echo $essai ? 'Essais et équipe connectée.' : 'Clients seulement : l\'équipe connectée et les essais sont écartés.'; ?> Le tableau complet est dans le dashboard (onglet Cerisier).</p>
		<table class="widefat striped" style="max-width:760px">
			<thead><tr><th>Étape du parcours</th><th style="text-align:right">Visites</th><th style="text-align:right">% des visites</th></tr></thead>
			<tbody>
			<?php foreach ( cer_stats_entonnoir() as $ev => $lib ) :
				$n = isset( $par[ $ev ] ) ? (int) $par[ $ev ]->n : 0; ?>
				<tr><td><?php echo esc_html( $lib ); ?></td><td style="text-align:right"><?php echo (int) $n; ?></td><td style="text-align:right"><?php echo $total ? esc_html( round( $n / $total * 100 ) . ' %' ) : '—'; ?></td></tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<h2>Visites par configurateur et appareil</h2>
		<table class="widefat striped" style="max-width:760px"><thead><tr><th>Configurateur</th><th>Appareil</th><th style="text-align:right">Visites</th></tr></thead><tbody>
		<?php foreach ( $vis as $v ) : ?><tr><td><?php echo esc_html( $v['page'] ); ?></td><td><?php echo esc_html( $v['appareil'] ); ?></td><td style="text-align:right"><?php echo (int) $v['n']; ?></td></tr><?php endforeach; ?>
		</tbody></table>
		<?php foreach ( [ [ 'champ_manquant', 'f', 'Questions qui bloquent l\'ajout au panier' ], [ 'panier_refus', 'm', 'Messages de refus du panier' ], [ 'devis_invalide', 'f', 'Champs refusés dans le formulaire de devis' ], [ 'erreur_js', 'm', 'Erreurs de page' ], [ 'option', 'f', 'Questions les plus modifiées' ], [ 'abandon', 'e', 'Dernière étape avant de partir sans panier' ] ] as $b ) :
			$rows = $det( $b[0], $b[1] ); ?>
			<details style="max-width:760px;margin-top:14px"><summary style="cursor:pointer;font-weight:600"><?php echo esc_html( $b[2] ); ?> (<?php echo (int) array_sum( array_column( $rows, 'n' ) ); ?>)</summary>
				<table class="widefat striped"><tbody>
				<?php foreach ( $rows as $r ) : ?><tr><td><?php echo esc_html( $r['v'] ?: '—' ); ?></td><td style="text-align:right;width:80px"><?php echo (int) $r['n']; ?></td></tr><?php endforeach; ?>
				<?php if ( ! $rows ) : ?><tr><td>Rien sur la période.</td></tr><?php endif; ?>
				</tbody></table></details>
		<?php endforeach; ?>
	</div>
	<?php
}
