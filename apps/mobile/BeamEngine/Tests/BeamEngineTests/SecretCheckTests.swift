import XCTest

@testable import BeamEngine

/// The share sheet asks before sending anything that looks like a secret — the
/// Mac's `looks_secret` cases, so both apps hold the same files.
final class SecretCheckTests: XCTestCase {
    private func secret(_ name: String, _ head: String = "") -> Bool {
        SecretCheck.looksSecret(names: [name], head: Data(head.utf8))
    }

    func testSecretsAreKnownByTheirNames() {
        for name in [
            ".env", ".env.production", ".ENV.local", "prod.env", "id_rsa", "id_ed25519", "ID_ECDSA",
            "id_ed25519_sk", "credentials", "credentials.json", "Credentials.csv", ".netrc",
            ".git-credentials", ".npmrc", ".pypirc", ".pgpass", "server.pem", "SERVER.PEM",
            "cert.p12", "store.pfx", "release.jks", "debug.keystore", "putty.ppk", "vault.kdbx",
            "tls.key",
        ] {
            XCTAssertTrue(secret(name), name)
        }
        for name in [
            "id_rsa.pub", "id_ed25519.pub", ".env.example", ".env.sample", ".env.template",
            ".env.dist", "report.pdf", "notes.pem.md", "environment.txt", "credentials-guide",
            "screenshot.png", "Makefile",
        ] {
            XCTAssertFalse(secret(name), name)
        }
    }

    func testAPrivateKeyIsKnownByItsFirstLineWhateverItIsCalled() {
        for head in [
            "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXk",
            "-----BEGIN RSA PRIVATE KEY-----\nMIIE",
            "-----BEGIN EC PRIVATE KEY-----\n",
            "-----BEGIN PRIVATE KEY-----\n",
            "-----BEGIN ENCRYPTED PRIVATE KEY-----\n",
            "-----BEGIN PGP PRIVATE KEY BLOCK-----\n",
            "# deploy key\n\n-----BEGIN OPENSSH PRIVATE KEY-----\n",
        ] {
            XCTAssertTrue(secret("server.txt", head), head)
        }
        for head in [
            "-----BEGIN CERTIFICATE-----\nMIID",
            "-----BEGIN PUBLIC KEY-----\n",
            "ssh-ed25519 AAAAC3Nza user@host",
            "a private key is -----BEGIN something----- else PRIVATE KEY later",
            "",
        ] {
            XCTAssertFalse(secret("server.txt", head), head)
        }
    }

    func testAKeynoteDeckIsNotAKey() {
        let zip = Data([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00])
        XCTAssertFalse(SecretCheck.looksSecret(names: ["Q3 review.key"], head: zip))
        XCTAssertTrue(secret("tls.key", "MIIEvQIBADAN"))
    }

    func testTheHeadIsTheFirstFourKilobytes() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("head-\(UUID()).bin")
        try Data(count: 10_000).write(to: url)
        defer { try? FileManager.default.removeItem(at: url) }
        XCTAssertEqual(SecretCheck.head(of: url)?.count, SecretCheck.headBytes)
        XCTAssertNil(SecretCheck.head(of: url.appendingPathExtension("missing")))
    }
}
