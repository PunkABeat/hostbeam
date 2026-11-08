import SwiftUI

/// Settings → About → Open source licenses. The MIT and Apache-2.0 packages
/// the app is built on require their copyright notice and licence text to
/// ship with the binary; this is where they ship. The list is
/// ThirdPartyNotices.json, written by scripts/third-party-notices.mjs from
/// BeamEngine's Package.resolved — never edited by hand, and checked for
/// staleness at release. Package and licence names are shown verbatim:
/// neither localises.
struct OpenSourceLicensesView: View {
    private let notices = ThirdPartyNotices.load()

    var body: some View {
        List {
            Section {
                Text(
                    "Hostbeam for iPhone is built with these open-source packages. Tap one for its notice and license."
                )
                .font(.footnote).foregroundStyle(.secondary)
            }
            Section("Packages") {
                ForEach(notices.packages) { pkg in
                    NavigationLink {
                        PackageNoticeView(package: pkg, notices: notices)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(verbatim: pkg.name)
                            Text(verbatim: "\(pkg.version) · \(pkg.licenses.joined(separator: " and "))")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            Section("Licenses") {
                ForEach(notices.licenseIDs, id: \.self) { id in
                    NavigationLink {
                        LicenseTextView(id: id, text: notices.licenses[id] ?? "")
                    } label: {
                        Text(verbatim: id)
                    }
                }
            }
        }
        .navigationTitle("Open source licenses")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct PackageNoticeView: View {
    let package: ThirdPartyNotices.Package
    let notices: ThirdPartyNotices

    var body: some View {
        List {
            Section {
                LabeledContent("Version", value: package.version)
                LabeledContent("License", value: package.licenses.joined(separator: " and "))
                if let url = URL(string: package.url) {
                    Link(destination: url) {
                        HStack {
                            Text(verbatim: package.url).lineLimit(1).truncationMode(.middle)
                            Spacer()
                            Image(systemName: "arrow.up.forward").font(.caption).foregroundStyle(.tertiary)
                        }
                    }
                    .foregroundStyle(.primary)
                }
            }
            if !package.copyright.isEmpty {
                Section("Copyright") {
                    ForEach(package.copyright, id: \.self) { line in
                        Text(verbatim: line).font(.footnote)
                    }
                }
            }
            if let notice = package.notice {
                Section("Notice") {
                    Text(verbatim: notice).font(.caption.monospaced()).textSelection(.enabled)
                }
            }
            ForEach(package.licenses, id: \.self) { id in
                Section(id) {
                    Text(verbatim: notices.licenses[id] ?? "")
                        .font(.caption.monospaced()).textSelection(.enabled)
                }
            }
        }
        .navigationTitle(package.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct LicenseTextView: View {
    let id: String
    let text: String

    var body: some View {
        ScrollView {
            Text(verbatim: text)
                .font(.caption.monospaced()).textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
        }
        .navigationTitle(id)
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// The generated file's shape. `licenses` holds each licence text once, keyed
/// by SPDX id; packages point into it.
struct ThirdPartyNotices: Decodable {
    struct Package: Decodable, Identifiable {
        let name: String
        let version: String
        let licenses: [String]
        let url: String
        let copyright: [String]
        let notice: String?
        var id: String { "\(name)@\(version)" }
    }

    let packages: [Package]
    let licenses: [String: String]

    var licenseIDs: [String] { licenses.keys.sorted() }

    static func load() -> ThirdPartyNotices {
        // The file is generated and committed; a missing or malformed one is a
        // build mistake, not a runtime condition, so an empty list is the
        // honest fallback rather than a crash in Settings.
        guard let url = Bundle.main.url(forResource: "ThirdPartyNotices", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let decoded = try? JSONDecoder().decode(ThirdPartyNotices.self, from: data)
        else {
            return ThirdPartyNotices(packages: [], licenses: [:])
        }
        return decoded
    }
}
