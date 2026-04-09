<?php
/**
 * Plugin Name:       Fiche Technique – Abri Cerisier
 * Plugin URI:        https://github.com/antonymorla/fiche-technique-wp
 * Description:       Outil interne de génération de fiches techniques (plan de masse + élévations SVG, export PDF). Accessible sur une URL cachée configurable.
 * Version:           2.1.0
 * Author:            Abri Français
 * Author URI:        https://abri-cerisier.fr
 * License:           Proprietary
 * Requires at least: 5.9
 * Requires PHP:      7.4
 * Text Domain:       ac-fiche-technique
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ═══════════════════════════════════════════════════════════════
   CONSTANTES
═══════════════════════════════════════════════════════════════ */

define( 'ACFT_VERSION',  '2.1.0' );
define( 'ACFT_DIR',      plugin_dir_path( __FILE__ ) );
define( 'ACFT_URL',      plugin_dir_url( __FILE__ ) );
define( 'ACFT_SLUG',     'abri-cerisier-fiche-technique' );
define( 'ACFT_PLUGIN',   plugin_basename( __FILE__ ) );
define( 'ACFT_GITHUB',   'antonymorla/fiche-technique-wp' );

/* ═══════════════════════════════════════════════════════════════
   1. RÉÉCRITURE D'URL – slug caché
═══════════════════════════════════════════════════════════════ */

add_action( 'init', 'acft_register_rewrite' );
function acft_register_rewrite() {
    $slug = acft_get_slug();
    add_rewrite_rule( '^' . preg_quote( $slug, '/' ) . '/?$', 'index.php?acft_page=1', 'top' );
    add_rewrite_tag( '%acft_page%', '([^&]+)' );
}

function acft_get_slug() {
    return sanitize_title( get_option( 'acft_slug', 'fiche-technique-interne' ) );
}

