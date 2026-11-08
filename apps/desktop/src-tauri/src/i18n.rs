//! Minimal backend i18n for the few Rust-side strings (tray menu, the success
//! notification, diagnostics labels). The active locale comes from the config
//! (`settings.locale`, "system" or a code) → the macOS system language → English.
//! The web UI owns the bulk of the strings (see `src/i18n.ts`); this mirrors a
//! handful that originate in Rust.

use std::process::Command;
use std::sync::OnceLock;

use tauri::AppHandle;

const SUPPORTED: [&str; 8] = ["en", "fr", "ja", "es", "de", "zh", "pt", "ko"];

fn pin(code: &str) -> &'static str {
    SUPPORTED
        .iter()
        .find(|&&l| l == code)
        .copied()
        .unwrap_or("en")
}

/// The macOS system language (cached): `defaults read -g AppleLocale` → base code.
fn system_locale() -> &'static str {
    static CACHE: OnceLock<&'static str> = OnceLock::new();
    CACHE.get_or_init(|| {
        let raw = Command::new("defaults")
            .args(["read", "-g", "AppleLocale"])
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_default();
        // "fr_FR" / "fr-FR" → "fr"
        let base = raw.split(['_', '-']).next().unwrap_or("en").to_lowercase();
        pin(&base)
    })
}

/// Resolve the active backend locale: config override → system → English.
#[must_use]
pub fn locale(app: &AppHandle) -> &'static str {
    let code = crate::config::read(app).settings.locale;
    match code.as_str() {
        c if SUPPORTED.contains(&c) => pin(c),
        _ => system_locale(), // "system" / unset / unsupported
    }
}

