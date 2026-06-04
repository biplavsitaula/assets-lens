#!/usr/bin/env node
import { cac } from "cac";
import chokidar from "chokidar";
import path from "path";
import fs from "fs";
import { generateAssetTypes } from "./generator";

const cli = cac("snap-assets-map");

cli
  .option("-i, --input <dir...>", "Input assets directories", {
    default: ["./public"],
  })
  .option("-o, --output <file>", "Output TypeScript file path", {
    default: "./src/generated/assets.ts",
  })
  .option("-w, --watch", "Watch the input directories for changes", {
    default: false,
  });

const parsed = cli.parse();

const inputOptions = Array.isArray(parsed.options.input)
  ? parsed.options.input
  : [parsed.options.input];

const inputDirs = inputOptions.map((dir: string) =>
  path.resolve(process.cwd(), dir),
);
const outputFile = path.resolve(process.cwd(), parsed.options.output);
const shouldWatch = parsed.options.watch;

// 1. Filter out non-existent directories instead of crashing!
const validDirs = inputDirs.filter((dir) => {
  const exists = fs.existsSync(dir);
  if (!exists) {
    // Just a friendly warning so the developer knows it was skipped
    console.log(
      `⚠️  [snap-assets-map] Skipping path: "${path.basename(dir)}" (Directory does not exist).`,
    );
  }
  return exists;
});

// 2. Only crash if ABSOLUTELY ZERO directories match
if (validDirs.length === 0) {
  console.error(
    `❌ Error: None of the specified input directories exist. Please check your --input paths.`,
  );
  process.exit(1);
}

const runGeneration = () => {
  try {
    generateAssetTypes(validDirs, outputFile);
  } catch (err) {
    console.error("❌ Failed to generate assets:", err);
  }
};

// 3. Kick off the initial generation pass
console.log("📸 [snap-assets-map] Snapping asset map...");
runGeneration();
console.log(
  `✨ Asset map written to: ${path.relative(process.cwd(), outputFile)}`,
);

// 4. Watch only the paths that actually exist
if (shouldWatch) {
  console.log(`👀 Watching for asset changes...`);

  const watcher = chokidar.watch(validDirs, {
    persistent: true,
    ignoreInitial: true,
  });

  const triggerRebuild = (event: string, filePath: string) => {
    console.log(
      `🔄 Change detected [${event}]: ${path.basename(filePath)}. Resnapping...`,
    );
    runGeneration();
  };

  watcher
    .on("add", (p) => triggerRebuild("added", p))
    .on("unlink", (p) => triggerRebuild("removed", p))
    .on("change", (p) => triggerRebuild("changed", p));
}
