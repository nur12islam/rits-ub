const PDFDocument = require('pdfkit');
const fs = require('fs');
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test.pdf'));
doc.fontSize(12).text("Hello world", { align: 'left' });
doc.end();
console.log("PDF done");
