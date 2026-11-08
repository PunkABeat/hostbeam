import Foundation

/// Where the iPhone app's release notes live on the site, and the link to one
/// version's entry. The site builds the same page and anchors from CHANGELOG.md
/// (scripts/changelog-parse.mjs: `CHANGELOG_PATH`, `releaseAnchor`), so a version
/// here lands on its own notes; a build newer than the site, such as a TestFlight
/// one, simply opens at the top of the page.
public enum Changelog {
    public static let iPhone = URL(string: "https://hostbeam.app/changelog/iphone/")!

    /// The iPhone releases, at `version`'s entry when there is one.
    public static func iPhoneURL(version: String?) -> URL {
        guard let version, !version.isEmpty,
            let url = URL(string: "https://hostbeam.app/changelog/iphone/#iphone-\(version)")
        else { return iPhone }
        return url
    }
}
