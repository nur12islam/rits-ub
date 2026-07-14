const { generate } = require('text-to-image');
const fs = require('fs');

async function test() {
    let longText = "This is a long text.\n".repeat(50);
    const dataUri = await generate(longText, { maxWidth: 800 });
    const base64Data = dataUri.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync('test_long.png', base64Data, 'base64');
    console.log("Done long text");
}
test();
