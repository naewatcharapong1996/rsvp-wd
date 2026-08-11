// Bundles the qrcode npm package's browser entry into a single IIFE file
// (global: QRCode) in js/vendor/. The npm package ships no prebuilt browser
// bundle, and a jsDelivr copy was observed being blocked by Chromium's ORB
// (Opaque Response Blocking) during testing — bundling locally removes that
// third-party runtime dependency entirely. Runs on `npm install` (postinstall).
const path = require("path");
const esbuild = require("esbuild");

const root = path.join(__dirname, "..");

esbuild.buildSync({
  entryPoints: [path.join(root, "node_modules", "qrcode", "lib", "browser.js")],
  bundle: true,
  minify: true,
  format: "iife",
  globalName: "QRCode",
  outfile: path.join(root, "js", "vendor", "qrcode.min.js"),
});

console.log("vendored qrcode/lib/browser.js -> js/vendor/qrcode.min.js");
