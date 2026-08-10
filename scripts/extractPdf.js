const fs = require('fs');
;(async () => {
  try {
    const pdfModule = await import('pdf-parse/node');
    const pdfFunc = pdfModule.default || pdfModule;
    const dataBuffer = fs.readFileSync(process.argv[2] || 'c:/Users/FALCON COMPUTERS/Downloads/stichmatch.pdf');
    const data = await pdfFunc(dataBuffer, { version: 'v2' });
    fs.writeFileSync('scripts/stichmatch.txt', data.text);
    console.log('Extracted text written to scripts/stichmatch.txt');
  } catch (err) {
    console.error('PDF parse error:', err);
    process.exit(1);
  }
})();
