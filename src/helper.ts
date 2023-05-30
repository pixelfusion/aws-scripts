import * as path from "path";
import * as fs from "fs";

/**
 * Loads a file from disk and turns into json
 *
 * @param {String} dirname Base directory
 * @param {String} relativePath Path to the file
 */
export const loadJsonFile = (dirname: string, relativePath: string) => {
  const absolutePath = path.resolve(dirname, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File does not exist: ${ absolutePath }`);
  }

  const jsonData = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(jsonData);
};
