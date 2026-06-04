# assets-lens (snap-assets-map)

Zero-config asset mapping tool that watches your files and generates strictly typed autocomplete paths for your frontend applications.

This repository provides a small TypeScript CLI that scans one or more asset directories (for example `public/`) and generates a TypeScript file that contains a nested, readonly object of asset paths. The generated file can be imported in your frontend app for safe, autocompleted access to asset URLs.

## Project layout

- `index.ts` — exports the public functions from the CLI/generator.
- `src/cli.ts` — CLI entrypoint built with `cac`. Parses options, validates directories, triggers generation and optionally watches for changes using `chokidar`.
- `src/generator.ts` — Core logic that scans directories and writes the TypeScript output.
- `src/generated/assets.ts` — Example of the generated output (do not edit manually).
- `package.json` — scripts and dependency declarations.

## How it works (high-level)

1. The CLI (`src/cli.ts`) accepts input directories (`--input`) and an output file path (`--output`). It resolves the paths and filters out any non-existent directories.
2. `generateAssetTypes(inputDirs, outputFile)` in `src/generator.ts` is called:
   - For each input directory it runs `scanDirectory(dir)`.
   - `scanDirectory` walks the directory tree recursively and builds a nested object where keys are "friendly" camel-cased names and values are relative paths like `/icons/add-square.svg`.
   - Files that start with a dot or match a small set of banned filenames are skipped.
   - If two files in the same directory would map to the same key (for example `icon.png` and `icon.svg`), the generator appends a CamelCased file extension to the key to avoid collisions (e.g. `iconPng`, `iconSvg`).
   - The combined object for all input directories is stringified and written to the output file as a `const` export. The file includes an exported `AssetPaths` type which is `typeof Assets`, enabling strict TypeScript typing.
3. The CLI prints a short status message and, when started with `--watch`, will re-run the generation whenever files are added, removed, or changed.

## Example output

The generated `src/generated/assets.ts` looks like this (shortened):

```ts
// Generated automatically by snap-assets-map. Do not edit manually.

export const Assets = {
  public: {
    icons: {
      addSquare: "/icons/add-square.svg",
      batteryCharge: "/icons/battery-charge.svg",
      bolt: "/icons/bolt.svg",
    }
  }
} as const;

export type AssetPaths = typeof Assets;
```

Because the object is exported `as const` and `AssetPaths` is derived from it, your editor will provide autocompletion for asset keys and TypeScript will catch typos at compile time.

## CLI usage

Install and run (locally):

```bash
# build first
npm run build

# run the CLI once
npx snap-assets --input ./public --output ./src/generated/assets.ts

# watch mode
npx snap-assets --input ./public --output ./src/generated/assets.ts --watch
```

Or use the npm script provided in `package.json` to watch (if the package is installed globally as a bin):

```bash
npm run assets:watch
```

CLI options (from `src/cli.ts`):
- `--input, -i`  : Input directories (accepts multiple). Default: `./public`.
- `--output, -o` : Output TypeScript file path. Default: `./src/generated/assets.ts`.
- `--watch, -w`  : If present, watch input directories and regenerate on changes.

## Internals (for beginners)

- Key normalization: filenames and folder names are converted to camelCase with `toCamelCase`. Leading digits in names are prefixed with an underscore so the generated object keys are valid identifiers.
- Directory scanning: `scanDirectory` uses `fs.readdirSync` and `fs.statSync` to discover files and folders synchronously. It returns a nested plain object where leaf values are the URL paths relative to the input folder.
- Collision avoidance: when two files would produce the same key name (same base filename but different extensions), the generator appends the extension (camel-cased) to the key.
- File writing: `generateAssetTypes` stringifies the combined object and writes a TypeScript file with `as const` casting so TypeScript preserves literal types.

## How to use in your app

Import the generated file and use the `Assets` object to get strict, autocompleted paths:

```ts
import { Assets } from "./generated/assets";

const iconPath = Assets.public.icons.addSquare; // "/icons/add-square.svg"
```

Because `Assets` is typed, `Assets.public.icons.nonexistent` will be a TypeScript error in your editor.

## Recommendations and caveats

- Keep input directories simple (e.g. `public/`). The generator uses relative file paths starting with `/`.
- Large directories: the generator is synchronous and may be slow on enormous trees. If you need high performance, consider a streaming or async approach.
- Filename collisions: the generator attempts sensible automatic renaming to avoid collisions, but you should avoid using the same base name with multiple extensions in the same folder if you want predictable keys.
- Generated file is overwritten on each run. Do not edit `src/generated/assets.ts` manually.

## Contributing

- Build: `npm run build` (TypeScript compilation)
- Tests: none included (manual validation by running the CLI)

If you'd like, I can also add a short example app that imports `Assets` or add a minimal test harness to validate scanning behavior.
