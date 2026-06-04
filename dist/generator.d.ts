interface AssetObject {
    [key: string]: string | AssetObject;
}
export declare function scanDirectory(dirPath: string, baseDir?: string): AssetObject;
export declare function generateAssetTypes(inputDirs: string[], outputFile: string): void;
export {};
