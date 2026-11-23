// Video helper based on AVFoundation (no ffmpeg needed).
//
//   swift tools/video.swift info   <in>
//   swift tools/video.swift export <in> <out.mp4> <start s> <duration s> <width> <kbps> [height]
//   swift tools/video.swift poster <in> <out.jpg> <time s> <width>
//
// export: H.264, audio removed, scaled to <width> keeping aspect ratio.
import Foundation
import AVFoundation
import AppKit

let a = CommandLine.arguments
func fail(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }
guard a.count >= 3 else { fail("usage: info|export|poster ...") }
let asset = AVURLAsset(url: URL(fileURLWithPath: a[2]))
guard let track = asset.tracks(withMediaType: .video).first else { fail("no video track") }
let nat = track.naturalSize.applying(track.preferredTransform)
let srcW = abs(nat.width), srcH = abs(nat.height)

switch a[1] {
case "info":
    print(String(format: "%.1fs %dx%d %.0ffps %.0fkbps", asset.duration.seconds, Int(srcW), Int(srcH), track.nominalFrameRate, track.estimatedDataRate / 1000))

case "poster":
    let gen = AVAssetImageGenerator(asset: asset)
    gen.appliesPreferredTrackTransform = true
    gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
    let w = CGFloat(Double(a[5])!)
    gen.maximumSize = CGSize(width: w, height: w * srcH / srcW)
    let cg = try! gen.copyCGImage(at: CMTime(seconds: Double(a[4])!, preferredTimescale: 600), actualTime: nil)
    let rep = NSBitmapImageRep(cgImage: cg)
    try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.72])!.write(to: URL(fileURLWithPath: a[3]))
    print("poster ok")

case "export":
    let out = URL(fileURLWithPath: a[3]); try? FileManager.default.removeItem(at: out)
    let start = Double(a[4])!, dur = Double(a[5])!
    // optional 8th arg: output height -> center crop (aspect fill) to that frame
    var w = Double(a[6])!; var h = a.count > 8 ? Double(a[8])! : (w * Double(srcH) / Double(srcW)).rounded()
    if Int(h) % 2 == 1 { h += 1 }; if Int(w) % 2 == 1 { w += 1 }
    let reader = try! AVAssetReader(asset: asset)
    reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), duration: CMTime(seconds: dur, preferredTimescale: 600))
    let rOut = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    reader.add(rOut)
    let writer = try! AVAssetWriter(outputURL: out, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true
    let wIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: Int(w), AVVideoHeightKey: Int(h),
        AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: Int(a[7])! * 1000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalKey: 60,
        ],
    ])
    wIn.transform = track.preferredTransform
    writer.add(wIn)
    reader.startReading(); writer.startWriting()
    writer.startSession(atSourceTime: reader.timeRange.start)
    let q = DispatchQueue(label: "v"); let done = DispatchSemaphore(value: 0)
    wIn.requestMediaDataWhenReady(on: q) {
        while wIn.isReadyForMoreMediaData {
            if let s = rOut.copyNextSampleBuffer() { wIn.append(s) }
            else { wIn.markAsFinished(); writer.finishWriting { done.signal() }; return }
        }
    }
    done.wait()
    if writer.status != .completed { fail("export failed: \(String(describing: writer.error))") }
    let size = (try? FileManager.default.attributesOfItem(atPath: out.path)[.size] as? Int) ?? 0
    print("export ok \(Int(w))x\(Int(h)) \(size / 1024)KB")

case "sheet": // sheet <in> <out.jpg> <every s> — contact sheet, 4 columns, timestamps in file order
    let every = Double(a[4])!, cols = 4, tw: CGFloat = 320, th = tw * srcH / srcW
    let gen = AVAssetImageGenerator(asset: asset)
    gen.appliesPreferredTrackTransform = true
    gen.maximumSize = CGSize(width: tw, height: th)
    var times: [Double] = []; var t = 0.0
    while t < asset.duration.seconds { times.append(t); t += every }
    let rows = Int(ceil(Double(times.count) / Double(cols)))
    let img = NSImage(size: NSSize(width: tw * CGFloat(cols), height: (th + 18) * CGFloat(rows)))
    img.lockFocus()
    NSColor.black.setFill(); NSRect(origin: .zero, size: img.size).fill()
    for (i, s) in times.enumerated() {
        guard let cg = try? gen.copyCGImage(at: CMTime(seconds: s, preferredTimescale: 600), actualTime: nil) else { continue }
        let x = CGFloat(i % cols) * tw, y = img.size.height - CGFloat(i / cols + 1) * (th + 18)
        NSImage(cgImage: cg, size: NSSize(width: tw, height: th)).draw(in: NSRect(x: x, y: y, width: tw, height: th))
        (String(format: "%.0fs", s) as NSString).draw(at: NSPoint(x: x + 4, y: y + th + 2), withAttributes: [.foregroundColor: NSColor.white, .font: NSFont.systemFont(ofSize: 12)])
    }
    img.unlockFocus()
    let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
    try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.6])!.write(to: URL(fileURLWithPath: a[3]))
    print("sheet ok \(times.count) frames")

default: fail("unknown command")
}
