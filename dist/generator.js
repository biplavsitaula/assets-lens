"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanDirectory = scanDirectory;
exports.generateAssetTypes = generateAssetTypes;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BANNED_FILES = [".ds_store", "thumbs.db", "desktop.ini"];
function toCamelCase(str) {
    let cleaned = str
        .replace(/[-_.\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
        .replace(/^(.)/, (c) => c.toLowerCase());
    if (/^\d/.test(cleaned)) {
        cleaned = `_${cleaned}`;
    }
    return cleaned;
}
function scanDirectory(dirPath, baseDir = dirPath) {
    const result = {};
    if (!fs_1.default.existsSync(dirPath))
        return result;
    const files = fs_1.default.readdirSync(dirPath);
    for (const file of files) {
        if (BANNED_FILES.includes(file.toLowerCase()) || file.startsWith("."))
            continue;
        const fullPath = path_1.default.join(dirPath, file);
        const stat = fs_1.default.statSync(fullPath);
        if (stat.isDirectory()) {
            const folderKey = toCamelCase(file);
            const subFolderContent = scanDirectory(fullPath, baseDir);
            if (Object.keys(subFolderContent).length > 0) {
                result[folderKey] = subFolderContent;
            }
        }
        else {
            const fileExt = path_1.default.extname(file);
            const fileNameWithoutExt = path_1.default.basename(file, fileExt);
            const fileKey = toCamelCase(fileNameWithoutExt);
            const relativePath = "/" + path_1.default.relative(baseDir, fullPath).replace(/\\/g, "/");
            // Collision Handling
            if (result[fileKey]) {
                const cleanExt = toCamelCase(fileExt.replace(".", ""));
                const safeExtensionKey = `${fileKey}${cleanExt.charAt(0).toUpperCase() + cleanExt.slice(1)}`;
                result[safeExtensionKey] = relativePath;
            }
            else {
                result[fileKey] = relativePath;
            }
        }
    }
    return result;
}
//  To this:
function generateAssetTypes(inputDirs, outputFile) {
    const combinedMap = {};
    // Loop through each directory in the array
    for (const dir of inputDirs) {
        if (!fs_1.default.existsSync(dir))
            continue;
        const folderName = toCamelCase(path_1.default.basename(dir));
        const scannedContent = scanDirectory(dir, dir); // Passes singular string to scanDirectory
        if (Object.keys(scannedContent).length > 0) {
            combinedMap[folderName] = scannedContent;
        }
    }
    const objectString = JSON.stringify(combinedMap, null, 2);
    const fileContent = `// Generated automatically by snap-assets-map. Do not edit manually.

export const Assets = ${objectString} as const;

export type AssetPaths = typeof Assets;
`;
    const outputDir = path_1.default.dirname(outputFile);
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    fs_1.default.writeFileSync(outputFile, fileContent, "utf-8");
}
