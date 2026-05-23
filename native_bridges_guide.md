# VaultScan — Native App Bridges Implementation Guide

To enable high-performance, 100% offline on-device scanning, VaultScan is pre-configured with direct native bridge hooks. When running inside a native iOS or Android WebView container, the React app will automatically route image bytes to the host operating system's native machine learning framework instead of the browser fallback.

---

## 🍎 1. iOS Native Bridge (Apple Vision Framework)

Perform character recognition and PII bounding box analysis on-device using Swift and Apple's hardware-accelerated **Vision** framework.

### Swift Implementation (inside your View Controller or WebView Coordinator)

```swift
import WebKit
import Vision

class WebViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad();
        
        let config = WKWebViewConfiguration();
        // Register the "scanDocument" script message handler
        config.userContentController.add(self, name: "scanDocument");
        
        webView = WKWebView(frame: self.view.bounds, configuration: config);
        self.view.addSubview(webView);
    }

    // Handle messages sent from React Web App
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "scanDocument",
              let base64String = message.body as? String else { return }
        
        // Convert base64 back to UIImage
        guard let imageData = Data(base64Encoded: base64String.components(separatedBy: ",").last ?? ""),
              let image = UIImage(data: imageData) else { return }
        
        // Execute Apple Vision OCR
        performOnDeviceOCR(on: image)
    }

    func performOnDeviceOCR(on image: UIImage) {
        guard let cgImage = image.cgImage else { return }
        
        let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        let request = VNRecognizeTextRequest { [weak self] request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation], error == nil else { return }
            
            var detectedRegions: [[String: Any]] = []
            
            for observation in observations {
                guard let candidate = observation.topCandidates(1).first else { continue }
                let text = candidate.string
                
                // Determine PII type via native Swift classifiers (NLP or Regex)
                let piiType = self?.classifyPIIType(text: text) ?? "Sensitive Data"
                
                // Normalizing Vision bounding box coordinates to our standard 0-1000 scale
                // Note: Vision coordinates have y-origin at bottom-left, React coordinates are top-left
                let rect = observation.boundingBox
                let x = Int(rect.origin.x * 1000)
                let y = Int((1.0 - rect.origin.y - rect.size.height) * 1000)
                let w = Int(rect.size.width * 1000)
                let h = Int(rect.size.height * 1000)
                
                let region: [String: Any] = [
                    "type": piiType,
                    "x": max(0, min(1000, x)),
                    "y": max(0, min(1000, y)),
                    "width": max(1, min(1000 - x, w)),
                    "height": max(1, min(1000 - y, h)),
                    "label": text
                ]
                detectedRegions.append(region)
            }
            
            // Dispatch coordinates back to WebView
            self?.sendScanResultsBackToWebView(regions: detectedRegions)
        }
        
        request.recognitionLevel = .accurate
        try? requestHandler.perform([request])
    }

    func classifyPIIType(text: String) -> String {
        // Simple Swift regex classifier
        if text.contains("@") { return "Email" }
        if text.range(of: "\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b", options: .regularExpression) != nil { return "Phone Numbers" }
        if text.range(of: "\\b\\d{3,5}\\b", options: .regularExpression) != nil { return "Address" }
        return "Sensitive Data"
    }

    func sendScanResultsBackToWebView(regions: [[String: Any]]) {
        let response: [String: Any] = ["regions": regions]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: response, options: []),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }
        
        DispatchQueue.main.async {
            self.webView.evaluateJavaScript("window.onNativeScanResult('\(jsonString)')", completionHandler: nil)
        }
    }
}
```

---

## 🤖 2. Android Native Bridge (Google ML Kit)

Perform character recognition and PII bounding box analysis on-device using Java/Kotlin and **Google ML Kit Text Recognition** APIs.

### Kotlin Implementation (inside your Activity or Fragment)

```kotlin
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import android.graphics.BitmapFactory
import android.graphics.Rect

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        
        // Bind the "AndroidInterface" bridge hook
        webView.addJavascriptInterface(AndroidBridge(), "AndroidInterface")
        webView.webViewClient = WebViewClient()
        
        setContentView(webView)
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun scanDocument(base64Image: String) {
            // Strip dataURL header if present
            val cleanBase64 = base64Image.substringAfter(",")
            val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeStream(ByteArrayInputStream(imageBytes))
            
            val imageWidth = bitmap.width
            val imageHeight = bitmap.height
            val inputImage = InputImage.fromBitmap(bitmap, 0)
            
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            recognizer.process(inputImage)
                .addOnSuccessListener { visionText ->
                    val regionsArray = JSONArray()
                    
                    for (block in visionText.textBlocks) {
                        for (line in block.lines) {
                            val text = line.text
                            val rect: Rect = line.boundingBox ?: continue
                            
                            val piiType = classifyPIIType(text)
                            
                            // Normalizing coordinates to standard 0-1000 scale
                            val x = (rect.left.toFloat() / imageWidth * 1000).toInt()
                            val y = (rect.top.toFloat() / imageHeight * 1000).toInt()
                            val w = (rect.width().toFloat() / imageWidth * 1000).toInt()
                            val h = (rect.height().toFloat() / imageHeight * 1000).toInt()
                            
                            val region = JSONObject().apply {
                                put("type", piiType)
                                put("x", Math.max(0, Math.min(1000, x)))
                                put("y", Math.max(0, Math.min(1000, y)))
                                put("width", Math.max(1, Math.min(1000 - x, w)))
                                put("height", Math.max(1, Math.min(1000 - y, h)))
                                put("label", text)
                            }
                            regionsArray.put(region)
                        }
                    }
                    
                    val response = JSONObject().put("regions", regionsArray)
                    sendScanResultsBackToWebView(response.toString())
                }
        }
        
        private fun classifyPIIType(text: String): String {
            if (text.contains("@")) return "Email"
            if (text.matches(Regex(".*\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b.*"))) return "Phone Numbers"
            return "Sensitive Data"
        }
        
        private fun sendScanResultsBackToWebView(jsonString: String) {
            runOnUiThread {
                webView.evaluateJavascript("window.onNativeScanResult('$jsonString')", null)
            }
        }
    }
}
```
