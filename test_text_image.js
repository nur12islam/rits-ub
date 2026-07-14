const { generate } = require('text-to-image');
const fs = require('fs');

async function test() {
    const dataUri = await generate("Test text", { maxWidth: 800 });
    const base64Data = dataUri.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync('test.png', base64Data, 'base64');
    console.log("Done");
}
test();
