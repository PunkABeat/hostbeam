import AVFoundation
import SwiftUI
import UIKit

/// Minimal QR scanner for the hostbeam-host payload. Simulators have no
/// camera; a paste fallback keeps the flow testable everywhere (and helps
/// desktop-less users who received the payload as text).
struct QRScannerView: View {
    /// Answers whether the code was a Hostbeam pairing code. A "no" is said on
    /// screen: a camera pointed at any other QR code used to keep scanning in
    /// silence, which reads as broken.
    let onCode: (String) -> Bool
    @State private var rejected = false
    @Environment(\.dismiss) private var dismiss
    /// Asked before the session starts, and answered on screen when it is
    /// "no": a denied camera otherwise shows a black square with no way out,
    /// which reviewers test for (guideline 5.1.1) and users hit for real.
    @State private var camera = AVCaptureDevice.authorizationStatus(for: .video)

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                switch camera {
                case .authorized:
                    CameraPreview(onCode: handle)
                        .overlay {
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Brand.accent, lineWidth: 2)
                                .frame(width: 220, height: 220)
                        }
                case .notDetermined:
                    Color.black.overlay { ProgressView().tint(.white) }
                        .task {
                            let ok = await AVCaptureDevice.requestAccess(for: .video)
                            camera = ok ? .authorized : .denied
                        }
                default:
                    VStack(spacing: 12) {
                        Image(systemName: "camera.fill").font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("Camera access is off for Hostbeam.")
                            .font(.headline)
                        Text("Allow it in Settings to scan the code, or paste it instead.")
                            .font(.footnote).foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        Button {
                            if let url = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(url)
                            }
                        } label: {
                            Text("Open Settings")
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding(32)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                if rejected {
                    VStack(spacing: 4) {
                        Label(
                            "That's not a Hostbeam pairing code.",
                            systemImage: "exclamationmark.triangle.fill"
                        )
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(Brand.warning)
                        Text("Scan the code your Mac shows under Hosts → Share to iPhone.")
                            .font(.caption).foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal)
                    .padding(.top, 12)
                }
                Button {
                    handle(UIPasteboard.general.string ?? "")
                } label: {
                    Label("Paste instead", systemImage: "doc.on.clipboard")
                }
                .padding()
            }
            .navigationTitle("Scan from your Mac")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }
            }
        }
        .brandAppearance()
    }

    private func handle(_ code: String) {
        rejected = !onCode(code)
    }
}

private struct CameraPreview: UIViewRepresentable {
    let onCode: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onCode: onCode) }

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .black
        context.coordinator.start(in: view)
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.layer?.frame = uiView.bounds
    }

    /// Main-actor bound: it builds the preview layer into a UIKit view. The
    /// metadata delegate is delivered on the main queue (set below), which is
    /// how its callback may step onto the main actor.
    @MainActor
    final class Coordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
        let onCode: (String) -> Void
        let session = AVCaptureSession()
        var layer: AVCaptureVideoPreviewLayer?

        init(onCode: @escaping (String) -> Void) {
            self.onCode = onCode
        }

        func start(in view: UIView) {
            guard let device = AVCaptureDevice.default(for: .video),
                let input = try? AVCaptureDeviceInput(device: device),
                session.canAddInput(input)
            else { return }  // no camera (simulator) — paste fallback remains
            session.addInput(input)
            let output = AVCaptureMetadataOutput()
            guard session.canAddOutput(output) else { return }
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]
            let layer = AVCaptureVideoPreviewLayer(session: session)
            layer.videoGravity = .resizeAspectFill
            layer.frame = view.bounds
            view.layer.addSublayer(layer)
            self.layer = layer
            // Apple asks for startRunning off the main thread; it blocks.
            let running = Unchecked(session)
            DispatchQueue.global(qos: .userInitiated).async { running.value.startRunning() }
        }

        nonisolated func metadataOutput(
            _ output: AVCaptureMetadataOutput,
            didOutput objects: [AVMetadataObject],
            from connection: AVCaptureConnection
        ) {
            guard
                let qr = objects.compactMap({ $0 as? AVMetadataMachineReadableCodeObject })
                    .first(where: { $0.type == .qr }), let value = qr.stringValue
            else { return }
            MainActor.assumeIsolated { onCode(value) }
        }
    }
}

/// Hands an AVCaptureSession to the queue that starts it. Apple's guidance is
/// to call `startRunning`, which blocks, away from the main queue; the session
/// is built for that, but its type is not marked Sendable.
private struct Unchecked<Value>: @unchecked Sendable {
    let value: Value
    init(_ value: Value) { self.value = value }
}
