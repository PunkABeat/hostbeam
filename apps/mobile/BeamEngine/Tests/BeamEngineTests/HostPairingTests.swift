import Foundation
import XCTest

@testable import BeamEngine

final class HostPairingTests: XCTestCase {
    func testEncodeParseRoundTrip() {
        let host = BeamHost(
            alias: "prod-box", hostname: "10.4.0.12", port: 2222,
            username: "dev", remoteDir: "/srv/shots")
        let parsed = HostPairing.parse(HostPairing.encode(host))
        XCTAssertEqual(parsed?.alias, "prod-box")
        XCTAssertEqual(parsed?.hostname, "10.4.0.12")
        XCTAssertEqual(parsed?.port, 2222)
        XCTAssertEqual(parsed?.username, "dev")
        XCTAssertEqual(parsed?.remoteDir, "/srv/shots")
    }

    func testEncodeWritesTheLink() {
        let host = BeamHost(
            alias: "prod-box", hostname: "10.4.0.12", port: 22,
            username: "dev", remoteDir: "/tmp/hostbeam")
        XCTAssertEqual(
            HostPairing.encode(host),
            "https://hostbeam.app/add#v=1&name=prod-box&host=10.4.0.12&port=22"
                + "&user=dev&folder=%2Ftmp%2Fhostbeam")
    }

    /// The exact string the Mac's hostPairing.test.ts asserts for a host with
    /// a space and a non-ASCII letter in its name. Both sides pin it, so a
    /// change to either encoder fails a test instead of a scan.
    func testReadsWhatTheMacWrites() {
        let mac =
            "https://hostbeam.app/add#v=1&name=dev%20box%20%C3%A9&host=10.4.0.12"
            + "&port=2222&user=dev&folder=%2Fsrv%2Fshots"
        let host = HostPairing.parse(mac)
        XCTAssertEqual(host?.alias, "dev box é")
        XCTAssertEqual(host?.hostname, "10.4.0.12")
        XCTAssertEqual(host?.port, 2222)
        XCTAssertEqual(host?.username, "dev")
        XCTAssertEqual(host?.remoteDir, "/srv/shots")
    }

    func testLinkDefaultsAndRejects() {
        let host = HostPairing.parse("  https://hostbeam.app/add/#v=1&name=a&host=h&user=u\n")
        XCTAssertEqual(host?.port, 22, "no port means 22")
        XCTAssertEqual(host?.remoteDir, "/tmp/hostbeam", "no folder means the default")

        let good = "#v=1&name=a&host=h&user=u"
        XCTAssertNil(HostPairing.parse("http://hostbeam.app/add" + good), "not https")
        XCTAssertNil(HostPairing.parse("https://evil.example/add" + good), "another site")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app.evil.example/add" + good), "lookalike host")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app/buy" + good), "another page")
        XCTAssertNil(
            HostPairing.parse("https://hostbeam.app/add?v=1&name=a&host=h&user=u"),
            "details in the query would have been sent to the server")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app/add"), "no fragment")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app/add#v=2&name=a&host=h&user=u"), "future version")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app/add#v=1&name=&host=h&user=u"), "empty name")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app/add#v=1&name=a&host=h"), "no user")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app/add#v=1&name=a&host=h&user=u&port=0"), "port 0")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app/add#v=1&name=a&host=h&user=u&port=x"), "port not a number")
        XCTAssertNil(
            HostPairing.parse("https://hostbeam.app/add#v=1&name=%E0%A4&host=h&user=u"),
            "broken percent-encoding")
        XCTAssertNil(HostPairing.parse("https://hostbeam.app/add#v=1&name"), "field without a value")
        XCTAssertNil(HostPairing.parse("hostbeam://add" + good), "the app's own scheme is not a pairing link")
    }

    func testLegacyJSONStillReads() {
        // What every Mac up to 0.1.20 shows.
        let mac =
            "{\"alias\":\"prod-box\",\"folder\":\"/tmp/hostbeam\",\"hostname\":\"10.4.0.12\","
            + "\"kind\":\"hostbeam-host\",\"port\":22,\"user\":\"dev\",\"v\":1}"
        XCTAssertEqual(HostPairing.parse(mac)?.hostname, "10.4.0.12")
    }

    func testDefaultsAndRejects() {
        // Port + folder defaults
        let minimal = #"{"v":1,"kind":"hostbeam-host","alias":"a","hostname":"h","user":"u"}"#
        let host = HostPairing.parse(minimal)
        XCTAssertEqual(host?.port, 22)
        XCTAssertEqual(host?.remoteDir, "/tmp/hostbeam")

        XCTAssertNil(HostPairing.parse("not json"))
        XCTAssertNil(
            HostPairing.parse(#"{"v":2,"kind":"hostbeam-host","alias":"a","hostname":"h","user":"u"}"#), "wrong version"
        )
        XCTAssertNil(HostPairing.parse(#"{"v":1,"kind":"other","alias":"a","hostname":"h","user":"u"}"#), "wrong kind")
        XCTAssertNil(
            HostPairing.parse(#"{"v":1,"kind":"hostbeam-host","alias":"","hostname":"h","user":"u"}"#), "empty alias")
        XCTAssertNil(
            HostPairing.parse(#"{"v":1,"kind":"hostbeam-host","alias":"a","hostname":"h","user":"u","port":99999}"#),
            "bad port")
        XCTAssertFalse(
            HostPairing.encode(BeamHost(alias: "a", hostname: "h", username: "u"))
                .contains("key"), "payload must never carry key material")
    }

    func testVerifyEnsuresFolderAndCloses() async throws {
        let transport = FakeTransport()
        try await Beamer(transport: transport)
            .verify(host: BeamHost(alias: "dev", hostname: "example.invalid", username: "beam"))
        XCTAssertTrue(transport.directories.contains("/tmp/hostbeam"))
        XCTAssertTrue(transport.closed)
    }
}
