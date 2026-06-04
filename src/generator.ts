import fs from "fs";
import path from "path";

const BANNED_FILES = [".ds_store", "thumbs.db", "desktop.ini"];

function toCamelCase(str: string): string {
  let cleaned = str
    .replace(/[-_.\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (c) => c.toLowerCase());

  if (/^\d/.test(cleaned)) {
    cleaned = `_${cleaned}`;
  }
  return cleaned;
}

interface AssetObject {
  [key: string]: string | AssetObject;
}

export function scanDirectory(
  dirPath: string,
  baseDir: string = dirPath,
): AssetObject {
  const result: AssetObject = {};

  if (!fs.existsSync(dirPath)) return result;

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (BANNED_FILES.includes(file.toLowerCase()) || file.startsWith("."))
      continue;

    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const folderKey = toCamelCase(file);
      const subFolderContent = scanDirectory(fullPath, baseDir);

      if (Object.keys(subFolderContent).length > 0) {
        result[folderKey] = subFolderContent;
      }
    } else {
      const fileExt = path.extname(file);
      const fileNameWithoutExt = path.basename(file, fileExt);
      const fileKey = toCamelCase(fileNameWithoutExt);
      const relativePath =
        "/" + path.relative(baseDir, fullPath).replace(/\\/g, "/");

      // Collision Handling
      if (result[fileKey]) {
        const cleanExt = toCamelCase(fileExt.replace(".", ""));
        const safeExtensionKey = `${fileKey}${cleanExt.charAt(0).toUpperCase() + cleanExt.slice(1)}`;
        result[safeExtensionKey] = relativePath;
      } else {
        result[fileKey] = relativePath;
      }
    }
  }

  return result;
}

//  To this:
export function generateAssetTypes(inputDirs: string[], outputFile: string) {
  const combinedMap: Record<string, any> = {};

  // Loop through each directory in the array
  for (const dir of inputDirs) {
    console.log(dir);
    if (!fs.existsSync(dir)) continue;

    const folderName = toCamelCase(path.basename(dir));
    const scannedContent = scanDirectory(dir, dir); // Passes singular string to scanDirectory

    if (Object.keys(scannedContent).length > 0) {
      combinedMap[folderName] = scannedContent;
    }
  }

  const objectString = JSON.stringify(combinedMap, null, 2);

  const fileContent = `// Generated automatically by snap-assets assets-lens. Do not edit manually.

export const Assets = ${objectString} as const;

export type AssetPaths = typeof Assets;
`;

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, fileContent, "utf-8");
}
