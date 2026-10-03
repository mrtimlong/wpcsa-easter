// Renders the PNG app icons from public/favicon.svg (macOS only).
// Usage: swift scripts/generate-icons.swift
import AppKit

let svgURL = URL(fileURLWithPath: "public/favicon.svg")
guard let svg = NSImage(contentsOf: svgURL) else { fatalError("Cannot load \(svgURL.path)") }

func render(size: Int, inset: CGFloat, background: NSColor?, to path: String) {
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  let full = NSRect(x: 0, y: 0, width: size, height: size)
  if let background {
    background.setFill()
    full.fill()
  }
  svg.draw(in: full.insetBy(dx: inset, dy: inset))
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
  print("wrote \(path)")
}

let brand = NSColor(red: 0x1a / 255, green: 0x2b / 255, blue: 0x9b / 255, alpha: 1)
render(size: 192, inset: 0, background: nil, to: "public/pwa-192x192.png")
render(size: 512, inset: 0, background: nil, to: "public/pwa-512x512.png")
// Maskable icons need content inside the central safe zone, on a full-bleed background.
render(size: 512, inset: 64, background: brand, to: "public/maskable-512x512.png")
render(size: 180, inset: 0, background: brand, to: "public/apple-touch-icon.png")
