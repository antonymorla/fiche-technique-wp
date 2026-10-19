<?php
/**
 * Abri Cerisier — bouton « Recevoir mon devis » dans le panier, sur téléphone (demande d'Antony, 19/10/2026).
 *
 * Constat : depuis le 09/10, aucun devis n'a été fait sur téléphone. Dans le panier, « Générer un devis » est un petit
 * bouton parmi « Mettre à jour le panier » et « Panier vide », et le seul gros bouton est « Valider la commande ».
 * Sur téléphone seulement (moins de 769 px de large) :
 *   - un vrai bouton juste sous les articles, avant le code promo ;
 *   - une barre fixe en bas de l'écran : le total et le bouton.
 * L'ordinateur ne change pas. Les deux mènent à la page « Générer un devis » existante.
 *
 * Réglage : Réglages → Fiche Technique → « Bouton devis du panier (téléphone) » : désactivé / essai / tous.
 * En essai, seulement après un passage par ?apercu=devis (cookie de 30 jours) : les clients ne voient rien.
 * Les clics sont notés par la mesure des configurateurs (clic_devis, zone « bouton-panier » ou « barre-panier »).
 */
defined( 'ABSPATH' ) || exit;

function cer_pdv_mode() {
	return get_option( 'cer_devis_mobile', 'test' );
}

function cer_pdv_lien_test() {
	return isset( $_GET['apercu'] ) && 'devis' === $_GET['apercu']; // phpcs:ignore WordPress.Security.NonceVerification
}

function cer_pdv_actif() {
	$mode = cer_pdv_mode();
	if ( 'tous' === $mode ) {
		return true;
	}
	return 'test' === $mode && ( cer_pdv_lien_test() || ( isset( $_COOKIE['cer_apercu_devis'] ) && '1' === $_COOKIE['cer_apercu_devis'] ) );
}

add_action( 'template_redirect', function () {
	if ( cer_pdv_lien_test() && 'test' === cer_pdv_mode() ) {
		setcookie( 'cer_apercu_devis', '1', time() + 30 * DAY_IN_SECONDS, COOKIEPATH ? COOKIEPATH : '/', COOKIE_DOMAIN, is_ssl(), false );
		$_COOKIE['cer_apercu_devis'] = '1';
	}
}, 1 );
// WP Rocket : pas de page en cache pour qui a le cookie d'essai
add_filter( 'rocket_cache_reject_cookies', function ( $c ) { $c[] = 'cer_apercu_devis'; return $c; } );

/** Adresse de la page « Générer un devis » du générateur commun. */
function cer_pdv_url() {
	$p = get_page_by_path( apply_filters( 'cer_stats_page_devis', 'generer-un-devis' ) );
	return $p ? get_permalink( $p ) : home_url( '/generer-un-devis/' );
}

/** Le panier contient-il un configurateur (devis avec plans) ? */
function cer_pdv_avec_plans() {
	if ( ! function_exists( 'WC' ) || ! WC()->cart || ! function_exists( 'cer_cfg_produits' ) ) {
		return false;
	}
	foreach ( WC()->cart->get_cart() as $it ) {
		if ( isset( cer_cfg_produits()[ (int) $it['product_id'] ] ) ) {
			return true;
		}
	}
	return false;
}

function cer_pdv_texte() {
	return cer_pdv_avec_plans()
		? 'Devis PDF détaillé avec les plans de votre configuration, gratuit et sans engagement.'
		: 'Devis PDF détaillé, gratuit et sans engagement.';
}

// 1. Sous les articles, avant le code promo (ligne ajoutée au tableau du panier)
add_action( 'woocommerce_cart_contents', function () {
	if ( ! cer_pdv_actif() || ! WC()->cart || WC()->cart->is_empty() ) {
		return;
	}
	echo '<tr class="cer-pdv-ligne"><td colspan="6" class="cer-pdv-cellule">'
		. '<a class="cer-pdv-bouton" data-cer-devis="bouton-panier" href="' . esc_url( cer_pdv_url() ) . '">Recevoir mon devis</a>'
		. '<p class="cer-pdv-note">' . esc_html( cer_pdv_texte() ) . '</p>'
		. '</td></tr>';
} );

