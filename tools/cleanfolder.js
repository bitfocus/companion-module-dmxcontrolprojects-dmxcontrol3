const { rm } = require("node:fs/promises");
const { join } = require("node:path");

async function clearDirectory() {
    const distgen = join(process.cwd(), "dist");
    await rm(distgen, { recursive: true, force: true });

    const sourcegen = join(process.cwd(), "src", "generated");
    await rm(sourcegen, { recursive: true, force: true });
}

clearDirectory().catch(console.error);
