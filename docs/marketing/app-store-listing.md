# App Store listing — Hostbeam (iOS)

Source of truth for the App Store Connect metadata. English is the master;
the 7 translations follow the same fields once the English is approved
(decision: listing localized ×8 at submission, matching the app).

Voice rules: the site's plain, calm register. No em dashes on public
marketing surfaces. No prices in the description, and no licence or purchase
copy at all: the iPhone app is free, with no in-app purchase, and the licence
is Mac-only (ADR 0028 §4, 2026-09-27). No third-party app or platform names in
metadata (App Review 2.3.7 and Apple's keyword rules), so "wherever your
agent runs" rather than naming terminals.

## Name (30 max)

Hostbeam

## Subtitle (30 max)

Screenshots to your SSH server

## Promotional text (170 max, editable without review)

Take a screenshot, share it to Hostbeam, and its path is on your clipboard,
ready to paste to the agent in your terminal. Your SSH, your server, no
cloud between.

## Description (4000 max)

Share a screenshot to Hostbeam and it lands on your own server over SSH,
with its remote path already on your clipboard, ready to paste to the agent
in your terminal.

A bug on the page you just loaded. A design in another app. A whiteboard.
A screenshot of anything, on the server your agent is already working in.

HOW IT WORKS

1. Take a screenshot.
2. Share it to Hostbeam from the share sheet.
3. Done. The image is on your host and its path is on your clipboard.
Paste it to your agent, wherever it runs, and the agent gets the picture
itself.

No buttons to press while beaming. The share extension sends, copies, and
gets out of the way.

PRIVATE BY DESIGN

Your phone connects directly to your server over SSH. Hostbeam has no
account system, no cloud relay, and no telemetry. Your screenshot is never
routed through or stored by any Hostbeam service.

Host keys are verified and pinned. If your server's key changes, Hostbeam
refuses to send until you re-trust it.

AT HOME IN YOUR STACK

- Beams to the machines developers actually use: a Linux box, a Mac, a
  VPS, a homelab server. Hostbeam authenticates with its own key, which
  you authorize once during setup.
- Pairs with the Hostbeam app for Mac, which does the same for Mac
  screenshots.
- A Shortcuts action beams your latest screenshot without opening the app.

WHAT YOU NEED

A server you can sign in to over SSH (setup shows you the one command
that authorizes Hostbeam's key), and something to paste into. That's it.

## Keywords (100 BYTES max, comma-separated)

ssh,sftp,upload,server,terminal,remote,devops,developer,coding,agent,cli,clipboard,image,photo

(Bytes, not characters, per Apple's metadata reference. Localized keywords
may use multiple UTF-8 bytes per character; verify each translated value
separately. "screenshot" is omitted: the subtitle already carries it and
Apple indexes name+subtitle.)

## URLs

- Support URL: https://hostbeam.app
- Marketing URL: https://hostbeam.app
- Privacy Policy URL: https://hostbeam.app/privacy

## App Store Connect fields (decided 2026-09-04)

Everything the form asks for beyond the copy above, so nothing is guessed on
submission day. Change here first, then in App Store Connect.

| Field | Value |
|---|---|
| Primary category | Developer Tools |
| Secondary category | Utilities |
| Age rating | 4+ — every questionnaire item "None" / "No", including the social-media questions Apple added in 2025 (no user-generated content, no messaging, no profiles, no social features); no unrestricted web access, no gambling |
| Copyright | 2026 PunkABeat |
| Content rights | Does not contain, show, or access third-party content |
| Sign-in information | "No sign-in required" — the app has no accounts |
| App Review contact | Name and email: the owner, support@hostbeam.app. **Phone: fill in on the day** — Apple does call about SSH apps |
| Notes for review | [`app-review-notes.md`](app-review-notes.md), printed with the host filled in by `scripts/reviewhost-deploy.sh notes` |
| Attachment | `docs/marketing/video/app-review-demo.mp4` |
| Pricing | Free. No in-app purchase (ADR 0028 §4) |
| Availability | All territories except France (export compliance, see the checklist § Deliberately excluded) |
| Mac availability | **Opt out** — the iOS app must not be offered on Apple Silicon Macs beside the real Mac app |
| Version release | Manually release this version after approval, so the site and the Mac updater can be aligned the same hour |
| Export compliance | Declared in the binary (`ITSAppUsesNonExemptEncryption = false`); answer "No" to the France question |

### In-app purchase: `app.hostbeam.ios.license`

**Not created or submitted (ADR 0028 §4, 2026-09-27).** The iPhone app is
free with no in-app purchase. The fields below are kept for a paid layer that
may come later; they are not current, since the licence is now Mac-only
("3 devices, Mac included" and "removes the daily beam limit" are both untrue).
Rewrite them before any reuse.

| Field | Value |
|---|---|
| Reference name | Hostbeam License |
| Type | Non-consumable |
| Price | USD 29 (Apple price point 29.00; let the other storefronts follow the equalised price) |
| Review screenshot | `docs/marketing/screenshots/iap-review.png` (captured 2026-09-04; how to redo it is in the checklist) |
| Review notes | "Removes the daily beam limit. Also unlocked by a licence key bought for the Mac app — see the app's review notes." |
| Availability | All territories the app is in |

Display name (30 max) and description (45 max), per locale. Lengths checked.

| Locale | Display name | Description |
|---|---|---|
| en-US | Hostbeam License | Lifetime license. 3 devices, Mac included. |
| de-DE | Hostbeam-Lizenz | Lebenslange Lizenz. 3 Geräte, Mac inklusive. |
| es-ES | Licencia de Hostbeam | Licencia de por vida. 3 dispositivos con Mac. |
| fr-FR | Licence Hostbeam | Licence à vie. 3 appareils, Mac compris. |
| ja | Hostbeam ライセンス | 永続ライセンス。Mac を含む 3 台まで。 |
| ko | Hostbeam 라이선스 | 평생 라이선스. Mac 포함 3대. |
| pt-BR | Licença do Hostbeam | Licença vitalícia. 3 dispositivos, com Mac. |
| zh-Hans | Hostbeam 许可证 | 终身许可证。3 台设备，含 Mac。 |

## What's New

Not available for an app's first version (Apple metadata reference); the
field first appears with the first update, and its notes must describe
that update's actual fixes and improvements — write them when the update
exists.

## Notes

- App name on the store shows the seller below it; conversion to the
  organization account must land first so it reads as the company, not a
  personal name.
- Screenshots and review notes are tracked separately, in
  [docs/process/ios-submission-checklist.md](../process/ios-submission-checklist.md).

## Localizations

Generated with the English master; every field verified against the ASC
limits (subtitle chars, promo chars, keyword BYTES, description chars).
Name is "Hostbeam" and URLs are identical in every locale.

### de-DE

Subtitle (30/30): Screenshots auf den SSH-Server

Promotional text (162/170):

Screenshot aufnehmen, an Hostbeam teilen: Der Pfad liegt in der Zwischenablage, bereit für den Agenten im Terminal. Dein SSH, dein Server, keine Cloud dazwischen.

Keywords (98/100 bytes):

ssh,sftp,upload,server,terminal,remote,devops,entwickler,coding,agent,cli,zwischenablage,bild,foto

Description (1731/4000):

Teile einen Screenshot an Hostbeam, und er landet über SSH auf deinem eigenen Server, mit seinem Remote-Pfad schon in deiner Zwischenablage, bereit zum Einfügen beim Agenten in deinem Terminal.

Ein Bug auf der Seite, die du gerade geladen hast. Ein Design in einer anderen App. Ein Whiteboard. Ein Screenshot von irgendetwas, auf dem Server, auf dem dein Agent schon arbeitet.

SO FUNKTIONIERT ES

1. Mach einen Screenshot.
2. Teile ihn über das Share-Sheet an Hostbeam.
3. Fertig. Das Bild liegt auf deinem Server und sein Pfad in deiner Zwischenablage. Füge ihn bei deinem Agenten ein, wo auch immer er läuft, und er bekommt das Bild selbst.

Keine Knöpfe während des Beamens. Die Share-Extension sendet, kopiert und geht aus dem Weg.

PRIVAT VON GRUND AUF

Dein iPhone verbindet sich direkt über SSH mit deinem Server. Hostbeam hat kein Kontosystem, kein Cloud-Relay und keine Telemetrie. Dein Screenshot wird niemals über einen Hostbeam-Dienst geleitet oder dort gespeichert.

Host-Keys werden geprüft und gepinnt. Ändert sich der Key deines Servers, sendet Hostbeam nicht, bis du ihm neu vertraust.

ZU HAUSE IN DEINEM STACK

- Beamt auf die Maschinen, die Entwickler wirklich benutzen: eine Linux-Box, einen Mac, einen VPS, einen Homelab-Server. Hostbeam authentifiziert sich mit einem eigenen Key, den du einmal beim Einrichten autorisierst.
- Passt zur Hostbeam-App für den Mac, die dasselbe für Mac-Screenshots tut.
- Eine Kurzbefehle-Aktion beamt deinen neuesten Screenshot, ohne die App zu öffnen.

WAS DU BRAUCHST

Einen Server, auf dem du dich per SSH anmelden kannst (das Setup zeigt dir den einen Befehl, der Hostbeams Key autorisiert), und etwas zum Einfügen. Das ist alles.

### es-ES

Subtitle (26/30): Capturas a tu servidor SSH

Promotional text (159/170):

Haz una captura, compártela con Hostbeam y su ruta queda en el portapapeles, lista para pegar al agente en tu terminal. Tu SSH, tu servidor, sin nube en medio.

Keywords (96/100 bytes):

ssh,sftp,subir,servidor,terminal,remoto,devops,desarrollador,agente,cli,portapapeles,imagen,foto

Description (1619/4000):

Comparte una captura con Hostbeam y aterriza en tu propio servidor por SSH, con su ruta remota ya en el portapapeles, lista para pegar al agente en tu terminal.

Un bug en la página que acabas de cargar. Un diseño en otra app. Una pizarra. Una captura de lo que sea, en el servidor en el que tu agente ya está trabajando.

CÓMO FUNCIONA

1. Haz una captura de pantalla.
2. Compártela con Hostbeam desde la hoja de compartir.
3. Listo. La imagen está en tu servidor y su ruta, en tu portapapeles. Pégala a tu agente, dondequiera que corra, y recibirá la propia imagen.

Sin botones mientras se beamea. La extensión envía, copia y se aparta.

PRIVADO POR DISEÑO

Tu teléfono se conecta directamente a tu servidor por SSH. Hostbeam no tiene sistema de cuentas, ni relay en la nube, ni telemetría. Tu captura nunca pasa por un servicio de Hostbeam ni se guarda en él.

Las claves del host se verifican y se fijan. Si la clave de tu servidor cambia, Hostbeam se niega a enviar hasta que vuelvas a confiar en ella.

EN CASA EN TU STACK

- Beamea a las máquinas que los desarrolladores usan de verdad: una caja Linux, un Mac, un VPS, un servidor de homelab. Hostbeam se autentica con su propia clave, que autorizas una vez durante la configuración.
- Se complementa con la app de Hostbeam para Mac, que hace lo mismo con las capturas del Mac.
- Una acción de Atajos beamea tu última captura sin abrir la app.

LO QUE NECESITAS

Un servidor al que puedas entrar por SSH (la configuración te muestra el comando que autoriza la clave de Hostbeam) y un sitio donde pegar. Eso es todo.

### fr-FR

Subtitle (25/30): Captures vers serveur SSH

Promotional text (169/170):

Prenez une capture, partagez-la vers Hostbeam : son chemin est dans le presse-papiers, prêt à coller à l'agent dans votre terminal. Votre SSH, votre serveur, sans cloud.

Keywords (96/100 bytes):

ssh,sftp,envoi,serveur,terminal,distant,devops,développeur,agent,cli,presse-papiers,image,photo

Description (1699/4000):

Partagez une capture vers Hostbeam : elle arrive sur votre propre serveur via SSH, son chemin distant déjà dans votre presse-papiers, prêt à coller à l'agent dans votre terminal.

Un bug sur la page que vous venez d'ouvrir. Un design dans une autre app. Un tableau blanc. Une capture de n'importe quoi, sur le serveur où votre agent travaille déjà.

COMMENT ÇA MARCHE

1. Prenez une capture d'écran.
2. Partagez-la vers Hostbeam depuis la feuille de partage.
3. C'est fait. L'image est sur votre serveur et son chemin dans votre presse-papiers. Collez-le à votre agent, où qu'il tourne : il reçoit l'image elle-même.

Aucun bouton pendant le beam. L'extension de partage envoie, copie, puis s'efface.

PRIVÉ PAR CONCEPTION

Votre téléphone se connecte directement à votre serveur via SSH. Hostbeam n'a ni système de compte, ni relais cloud, ni télémétrie. Votre capture n'est jamais routée par un service Hostbeam ni stockée chez lui.

Les clés d'hôte sont vérifiées et épinglées. Si la clé de votre serveur change, Hostbeam refuse d'envoyer tant que vous ne l'avez pas approuvée à nouveau.

CHEZ VOUS DANS VOTRE STACK

- Beame vers les machines que les développeurs utilisent vraiment : une box Linux, un Mac, un VPS, un serveur homelab. Hostbeam s'authentifie avec sa propre clé, que vous autorisez une fois lors de la configuration.
- S'accorde avec l'app Hostbeam pour Mac, qui fait de même pour les captures Mac.
- Une action Raccourcis beame votre dernière capture sans ouvrir l'app.

CE QU'IL VOUS FAUT

Un serveur accessible en SSH (la configuration vous montre la commande qui autorise la clé de Hostbeam), et quelque part où coller. C'est tout.

### ja

Subtitle (18/30): スクリーンショットをSSHサーバーへ

Promotional text (95/170):

スクリーンショットを撮って、Hostbeamに共有。パスがクリップボードに入り、ターミナルのエージェントにそのまま貼り付けられます。あなたのSSH、あなたのサーバー。クラウドは介在しません。

Keywords (90/100 bytes):

ssh,sftp,サーバー,ターミナル,リモート,開発,エージェント,画像,写真

Description (838/4000):

スクリーンショットをHostbeamに共有すると、SSH経由であなた自身のサーバーに届き、リモートパスはすでにクリップボードに入っています。ターミナルのエージェントにそのまま貼り付けてください。

いま開いたページのバグ。別のアプリのデザイン。ホワイトボード。何のスクリーンショットでも、エージェントがすでに作業しているサーバーへ。

仕組み

1. スクリーンショットを撮る。
2. 共有シートからHostbeamに共有する。
3. 完了。画像はサーバーに届き、そのパスがクリップボードに入ります。エージェントがどこで動いていても、貼り付ければ画像そのものが渡ります。

送信中に押すボタンはありません。共有拡張は送って、コピーして、すぐに消えます。

プライバシー第一の設計

iPhoneはSSHであなたのサーバーに直接つながります。Hostbeamにはアカウントも、中継クラウドも、テレメトリーもありません。スクリーンショットがHostbeamのサービスを経由したり、そこに保存されたりすることは決してありません。

ホストキーは検証・固定されます。サーバーのキーが変わると、再承認するまでHostbeamは送信を拒否します。

あなたのスタックに馴染む

- 開発者が実際に使うマシンに送れます。Linuxボックス、Mac、VPS、自宅サーバー。Hostbeamは専用のキーで認証し、セットアップ時に一度だけ承認します。
- Mac版Hostbeamと組み合わせれば、Macのスクリーンショットも同じように。
- ショートカットのアクションで、アプリを開かずに最新のスクリーンショットを送信。

必要なもの

SSHでサインインできるサーバー(セットアップがHostbeamのキーを承認するコマンドを表示します)と、貼り付ける先。それだけです。

### ko

Subtitle (13/30): 스크린샷을 SSH 서버로

Promotional text (98/170):

스크린샷을 찍어 Hostbeam에 공유하면 경로가 클립보드에 복사되어 터미널의 에이전트에 바로 붙여넣을 수 있습니다. 당신의 SSH, 당신의 서버, 중간에 클라우드는 없습니다.

Keywords (83/100 bytes):

ssh,sftp,업로드,서버,터미널,원격,개발,에이전트,이미지,사진,cli

Description (825/4000):

스크린샷을 Hostbeam에 공유하면 SSH로 당신의 서버에 도착하고, 원격 경로는 이미 클립보드에 들어가 터미널의 에이전트에 바로 붙여넣을 수 있습니다.

방금 열어본 페이지의 버그. 다른 앱의 디자인. 화이트보드. 무엇이든 스크린샷으로, 에이전트가 이미 작업하고 있는 서버에.

작동 방식

1. 스크린샷을 찍습니다.
2. 공유 시트에서 Hostbeam에 공유합니다.
3. 끝. 이미지는 서버에 도착하고 그 경로가 클립보드에 들어갑니다. 에이전트가 어디서 실행되든 붙여넣으면 이미지 자체가 전달됩니다.

전송 중 누를 버튼은 없습니다. 공유 확장은 보내고, 복사하고, 사라집니다.

설계부터 프라이버시

휴대폰이 SSH로 서버에 직접 연결됩니다. Hostbeam에는 계정 시스템도, 클라우드 중계도, 텔레메트리도 없습니다. 스크린샷이 Hostbeam의 서비스를 거치거나 저장되는 일은 없습니다.

호스트 키는 검증되고 고정됩니다. 서버의 키가 바뀌면 다시 신뢰할 때까지 전송을 거부합니다.

당신의 스택에 어울립니다

- 개발자가 실제로 쓰는 머신으로 보냅니다. 리눅스 박스, Mac, VPS, 홈랩 서버. Hostbeam은 전용 키로 인증하며, 설정할 때 한 번만 승인합니다.
- Mac용 Hostbeam 앱과 함께 쓰면 Mac 스크린샷도 똑같이.
- 단축어 액션으로 앱을 열지 않고 최신 스크린샷을 전송합니다.

필요한 것

SSH로 로그인할 수 있는 서버(설정에서 Hostbeam의 키를 승인하는 명령어 하나를 보여줍니다), 그리고 붙여넣을 곳. 그게 전부입니다.

### pt-BR

Subtitle (30/30): Capturas para seu servidor SSH

Promotional text (169/170):

Tire uma captura, compartilhe com o Hostbeam: o caminho fica na área de transferência, pronto para colar no agente do terminal. Seu SSH, seu servidor, sem nuvem no meio.

Keywords (84/100 bytes):

ssh,sftp,enviar,servidor,terminal,remoto,devops,desenvolvedor,agente,cli,imagem,foto

Description (1639/4000):

Compartilhe uma captura com o Hostbeam e ela chega ao seu próprio servidor via SSH, com o caminho remoto já na área de transferência, pronto para colar no agente do seu terminal.

Um bug na página que você acabou de abrir. Um design em outro app. Um quadro branco. Uma captura de qualquer coisa, no servidor em que seu agente já está trabalhando.

COMO FUNCIONA

1. Tire uma captura de tela.
2. Compartilhe com o Hostbeam pela folha de compartilhamento.
3. Pronto. A imagem está no seu servidor e o caminho dela, na sua área de transferência. Cole no seu agente, onde quer que ele rode, e ele recebe a própria imagem.

Nenhum botão durante o beam. A extensão envia, copia e sai do caminho.

PRIVADO POR DESIGN

Seu celular conecta direto ao seu servidor via SSH. O Hostbeam não tem sistema de contas, nem relay na nuvem, nem telemetria. Sua captura nunca passa por um serviço do Hostbeam nem fica guardada nele.

As chaves do host são verificadas e fixadas. Se a chave do seu servidor mudar, o Hostbeam se recusa a enviar até você confiar nela de novo.

EM CASA NO SEU STACK

- Beameia para as máquinas que desenvolvedores realmente usam: uma caixa Linux, um Mac, um VPS, um servidor de homelab. O Hostbeam se autentica com a própria chave, que você autoriza uma vez na configuração.
- Combina com o app do Hostbeam para Mac, que faz o mesmo com capturas do Mac.
- Uma ação dos Atalhos beameia sua captura mais recente sem abrir o app.

O QUE VOCÊ PRECISA

Um servidor em que você consiga entrar por SSH (a configuração mostra o comando que autoriza a chave do Hostbeam) e um lugar para colar. Só isso.

### zh-Hans

Subtitle (14/30): 截图直达你的 SSH 服务器

Promotional text (61/170):

截图后分享到 Hostbeam，文件路径立即复制到剪贴板，直接粘贴给终端里的智能体。你的 SSH，你的服务器，中间没有云。

Keywords (84/100 bytes):

ssh,sftp,上传,服务器,终端,远程,开发,智能体,剪贴板,图片,照片,cli

Description (642/4000):

把截图分享给 Hostbeam，它就通过 SSH 到了你自己的服务器上，远程路径已经在剪贴板里，可以直接粘贴给终端里的智能体。

刚打开的页面上的一个 bug。另一个应用里的设计。一块白板。任何截图，都能送到你的智能体正在工作的那台服务器上。

工作方式

1. 截一张图。
2. 在共享面板中分享给 Hostbeam。
3. 完成。图片已在你的服务器上，它的路径在你的剪贴板里。无论智能体在哪里运行，粘贴给它，它拿到的就是图片本身。

发送过程中没有任何按钮。共享扩展发送、复制，然后退场。

隐私优先的设计

手机通过 SSH 直接连接你的服务器。Hostbeam 没有账户系统、没有云中转、没有遥测。你的截图绝不会经过或存储在任何 Hostbeam 服务上。

主机密钥经过验证并固定。如果服务器的密钥变了，Hostbeam 会拒绝发送，直到你重新信任它。

融入你的技术栈

- 发送到开发者真正在用的机器：Linux 机器、Mac、VPS、家用服务器。Hostbeam 用自己的密钥认证，只需在设置时授权一次。
- 与 Mac 版 Hostbeam 搭配，Mac 截图同样处理。
- 一个快捷指令操作，无需打开应用即可发送最新截图。

你需要什么

一台能用 SSH 登录的服务器（设置会展示授权 Hostbeam 密钥的那条命令），以及一个可以粘贴的地方。仅此而已。