/// Translate a key for a locale, falling back to English (then the key itself).
#[must_use]
pub fn t(locale: &str, key: &'static str) -> &'static str {
    match key {
        "tray.beam" => match locale {
            "fr" => "Envoyer la capture",
            "ja" => "スクリーンショットを送信",
            "es" => "Enviar la captura",
            "de" => "Screenshot senden",
            "zh" => "发送截图",
            "pt" => "Enviar a captura",
            "ko" => "스크린샷 전송",
            _ => "Beam screenshot",
        },
        "tray.switchHost" => match locale {
            "fr" => "Changer d’hôte",
            "ja" => "ホストを切り替え",
            "es" => "Cambiar de host",
            "de" => "Host wechseln",
            "zh" => "切换主机",
            "pt" => "Trocar de host",
            "ko" => "호스트 전환",
            _ => "Switch host",
        },
        // Followed by "<host>:<port>", one line per open dev-server forward
        // (ADR 0029); clicking it stops that one.
        "tray.stopForward" => match locale {
            "fr" => "Arrêter la redirection",
            "ja" => "転送を停止",
            "es" => "Detener el reenvío",
            "de" => "Weiterleitung beenden",
            "zh" => "停止转发",
            "pt" => "Parar o encaminhamento",
            "ko" => "포워딩 중지",
            _ => "Stop forwarding",
        },
        "tray.recent" => match locale {
            "fr" => "Récent",
            "ja" => "最近",
            "es" => "Reciente",
            "de" => "Zuletzt",
            "zh" => "最近",
            "pt" => "Recentes",
            "ko" => "최근",
            _ => "Recent",
        },
        "tray.showAll" => match locale {
            "fr" => "Tout afficher…",
            "ja" => "すべて表示…",
            "es" => "Ver todo…",
            "de" => "Alle anzeigen…",
            "zh" => "显示全部…",
            "pt" => "Ver tudo…",
            "ko" => "모두 보기…",
            _ => "Show all…",
        },
        "tray.manageHosts" => match locale {
            "fr" => "Gérer les hôtes…",
            "ja" => "ホストを管理…",
            "es" => "Gestionar hosts…",
            "de" => "Hosts verwalten…",
            "zh" => "管理主机…",
            "pt" => "Gerenciar hosts…",
            "ko" => "호스트 관리…",
            _ => "Manage hosts…",
        },
        "tray.open" => match locale {
            "fr" => "Ouvrir Hostbeam",
            "ja" => "Hostbeam を開く",
            "es" => "Abrir Hostbeam",
            "de" => "Hostbeam öffnen",
            "zh" => "打开 Hostbeam",
            "pt" => "Abrir o Hostbeam",
            "ko" => "Hostbeam 열기",
            _ => "Open Hostbeam",
        },
        "tray.prefs" => match locale {
            "fr" => "Préférences…",
            "ja" => "環境設定…",
            "es" => "Preferencias…",
            "de" => "Einstellungen…",
            "zh" => "偏好设置…",
            "pt" => "Preferências…",
            "ko" => "환경설정…",
            _ => "Preferences…",
        },
        "dock.hide" => match locale {
            "fr" => "Masquer dans le Dock",
            "ja" => "Dock から隠す",
            "es" => "Ocultar del Dock",
            "de" => "Aus dem Dock ausblenden",
            "zh" => "从程序坞中隐藏",
            "pt" => "Ocultar do Dock",
            "ko" => "Dock에서 가리기",
            _ => "Hide from Dock",
        },
        "tray.restart" => match locale {
            "fr" => "Recommencer la configuration",
            "ja" => "オンボーディングをやり直す",
            "es" => "Reiniciar la introducción",
            "de" => "Onboarding neu starten",
            "zh" => "重新开始引导",
            "pt" => "Reiniciar a introdução",
            "ko" => "온보딩 다시 시작",
            _ => "Restart onboarding",
        },
        "tray.about" => match locale {
            "fr" => "À propos de Hostbeam",
            "ja" => "Hostbeam について",
            "es" => "Acerca de Hostbeam",
            "de" => "Über Hostbeam",
            "zh" => "关于 Hostbeam",
            "pt" => "Sobre o Hostbeam",
            "ko" => "Hostbeam 정보",
            _ => "About Hostbeam",
        },
        "tray.checkUpdates" => match locale {
            "fr" => "Rechercher des mises à jour…",
            "ja" => "アップデートを確認…",
            "es" => "Buscar actualizaciones…",
            "de" => "Nach Updates suchen…",
            "zh" => "检查更新…",
            "pt" => "Buscar atualizações…",
            "ko" => "업데이트 확인…",
            _ => "Check for updates…",
        },
        "tray.feedback" => match locale {
            "fr" => "Envoyer un avis…",
            "ja" => "フィードバックを送信…",
            "es" => "Enviar comentarios…",
            "de" => "Feedback senden…",
            "zh" => "发送反馈…",
            "pt" => "Enviar feedback…",
            "ko" => "피드백 보내기…",
            _ => "Send Feedback…",
        },
        "tray.quit" => match locale {
            "fr" => "Quitter Hostbeam",
            "ja" => "Hostbeam を終了",
            "es" => "Salir de Hostbeam",
            "de" => "Hostbeam beenden",
            "zh" => "退出 Hostbeam",
            "pt" => "Sair do Hostbeam",
            "ko" => "Hostbeam 종료",
            _ => "Quit Hostbeam",
        },
        "notif.beamed" => match locale {
            "fr" => "Capture envoyée",
            "ja" => "スクリーンショットを送信しました",
            "es" => "Captura enviada",
            "de" => "Screenshot gesendet",
            "zh" => "截图已发送",
            "pt" => "Captura enviada",
            "ko" => "스크린샷 전송됨",
            _ => "Screenshot beamed",
        },
        "diag.sshReachable" => match locale {
            "fr" => "SSH accessible",
            "ja" => "SSH 接続可能",
            "es" => "SSH accesible",
            "de" => "SSH erreichbar",
            "zh" => "SSH 可连接",
            "pt" => "SSH acessível",
            "ko" => "SSH 연결 가능",
            _ => "SSH reachable",
        },
        "diag.auth" => match locale {
            "fr" => "Authentification",
            "ja" => "認証",
            "es" => "Autenticación",
            "de" => "Authentifizierung",
            "zh" => "身份验证",
            "pt" => "Autenticação",
            "ko" => "인증",
            _ => "Authentication",
        },
        "diag.folderWritable" => match locale {
            "fr" => "Dossier distant accessible en écriture",
            "ja" => "リモートフォルダは書き込み可能",
            "es" => "Carpeta remota con permiso de escritura",
            "de" => "Remote-Ordner beschreibbar",
            "zh" => "远程文件夹可写",
            "pt" => "Pasta remota com permissão de escrita",
            "ko" => "원격 폴더 쓰기 가능",
            _ => "Remote folder writable",
        },
        "diag.latency" => match locale {
            "fr" => "Latence aller-retour",
            "ja" => "往復遅延",
            "es" => "Latencia de ida y vuelta",
            "de" => "Round-Trip-Latenz",
            "zh" => "往返延迟",
            "pt" => "Latência de ida e volta",
            "ko" => "왕복 지연 시간",
            _ => "Round-trip latency",
        },
        "diag.skipped" => match locale {
            "fr" => "Ignoré",
            "ja" => "スキップ",
            "es" => "Omitido",
            "de" => "Übersprungen",
            "zh" => "已跳过",
            "pt" => "Ignorado",
            "ko" => "건너뜀",
            _ => "Skipped",
        },
        "diag.keyAccepted" => match locale {
            "fr" => "clé acceptée",
            "ja" => "鍵を受け入れました",
            "es" => "clave aceptada",
            "de" => "Schlüssel akzeptiert",
            "zh" => "密钥已接受",
            "pt" => "chave aceita",
            "ko" => "키 수락됨",
            _ => "key accepted",
        },
        "diag.connectionFailed" => match locale {
            "fr" => "Échec de la connexion",
            "ja" => "接続に失敗しました",
            "es" => "Error de conexión",
            "de" => "Verbindung fehlgeschlagen",
            "zh" => "连接失败",
            "pt" => "Falha na conexão",
            "ko" => "연결 실패",
            _ => "Connection failed",
        },
        "diag.unsupportedAlias" => match locale {
            "fr" => "Alias d’hôte non pris en charge",
            "ja" => "サポートされていないホストエイリアス",
            "es" => "Alias de host no admitido",
            "de" => "Nicht unterstützter Host-Alias",
            "zh" => "不支持的主机别名",
            "pt" => "Alias de host não suportado",
            "ko" => "지원되지 않는 호스트 별칭",
            _ => "Unsupported host alias",
        },
        _ => key,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_known_keys() {
        assert_eq!(t("fr", "tray.quit"), "Quitter Hostbeam");
        assert_eq!(t("ja", "notif.beamed"), "スクリーンショットを送信しました");
        assert_eq!(t("de", "diag.auth"), "Authentifizierung");
        assert_eq!(t("en", "tray.feedback"), "Send Feedback…");
        assert_eq!(t("ko", "tray.feedback"), "피드백 보내기…");
        assert_eq!(t("en", "tray.beam"), "Beam screenshot");
        assert_eq!(t("zh", "tray.beam"), "发送截图");
        assert_eq!(t("de", "tray.switchHost"), "Host wechseln");
        assert_eq!(t("ja", "tray.manageHosts"), "ホストを管理…");
        assert_eq!(t("pt", "tray.showAll"), "Ver tudo…");
        assert_eq!(t("fr", "tray.about"), "À propos de Hostbeam");
        assert_eq!(t("zh", "tray.checkUpdates"), "检查更新…");
        assert_eq!(t("en", "dock.hide"), "Hide from Dock");
        assert_eq!(t("fr", "dock.hide"), "Masquer dans le Dock");
    }

    #[test]
    fn falls_back_to_english_then_key() {
        // Unknown locale → English.
        assert_eq!(t("zz", "tray.open"), "Open Hostbeam");
        // Unknown key → the key itself.
        assert_eq!(t("fr", "no.such.key"), "no.such.key");
    }

    #[test]
    fn pins_supported_only() {
        assert_eq!(pin("de"), "de");
        assert_eq!(pin("zz"), "en");
    }
}
