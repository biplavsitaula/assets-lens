#!/usr/bin/env node
import { cac } from "cac";
import chokidar from "chokidar";
import path from "path";
import fs from "fs";
import { generateAssetTypes } from "./generator";

const cli = cac("snap-assets-map");

cli
  .option("-i, --input <dir...>", "Input assets directories", {
    default: ["./public", "./src/assets"],
  })
  .option("-o, --output <file>", "Output TypeScript file path", {
    default: "./src/generated/assets.ts",
  })
  .option("-w, --watch", "Watch the input directories for changes", {
    default: false,
  });

const parsed = cli.parse();

// 1. Capture all raw input tokens from both the `--input` flags and trailing arguments
let rawTokens: string[] = [];

if (parsed.options.input) {
  if (Array.isArray(parsed.options.input)) {
    rawTokens = parsed.options.input.map(String);
  } else {
    rawTokens = String(parsed.options.input).split(",");
  }
}

// Incorporate any loose arguments passed by the shell (e.g., if PowerShell dropped a flag)
if (parsed.args && parsed.args.length > 0) {
  rawTokens.push(...parsed.args);
}

// 2. Clean, normalize, and deduce absolute paths safely
const resolvedPaths = rawTokens
  .map((token) => token.trim()) // Strip accidental padding spaces
  .filter(Boolean) // Remove empty elements
  .map((token) => {
    // Standardize leading directory slashes for cross-OS compatibility
    let cleanToken = token.replace(/\\/g, "/");
    if (cleanToken.startsWith("./")) {
      cleanToken = cleanToken.slice(2);
    } else if (cleanToken.startsWith("/")) {
      cleanToken = cleanToken.slice(1);
    }

    // Always calculate relative to your true execution root directory
    return path.normalize(path.join(process.cwd(), cleanToken));
  });

// 3. Remove duplicate paths (e.g., if a directory was captured twice by flags + arguments)
const uniqueDirs = Array.from(new Set(resolvedPaths));

const outputFile = path.resolve(process.cwd(), parsed.options.output);
const shouldWatch = parsed.options.watch;

// 4. Validate existence of directories with a transparent absolute logging helper
const validDirs = uniqueDirs.filter((dir) => {
  const exists = fs.existsSync(dir);
  if (!exists) {
    console.log(
      `⚠️  [snap-assets-map] Looked for folder at: "${dir}" but it does not exist.`,
    );
  }
  return exists;
});

// Only crash if ABSOLUTELY ZERO directories match
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
