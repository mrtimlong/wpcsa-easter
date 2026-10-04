// Screenshots a page in WebKit at phone size (macOS only), e.g. to check a layout without a browser:
//   swift scripts/screenshot.swift http://localhost:5173/teams teams.png [width=390] [height=844] [js]
// The optional JavaScript runs just before the snapshot and its result is printed. Set SETUP_JS to run
// code before the page's own scripts, e.g. SETUP_JS="localStorage.setItem('favouriteTeams', '[\"x\"]')".
import AppKit
import WebKit

let args = CommandLine.arguments
let url = URL(string: args[1])!
let out = args[2]
let width = args.count > 3 ? Double(args[3])! : 390
let height = args.count > 4 ? Double(args[4])! : 844
/// Optional JavaScript to run before the snapshot; its result is printed.
let script = args.count > 5 ? args[5] : nil

final class Delegate: NSObject, WKNavigationDelegate {
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    // Give the app time to fetch /data/*.json and render.
    DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
      if let script {
        webView.evaluateJavaScript(script) { result, error in print("js:", result ?? "nil", error ?? "") }
      }
      let config = WKSnapshotConfiguration()
      webView.takeSnapshot(with: config) { image, error in
        guard let image, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:])
        else { print("snapshot failed: \(String(describing: error))"); exit(1) }
        try! png.write(to: URL(fileURLWithPath: out))
        print("wrote \(out)")
        exit(0)
      }
    }
  }
  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    print("failed: \(error)"); exit(1)
  }
  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    print("failed: \(error)"); exit(1)
  }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let config = WKWebViewConfiguration()
config.websiteDataStore = .nonPersistent()
// Off-screen windows don't advance CSS animations, so show their end state (like Playwright's
// `animations: 'disabled'`).
let noAnimations = WKUserScript(
  source: "const s = document.createElement('style'); s.textContent = '*, *::before, *::after { animation: none !important; transition: none !important }'; document.documentElement.appendChild(s)",
  injectionTime: .atDocumentEnd, forMainFrameOnly: true)
config.userContentController.addUserScript(noAnimations)
if let setup = ProcessInfo.processInfo.environment["SETUP_JS"] {
  config.userContentController.addUserScript(
    WKUserScript(source: setup, injectionTime: .atDocumentStart, forMainFrameOnly: true))
}
let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: height), configuration: config)
webView.customUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
let window = NSWindow(contentRect: webView.frame, styleMask: [.borderless], backing: .buffered, defer: false)
window.contentView = webView
let delegate = Delegate()
webView.navigationDelegate = delegate
webView.load(URLRequest(url: url))
DispatchQueue.main.asyncAfter(deadline: .now() + 30) { print("timed out"); exit(2) }
app.run()
