// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "BeamEngine",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "BeamEngine", targets: ["BeamEngine"])
    ],
    dependencies: [
        .package(url: "https://github.com/orlandos-nl/Citadel.git", from: "0.12.0")
    ],
    targets: [
        .target(
            name: "BeamEngine",
            dependencies: [.product(name: "Citadel", package: "Citadel")]
        ),
        .testTarget(name: "BeamEngineTests", dependencies: ["BeamEngine"]),
    ]
)
