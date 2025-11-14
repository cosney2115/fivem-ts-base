import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from "fs";
import { join } from "path";

const distDir = "./dist";
const srcDir = "./src";

if (existsSync(distDir)) rmSync(distDir, { recursive: true });

mkdirSync(distDir, { recursive: true });

function getFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (file.endsWith(".ts")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

async function build() {
  const categories = ["client", "server", "shared"];
  const buildPromises: Promise<any>[] = [];

  for (const category of categories) {
    const categoryDir = join(srcDir, category);

    if (!existsSync(categoryDir)) continue;

    const files = getFiles(categoryDir);

    if (files.length === 0) continue;

    const buildPromise = Bun.build({
      entrypoints: files,
      outdir: distDir,
      target: "browser",
      format: "iife",
      minify: false,
      sourcemap: "none",
      naming: "[dir]/[name].[ext]",
    }).then(async (result) => {
      if (!result.success)
        return console.error(`Failed to build ${category}:`, result.logs);

      const codes = await Promise.all(
        result.outputs.map((output) => output.text())
      );
      const mergedCode = codes.join("\n\n");

      await Bun.write(join(distDir, `${category}.js`), mergedCode);

      console.log(`${category}.js built successfully`);

      return result;
    });

    buildPromises.push(buildPromise);
  }

  await Promise.all(buildPromises);

  console.log("\nBuild complete!");
  console.log(`Output directory: ${distDir}/`);
}

build().catch(console.error);
