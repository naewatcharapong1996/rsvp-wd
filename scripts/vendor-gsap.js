// Copies the pre-built GSAP dist files from node_modules into js/vendor/
// so the deployed static site references local files instead of a CDN.
// Runs automatically on `npm install` (see package.json "postinstall").
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const vendorDir = path.join(root, "js", "vendor");

const files = [
  ["gsap/dist/gsap.min.js", "gsap.min.js"],
  ["gsap/dist/ScrollTrigger.min.js", "ScrollTrigger.min.js"],
];

fs.mkdirSync(vendorDir, { recursive: true });

for (const [src, dest] of files) {
  const from = path.join(root, "node_modules", src);
  const to = path.join(vendorDir, dest);
  fs.copyFileSync(from, to);
  console.log(`vendored ${src} -> js/vendor/${dest}`);
}