register_activation_hook( __FILE__, function() {
    acft_register_rewrite();
    flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, function() {
    flush_rewrite_rules();
} );

/* ═══════════════════════════════════════════════════════════════
   2. SERVIR LA PAGE OUTIL
═══════════════════════════════════════════════════════════════ */

add_action( 'template_redirect', 'acft_serve_page' );
function acft_serve_page() {
    if ( ! get_query_var( 'acft_page' ) ) return;

    nocache_headers();
    status_header( 200 );
    header( 'Content-Type: text/html; charset=UTF-8' );

    $template = ACFT_DIR . 'templates/fiche-technique.html';
    if ( ! file_exists( $template ) ) {
        wp_die(
            '<p>Template introuvable. Vérifiez que <code>templates/fiche-technique.html</code> est présent dans le dossier du plugin.</p>',
            'Fiche Technique – Erreur 500', 500
        );
    }

    $html = file_get_contents( $template );

    // Injecter les variables WP (URL du site, REST API, nonce CSRF)
    $inject = sprintf(
        "<script>window.ACFT={site:'%s',api:'%s',nonce:'%s',version:'%s'};</script>\n",
        esc_js( get_site_url() ),
        esc_js( rest_url( 'ac-ft/v1' ) ),
        esc_js( wp_create_nonce( 'wp_rest' ) ),
        esc_js( ACFT_VERSION )
    );
    $html = str_replace( '</head>', $inject . '</head>', $html );

    echo $html;
    exit;
}

/* ═══════════════════════════════════════════════════════════════
   3. REST API
═══════════════════════════════════════════════════════════════ */

add_action( 'rest_api_init', 'acft_register_rest' );
function acft_register_rest() {

    // Recherche médias WP
    register_rest_route( 'ac-ft/v1', '/media', [
        'methods'             => 'GET',
        'callback'            => 'acft_rest_media',
        'permission_callback' => '__return_true',
        'args'                => [
            's' => [ 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ],
        ],
    ] );

    // Config WAPF par type de produit
    register_rest_route( 'ac-ft/v1', '/wapf-config/(?P<type>[a-z]+)', [
        'methods'             => 'GET',
        'callback'            => 'acft_rest_wapf_config',
        'permission_callback' => '__return_true',
        'args'                => [
            'type' => [
                'required'          => true,
                'validate_callback' => function( $v ) {
                    return in_array( $v, [ 'abri', 'garage', 'carport' ], true );
                },
            ],
        ],
    ] );

    // Prix Google Sheets (proxy mis en cache 1 h)
    register_rest_route( 'ac-ft/v1', '/pricing', [
        'methods'             => 'GET',
        'callback'            => 'acft_rest_pricing',
        'permission_callback' => '__return_true',
    ] );

    // Lookup tables WAPF (directement depuis le plugin wombat/WAPF)
    register_rest_route( 'ac-ft/v1', '/lookup-tables', [
        'methods'             => 'GET',
        'callback'            => 'acft_rest_lookup_tables',
        'permission_callback' => '__return_true',
    ] );
}

function acft_rest_media( WP_REST_Request $req ) {
    $args = [
        'post_type'      => 'attachment',
        'post_status'    => 'inherit',
        'posts_per_page' => 12,
        'orderby'        => 'relevance',
        's'              => $req->get_param( 's' ),
    ];
    $results = [];
    foreach ( ( new WP_Query( $args ) )->posts as $p ) {
        $src = wp_get_attachment_image_src( $p->ID, 'medium' );
        $results[] = [
            'id'    => $p->ID,
            'title' => get_the_title( $p->ID ),
            'url'   => $src ? $src[0] : wp_get_attachment_url( $p->ID ),
            'full'  => wp_get_attachment_url( $p->ID ),
        ];
    }
    return rest_ensure_response( $results );
}

function acft_rest_wapf_config( WP_REST_Request $req ) {
    $type = $req->get_param( 'type' );

    // Essaie les groupes de champs WAPF enregistrés
    global $wpdb;
    $groups = $wpdb->get_results(
        "SELECT ID, post_title, post_content FROM {$wpdb->posts}
         WHERE post_type = 'wapf_field_group' AND post_status = 'publish'
         ORDER BY post_title ASC"
    );
    $data = [];
    foreach ( $groups as $g ) {
        if ( $type === 'all' || stripos( $g->post_title, $type ) !== false ) {
            $data[] = [
                'group_id'   => $g->ID,
                'group_name' => $g->post_title,
                'fields'     => json_decode( $g->post_content, true ),
            ];
        }
    }

    if ( empty( $data ) ) {
        // Fallback : métadonnées _wapf_fields sur les produits WooCommerce
        $products = get_posts( [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => 5,
            's'              => $type,
        ] );
        foreach ( $products as $p ) {
            $f = get_post_meta( $p->ID, '_wapf_fields', true );
            if ( $f ) {
                $data[] = [
                    'product_id'   => $p->ID,
                    'product_name' => $p->post_title,
                    'wapf_fields'  => $f,
                ];
            }
        }
    }

    return rest_ensure_response( $data );
}

function acft_rest_pricing( WP_REST_Request $req ) {
    $cached = get_transient( 'acft_pricing_v1' );
    if ( $cached !== false ) return rest_ensure_response( $cached );

    $sheet_id = '1ye6APr6OLX9G6IfK_gHZ1nxBWIFmTSspOrABFGBZdBo';
    $sheets   = [ 'Feuil Options', 'Feuil Import prix', 'Feuil MENUISERIES', 'Feuil montage' ];
    $result   = [];

    foreach ( $sheets as $sheet ) {
        $url  = "https://docs.google.com/spreadsheets/d/{$sheet_id}/gviz/tq?tqx=out:csv&sheet=" . rawurlencode( $sheet );
        $resp = wp_remote_get( $url, [ 'timeout' => 15 ] );
        if ( is_wp_error( $resp ) ) continue;
        $rows             = array_map( 'str_getcsv', explode( "\n", wp_remote_retrieve_body( $resp ) ) );
        $result[ $sheet ] = acft_parse_price_tables( $rows );
    }

    set_transient( 'acft_pricing_v1', $result, HOUR_IN_SECONDS );
    return rest_ensure_response( $result );
}

function acft_parse_price_tables( array $rows ) {
    $tables  = [];
    $current = null;
    $cols    = [];
    $widths  = [ '2', '2,5', '3', '3,5', '4', '4,5', '5', '5,5', '6', '6,5', '7', '7,5' ];

    foreach ( $rows as $row ) {
        if ( empty( $row ) ) continue;
        $first = trim( $row[0] );
        if ( $first === '' && count( array_filter( $row ) ) === 0 ) continue;

        $is_numeric_val = is_numeric( str_replace( ',', '.', $first ) );

        if ( $first !== '' && ! $is_numeric_val && ! in_array( $first, [ '1','2','3','4','5','6','7','8','9','10','11','12','13' ], true ) ) {
            if ( $current ) $tables[] = $current;
            $current = [ 'title' => $first, 'cols' => [], 'prices' => [] ];
            $cols    = [];
            continue;
        }

        if ( $first === '' && isset( $row[1] ) && in_array( trim( $row[1] ), $widths, true ) ) {
            $cols = $current['cols'] = array_values( array_slice( array_map( 'trim', $row ), 1, 12 ) );
            continue;
        }

        if ( $first === '1' && isset( $row[1] ) && trim( $row[1] ) === '2' ) continue;

        if ( $is_numeric_val && $current ) {
            $depth  = (string) (float) str_replace( ',', '.', $first );
            $prices = [];
            foreach ( $cols as $i => $w ) {
                $raw = trim( $row[ $i + 1 ] ?? '' );
                $raw = preg_replace( '/[^\d,.]/', '', $raw );
                $raw = str_replace( ',', '.', $raw );
                $prices[ $w ] = $raw !== '' && is_numeric( $raw ) ? (float) $raw : null;
            }
            $current['prices'][ $depth ] = $prices;
        }
    }
    if ( $current ) $tables[] = $current;
    return $tables;
}

/**
 * Endpoint : /ac-ft/v1/lookup-tables
 * Retourne les lookup tables du plugin WAPF (wombat) exactement comme elles
 * sont injectées dans le frontend par add_lookup_tables().
 * Source : filtre WordPress 'wapf/lookup_tables' (défini par le plugin WAPF).
 */
function acft_rest_lookup_tables( WP_REST_Request $req ) {
    $cached = get_transient( 'acft_lookup_tables_v1' );
    if ( $cached !== false && $cached !== 'error' ) {
        return rest_ensure_response( $cached );
    }

    // Appeler le filtre WAPF pour obtenir les lookup tables
    $tables = apply_filters( 'wapf/lookup_tables', [] );

    if ( ! empty( $tables ) ) {
        set_transient( 'acft_lookup_tables_v1', $tables, 4 * HOUR_IN_SECONDS );
        return rest_ensure_response( $tables );
    }

    // Fallback : chercher dans les options WordPress ou les post meta
    // Le plugin "WC Product Addon Lookup Table" stocke les données en option
    global $wpdb;
    $option_tables = $wpdb->get_results(
        "SELECT option_name, option_value FROM {$wpdb->options}
         WHERE option_name LIKE 'wapf_lookup_%' OR option_name LIKE '_wapf_lookup_%'
         ORDER BY option_name ASC"
    );
    if ( $option_tables ) {
        $result = [];
        foreach ( $option_tables as $opt ) {
            $data = maybe_unserialize( $opt->option_value );
            if ( ! $data ) $data = json_decode( $opt->option_value, true );
            $key  = str_replace( [ 'wapf_lookup_', '_wapf_lookup_' ], '', $opt->option_name );
            $result[ $key ] = $data;
        }
        set_transient( 'acft_lookup_tables_v1', $result, 4 * HOUR_IN_SECONDS );
        return rest_ensure_response( $result );
    }

    // Dernier fallback : chercher dans les pages produits WooCommerce
    // Les lookup tables sont parfois stockées dans les post meta des produits
    $products = get_posts( [
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => 10,
        'meta_key'       => '_wapf_lookup_tables',
    ] );
    $result = [];
    foreach ( $products as $p ) {
        $lt = get_post_meta( $p->ID, '_wapf_lookup_tables', true );
        if ( $lt ) {
            $result[ 'product_' . $p->ID ] = $lt;
        }
    }

    if ( empty( $result ) ) {
        set_transient( 'acft_lookup_tables_v1', 'error', 5 * MINUTE_IN_SECONDS );
        return rest_ensure_response( [ 'error' => 'Aucune lookup table trouvée. Le plugin WAPF doit être actif.' ] );
    }

    set_transient( 'acft_lookup_tables_v1', $result, 4 * HOUR_IN_SECONDS );
    return rest_ensure_response( $result );
}

/* ═══════════════════════════════════════════════════════════════
   4. MISE À JOUR AUTOMATIQUE DEPUIS GITHUB
═══════════════════════════════════════════════════════════════ */

add_filter( 'pre_set_site_transient_update_plugins', 'acft_update_check' );
function acft_update_check( $transient ) {
    if ( empty( $transient->checked ) ) return $transient;

    $release = acft_get_github_release();
    if ( ! $release ) return $transient;

    $latest  = ltrim( $release->tag_name ?? '', 'v' );
    $package = acft_get_release_zip_url( $release );

    $plugin_data = (object) [
        'id'            => ACFT_GITHUB,
        'slug'          => ACFT_SLUG,
        'plugin'        => ACFT_PLUGIN,
        'new_version'   => $latest,
        'url'           => $release->html_url ?? '',
        'package'       => $package,
        'icons'         => [],
        'banners'       => [],
        'banners_rtl'   => [],
        'tested'        => '6.7',
        'requires_php'  => '7.4',
        'compatibility' => new stdClass(),
    ];

    if ( version_compare( ACFT_VERSION, $latest, '<' ) ) {
        // Mise à jour disponible
        $transient->response[ ACFT_PLUGIN ] = $plugin_data;
        unset( $transient->no_update[ ACFT_PLUGIN ] );
    } else {
        // À jour — enregistrer dans no_update pour que WP affiche "Activer les MAJ auto"
        $transient->no_update[ ACFT_PLUGIN ] = $plugin_data;
        unset( $transient->response[ ACFT_PLUGIN ] );
    }
    return $transient;
}

// Permettre les mises à jour automatiques pour ce plugin
add_filter( 'auto_update_plugin', 'acft_auto_update', 10, 2 );
function acft_auto_update( $update, $item ) {
    if ( isset( $item->plugin ) && $item->plugin === ACFT_PLUGIN ) {
        return true; // Activer auto-update par défaut
    }
    return $update;
}

add_filter( 'plugins_api', 'acft_plugins_api_info', 10, 3 );
function acft_plugins_api_info( $res, $action, $args ) {
    if ( $action !== 'plugin_information' || ( $args->slug ?? '' ) !== ACFT_SLUG ) return $res;

    $release = acft_get_github_release();
    if ( ! $release ) return $res;

    return (object) [
        'name'          => 'Fiche Technique – Abri Cerisier',
        'slug'          => ACFT_SLUG,
        'version'       => ltrim( $release->tag_name ?? ACFT_VERSION, 'v' ),
        'author'        => '<a href="https://abri-cerisier.fr">Abri Français</a>',
        'homepage'      => 'https://github.com/' . ACFT_GITHUB,
        'short_description' => 'Outil interne de génération de fiches techniques SVG / PDF.',
        'sections'      => [
            'changelog' => $release->body ?? '',
        ],
        'download_link' => acft_get_release_zip_url( $release ),
        'last_updated'  => $release->published_at ?? '',
        'requires'      => '5.9',
        'tested'        => '6.5',
        'requires_php'  => '7.4',
    ];
}

/**
 * Après téléchargement du ZIP GitHub, WordPress extrait un dossier
 * "antonymorla-fiche-technique-wp-XXXXXXX/" — on le renomme en
 * "abri-cerisier-fiche-technique/" pour que le plugin reste actif.
 */
add_filter( 'upgrader_source_selection', 'acft_fix_update_folder', 10, 4 );
function acft_fix_update_folder( $source, $remote_source, $upgrader, $hook_extra ) {
    // Ne traiter que les mises à jour de CE plugin
    if ( ! isset( $hook_extra['plugin'] ) ) return $source;
    if ( $hook_extra['plugin'] !== ACFT_PLUGIN ) return $source;

    global $wp_filesystem;

    // Le dossier extrait doit s'appeler exactement ACFT_SLUG
    $correct_dir = trailingslashit( $remote_source ) . ACFT_SLUG . '/';

    // Si c'est déjà le bon nom, ne rien faire
    if ( trailingslashit( $source ) === $correct_dir ) return $source;

    // Renommer le dossier extrait vers le bon nom
    if ( $wp_filesystem->move( untrailingslashit( $source ), untrailingslashit( $correct_dir ) ) ) {
        return $correct_dir;
    }

    // Si le rename échoue, retourner la source originale
    return $source;
}

/**
 * Retourne l'URL du ZIP uploadé en asset sur la release, ou le zipball en fallback.
 * Le ZIP asset a déjà la bonne structure de dossier (abri-cerisier-fiche-technique/).
 */
function acft_get_release_zip_url( $release ) {
    if ( ! empty( $release->assets ) ) {
        foreach ( $release->assets as $asset ) {
            if ( isset( $asset->browser_download_url ) && substr( $asset->name, -4 ) === '.zip' ) {
                return $asset->browser_download_url;
            }
        }
    }
    return $release->zipball_url ?? '';
}

/**
 * Récupère le dernier release GitHub (cache 6 h)
 */
function acft_get_github_release() {
    $cached = get_transient( 'acft_github_release' );
    if ( $cached !== false && $cached !== 'error' ) return $cached;

    $resp = wp_remote_get(
        'https://api.github.com/repos/' . ACFT_GITHUB . '/releases/latest',
        [
            'timeout' => 15,
            'headers' => [
                'Accept'     => 'application/vnd.github.v3+json',
                'User-Agent' => 'WordPress/' . get_bloginfo( 'version' ) . '; ' . get_bloginfo( 'url' ),
            ],
        ]
    );

    if ( is_wp_error( $resp ) || wp_remote_retrieve_response_code( $resp ) !== 200 ) {
        // Cache erreur 5min pour ne pas spammer l'API
        set_transient( 'acft_github_release', 'error', 5 * MINUTE_IN_SECONDS );
        return null;
    }

    $release = json_decode( wp_remote_retrieve_body( $resp ) );
    if ( empty( $release->tag_name ) ) {
        set_transient( 'acft_github_release', 'error', 5 * MINUTE_IN_SECONDS );
        return null;
    }

    set_transient( 'acft_github_release', $release, HOUR_IN_SECONDS );
    return $release;
}

/**
 * Forcer WordPress à vérifier les mises à jour de ce plugin plus souvent.
 * Quand l'admin visite la page Extensions, on efface le cache pour forcer un check frais.
 */
add_action( 'load-plugins.php', function() {
    delete_transient( 'acft_github_release' );
    // Forcer WordPress à re-checker les mises à jour de plugins
    delete_site_transient( 'update_plugins' );
} );

// Aussi quand l'admin visite la page Mises à jour
add_action( 'load-update-core.php', function() {
    delete_transient( 'acft_github_release' );
    delete_site_transient( 'update_plugins' );
} );

/* ═══════════════════════════════════════════════════════════════
   5. PAGE DE RÉGLAGES WordPress (Réglages → Fiche Technique)
═══════════════════════════════════════════════════════════════ */

add_action( 'admin_menu', function() {
    add_options_page( 'Fiche Technique', 'Fiche Technique', 'manage_options', 'acft-settings', 'acft_settings_page' );
} );

add_action( 'admin_init', function() {
    register_setting( 'acft_group', 'acft_slug', [
        'sanitize_callback' => function( $v ) {
            $v = sanitize_title( $v );
            acft_register_rewrite();
            flush_rewrite_rules();
            return $v;
        },
    ] );
} );

function acft_settings_page() {
    $slug     = acft_get_slug();
    $full_url = trailingslashit( get_site_url() . '/' . $slug );

    // Force refresh release info (pas de cache pour la page admin)
    delete_transient( 'acft_github_release' );
    $release = acft_get_github_release();
    $latest  = ( $release && ! empty( $release->tag_name ) ) ? ltrim( $release->tag_name, 'v' ) : '—';
    ?>
    <div class="wrap">
        <h1>Fiche Technique — Réglages</h1>

        <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:18px 24px;margin:16px 0;max-width:700px">
            <h2 style="margin-top:0">URL de l'outil</h2>
            <p><a href="<?php echo esc_url( $full_url ); ?>" target="_blank" style="font-size:15px;font-weight:600"><?php echo esc_html( $full_url ); ?></a></p>
        </div>

        <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:18px 24px;margin:16px 0;max-width:700px">
            <h2 style="margin-top:0">Version</h2>
            <p><strong>Installée :</strong> <?php echo esc_html( ACFT_VERSION ); ?></p>
            <p><strong>GitHub :</strong> <?php echo esc_html( $latest ); ?></p>
            <?php if ( $release && version_compare( ACFT_VERSION, $latest, '<' ) ) : ?>
                <p><a href="<?php echo esc_url( admin_url( 'update-core.php' ) ); ?>" class="button button-primary">Mettre à jour vers <?php echo esc_html( $latest ); ?></a></p>
            <?php else : ?>
                <p style="color:green">Plugin à jour.</p>
            <?php endif; ?>
        </div>

        <form method="post" action="options.php">
            <?php settings_fields( 'acft_group' ); ?>
            <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:18px 24px;margin:16px 0;max-width:700px">
                <h2 style="margin-top:0">URL cachée</h2>
                <table class="form-table">
                    <tr>
                        <th><label for="acft_slug">Slug</label></th>
                        <td>
                            <code><?php echo esc_html( get_site_url() . '/' ); ?></code>
                            <input type="text" id="acft_slug" name="acft_slug"
                                   value="<?php echo esc_attr( $slug ); ?>" class="regular-text" />
                            <code>/</code>
                        </td>
                    </tr>
                </table>
                <?php submit_button( 'Enregistrer' ); ?>
            </div>
        </form>

        <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:18px 24px;margin:16px 0;max-width:700px">
            <h2 style="margin-top:0">REST API</h2>
            <ul style="list-style:disc;padding-left:20px">
                <li><code>/ac-ft/v1/lookup-tables</code> — Tables de prix WAPF</li>
                <li><code>/ac-ft/v1/wapf-config/{type}</code> — Config configurateur</li>
                <li><code>/ac-ft/v1/media?s=...</code> — Recherche médias</li>
            </ul>
        </div>
    </div>
    <?php
}

/* ─── Liens dans la liste des extensions ──────────────────────── */
add_filter( 'plugin_action_links_' . ACFT_PLUGIN, function( $links ) {
    $url      = trailingslashit( get_site_url() . '/' . acft_get_slug() );
    $links[]  = '<a href="' . esc_url( $url ) . '" target="_blank">🔗 Voir l\'outil</a>';
    $links[]  = '<a href="' . esc_url( admin_url( 'options-general.php?page=acft-settings' ) ) . '">⚙️ Réglages</a>';
    return $links;
} );
