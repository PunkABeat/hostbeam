// The Mac end of the Ctrl+V spike (next.md § 10a). Findings: README.md.
//
// Spike-grade on purpose. The app would do this in Rust, through
// `clipboard::source()` (pitfalls.md: a Finder copy carries its icon as a TIFF,
// so "is there an image" alone says yes to a copied PDF).
//
// Requests, one line each; answers are "OK <n>\n" + n bytes, or "NO\n":
//   TARGETS        -> newline-separated MIME types ("TARGETS\nimage/png\n")
//   GET image/png  -> the clipboard as PNG
//
// Modes:
//   --relay -- ssh …   run ssh (whose remote command is `hostbeam-clip serve`)
//                      and answer each "REQ <request>" line it prints, on its
//                      stdin. Needs nothing from sshd but running a command.
//   (none)             answer one request from stdin on stdout — the
//                      forwarded-socket variant, run by socat per connection
//   --set FILE         put FILE (a PNG) on the pasteboard and exit (tests)
//   --pasteboard NAME  use a named pasteboard, so tests never touch the
//                      owner's clipboard

import AppKit

let allArgs = CommandLine.arguments
let split = allArgs.firstIndex(of: "--") ?? allArgs.endIndex
let args = Array(allArgs[..<split])
let childArgs = split < allArgs.endIndex ? Array(allArgs[(split + 1)...]) : []

func option(_ name: String) -> String? {
    guard let i = args.firstIndex(of: name), i + 1 < args.count else { return nil }
    return args[i + 1]
}

let pasteboard = option("--pasteboard").map { NSPasteboard(name: NSPasteboard.Name($0)) } ?? .general

func log(_ line: String) {
    let stamp = ISO8601DateFormatter().string(from: Date())
    FileHandle.standardError.write(Data("[mac \(stamp)] \(line)\n".utf8))
}

if let file = option("--set") {
    guard let data = FileManager.default.contents(atPath: file) else { log("cannot read \(file)"); exit(1) }
    pasteboard.clearContents()
    pasteboard.setData(data, forType: .png)
    exit(0)
}

// nspasteboard.org's markers: password managers put these on what they copy.
let neverSent: [NSPasteboard.PasteboardType] = [
    .init("org.nspasteboard.ConcealedType"),
    .init("org.nspasteboard.TransientType"),
]
let imageExtensions: Set<String> = ["png", "jpg", "jpeg", "gif", "heic", "tif", "tiff", "webp", "bmp"]

func pngData(_ data: Data) -> Data? {
    NSBitmapImageRep(data: data)?.representation(using: .png, properties: [:])
}

func clipboardPNG() -> Data? {
    let types = pasteboard.types ?? []
    if types.contains(where: neverSent.contains) {
        log("refused: the clipboard item is marked concealed or transient")
        return nil
    }
    if let png = pasteboard.data(forType: .png) { return png }
    // A copied file: the file itself if it is a picture, never its icon.
    if types.contains(.fileURL) {
        guard let string = pasteboard.string(forType: .fileURL), let url = URL(string: string),
              imageExtensions.contains(url.pathExtension.lowercased()),
              let data = try? Data(contentsOf: url) else { return nil }
        return pngData(data)
    }
    if let tiff = pasteboard.data(forType: .tiff) { return pngData(tiff) }
    return nil
}

/// The answer to one request, framed; nil body is "NO".
func answer(_ request: String) -> Data {
    let body: Data?
    switch request {
    case "TARGETS":
        body = clipboardPNG() == nil ? nil : Data("TARGETS\nimage/png\n".utf8)
        log("TARGETS -> \(body == nil ? "nothing" : "image/png")")
    case "GET image/png":
        body = clipboardPNG()
        log("GET image/png -> \(body.map { "\($0.count) bytes" } ?? "nothing")")
    default:
        body = nil
        log("refused request \(request.debugDescription)")
    }
    guard let body else { return Data("NO\n".utf8) }
    return Data("OK \(body.count)\n".utf8) + body
}

if !args.contains("--relay") {
    let request = (readLine(strippingNewline: true) ?? "").trimmingCharacters(in: .whitespaces)
    FileHandle.standardOutput.write(answer(request))
    exit(0)
}

// Relay: ssh's stdout carries requests from the host, its stdin our answers.
guard !childArgs.isEmpty else { log("--relay needs -- ssh …"); exit(2) }
let ssh = Process()
ssh.executableURL = URL(fileURLWithPath: "/usr/bin/env")
ssh.arguments = childArgs
let toHost = Pipe(), fromHost = Pipe()
ssh.standardInput = toHost
ssh.standardOutput = fromHost
try ssh.run()

var childPID = ssh.processIdentifier
for sig in [SIGTERM, SIGINT, SIGHUP] {
    signal(sig) { _ in kill(childPID, SIGTERM); exit(0) }
}

let input = fromHost.fileHandleForReading.fileDescriptor
var buffer = [UInt8]()
func nextLine() -> String? {
    while true {
        if let nl = buffer.firstIndex(of: 10) {
            let line = String(decoding: buffer[..<nl], as: UTF8.self)
            buffer.removeSubrange(...nl)
            return line
        }
        var chunk = [UInt8](repeating: 0, count: 4096)
        let n = read(input, &chunk, chunk.count)
        if n <= 0 { return nil }
        buffer.append(contentsOf: chunk[..<n])
    }
}

while let line = nextLine() {
    if line == "READY" {
        log("host is listening: Ctrl+V there now reads this clipboard")
    } else if line.hasPrefix("REQ ") {
        toHost.fileHandleForWriting.write(answer(String(line.dropFirst(4))))
    } else {
        log("host said \(line.debugDescription)")
    }
}
ssh.waitUntilExit()
log("connection closed (ssh exit \(ssh.terminationStatus))")
exit(ssh.terminationStatus)
