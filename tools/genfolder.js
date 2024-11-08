const { mkdir } = require("node:fs/promises");
const { join } = require("node:path");

async function makeDirectory() {
    const distgen = join(process.cwd(), "dist", "generated");
    const distCreation = await mkdir(distgen, { recursive: true });

    const sourcegen = join(process.cwd(), "src", "generated");
    const srcCreation = await mkdir(sourcegen, { recursive: true });

    console.log(distCreation, srcCreation);
}

makeDirectory().catch(console.error);
