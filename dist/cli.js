#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cac_1 = require("cac");
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const generator_1 = require("./generator");
const cli = (0, cac_1.cac)("snap-assets-map");
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
const inputDirs = inputOptions.map((dir) => path_1.default.resolve(process.cwd(), dir));
const outputFile = path_1.default.resolve(process.cwd(), parsed.options.output);
const shouldWatch = parsed.options.watch;
// 1. Filter out non-existent directories instead of crashing!
const validDirs = inputDirs.filter((dir) => {
    const exists = fs_1.default.existsSync(dir);
    if (!exists) {
        // Just a friendly warning so the developer knows it was skipped
        console.log(`⚠️  [snap-assets-map] Skipping path: "${path_1.default.basename(dir)}" (Directory does not exist).`);
    }
    return exists;
});
// 2. Only crash if ABSOLUTELY ZERO directories match
if (validDirs.length === 0) {
    console.error(`❌ Error: None of the specified input directories exist. Please check your --input paths.`);
    process.exit(1);
}
const runGeneration = () => {
    try {
        (0, generator_1.generateAssetTypes)(validDirs, outputFile);
    }
    catch (err) {
        console.error("❌ Failed to generate assets:", err);
    }
};
// 3. Kick off the initial generation pass
console.log("📸 [snap-assets-map] Snapping asset map...");
runGeneration();
console.log(`✨ Asset map written to: ${path_1.default.relative(process.cwd(), outputFile)}`);
// 4. Watch only the paths that actually exist
if (shouldWatch) {
    console.log(`👀 Watching for asset changes...`);
    const watcher = chokidar_1.default.watch(validDirs, {
        persistent: true,
        ignoreInitial: true,
    });
    const triggerRebuild = (event, filePath) => {
        console.log(`🔄 Change detected [${event}]: ${path_1.default.basename(filePath)}. Resnapping...`);
        runGeneration();
    };
    watcher
        .on("add", (p) => triggerRebuild("added", p))
        .on("unlink", (p) => triggerRebuild("removed", p))
        .on("change", (p) => triggerRebuild("changed", p));
}
