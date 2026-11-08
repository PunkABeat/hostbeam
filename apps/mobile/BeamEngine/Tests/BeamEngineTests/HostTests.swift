import XCTest

@testable import BeamEngine

final class HostTests: XCTestCase {
    func testSSHCommandNamesThePortOnlyWhenItIsNot22() {
        let testhost = BeamHost(alias: "testhost", hostname: "172.30.1.29", port: 2222, username: "dev")
        XCTAssertEqual(testhost.sshCommand, "ssh -p 2222 dev@172.30.1.29")
        let plain = BeamHost(alias: "devbox", hostname: "devbox.example.com", username: "ubuntu")
        XCTAssertEqual(plain.sshCommand, "ssh ubuntu@devbox.example.com")
    }
}
