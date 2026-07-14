async function test() {
    const pdfkit = await import('pdfkit');
    console.log(Object.keys(pdfkit));
}
test();