// 2. Barre fixe en bas de l'écran, et styles (téléphone seulement)
add_action( 'wp_footer', function () {
	if ( ! function_exists( 'is_cart' ) || ! is_cart() || ! cer_pdv_actif() || ! WC()->cart || WC()->cart->is_empty() ) {
		return;
	}
	?>
	<style id="cer-pdv-css">
	.cer-pdv-ligne, .cer-pdv-barre { display: none; }
	@media (max-width: 768px) {
		/* le thème garde un vrai tableau sur téléphone : la ligne reste une ligne de tableau, sa cellule couvre toutes les colonnes */
		table tr.cer-pdv-ligne { display: table-row !important; border: 0 !important; }
		table tr.cer-pdv-ligne td.cer-pdv-cellule { display: table-cell !important; width: 100% !important; text-align: left !important; padding: 18px 0 8px !important; border: 0 !important; }
		table tr.cer-pdv-ligne td.cer-pdv-cellule::before { content: none !important; display: none !important; }
		a.cer-pdv-bouton { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 54px; box-sizing: border-box; padding: 14px 18px; background: #515136; color: #fff !important; text-decoration: none !important; text-transform: uppercase; letter-spacing: .06em; font-size: 15px; font-weight: 600; line-height: 1.2; border: 0; border-radius: 0; }
		a.cer-pdv-bouton:active, a.cer-pdv-bouton:focus-visible { background: #3e3e29; outline: 2px solid #161619; outline-offset: 2px; }
		.cer-pdv-note { margin: 8px 2px 0; font-size: 13px; line-height: 1.4; color: #555; text-align: center; }
		.cer-pdv-barre { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 9990; align-items: center; gap: 12px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -2px 12px rgba(0,0,0,.12); }
		.cer-pdv-barre .cer-pdv-total { flex: 0 0 auto; display: flex; flex-direction: column; font-size: 12px; line-height: 1.2; color: #555; }
		.cer-pdv-barre .cer-pdv-total strong { font-size: 17px; color: #161619; white-space: nowrap; }
		.cer-pdv-barre a.cer-pdv-bouton { flex: 1 1 auto; width: auto; min-height: 48px; padding: 10px 12px; font-size: 14px; }
		body.cer-pdv-avec-barre { padding-bottom: calc(var(--cer-pdv-h, 70px) + 12px); }
		/* l'onglet « Gérer le consentement » de Complianz (fixé en bas à droite) couvrait le bouton de la barre : il passe juste au-dessus */
		body.cer-pdv-avec-barre #cmplz-manage-consent .cmplz-manage-consent { bottom: var(--cer-pdv-h, 70px) !important; }
	}
	</style>
	<div class="cer-pdv-barre" role="region" aria-label="Recevoir mon devis">
		<span class="cer-pdv-total">Total<strong class="cer-pdv-montant"><?php echo wp_kses_post( WC()->cart->get_total() ); ?></strong></span>
		<a class="cer-pdv-bouton" data-cer-devis="barre-panier" href="<?php echo esc_url( cer_pdv_url() ); ?>">Recevoir mon devis</a>
	</div>
	<script id="cer-pdv-js">
	(function () {
		document.body.classList.add('cer-pdv-avec-barre');
		var hauteur = function () { var b = document.querySelector('.cer-pdv-barre'); if (b && b.offsetHeight) document.documentElement.style.setProperty('--cer-pdv-h', b.offsetHeight + 'px'); };
		hauteur(); window.addEventListener('resize', hauteur);
		// le panier se recalcule sans recharger la page (quantité, code promo) : le total de la barre suit
		var maj = function () {
			var t = document.querySelector('.cart_totals .order-total .amount'), m = document.querySelector('.cer-pdv-barre .cer-pdv-montant');
			if (t && m) m.innerHTML = t.innerHTML;
			if (!document.querySelector('.woocommerce-cart-form .cart_item')) { var b = document.querySelector('.cer-pdv-barre'); if (b) b.remove(); document.body.classList.remove('cer-pdv-avec-barre'); }
		};
		if (window.jQuery) jQuery(document.body).on('updated_cart_totals updated_wc_div', maj);
	})();
	</script>
	<?php
}, 30 );
