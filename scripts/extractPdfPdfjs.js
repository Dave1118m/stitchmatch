const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function extract(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n\n';
  }
  return fullText;
}

(async () => {
  try {
    const file = process.argv[2] || 'c:/Users/FALCON COMPUTERS/Downloads/stichmatch.pdf';
    const text = await extract(file);
    fs.writeFileSync('scripts/stichmatch.txt', text, 'utf8');
    console.log('Extracted text written to scripts/stichmatch.txt');
  } catch (err) {
    console.error('PDF extraction error:', err);
    process.exit(1);
  }
})();
