async function test() {
    const pkg = await import('text-to-image');
    console.log(Object.keys(pkg));
}
test();
