import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
import * as t from "@babel/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..", "src");
const exts = new Set([".js", ".jsx", ".ts", ".tsx"]);

const parserPlugins = [
  "jsx",
  "typescript",
  "classProperties",
  "classPrivateProperties",
  "classPrivateMethods",
  "decorators-legacy",
  "dynamicImport",
  "optionalChaining",
  "nullishCoalescingOperator",
  "objectRestSpread",
  "topLevelAwait",
  "importMeta",
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (exts.has(path.extname(entry.name))) {
      processFile(full);
    }
  }
}

function processFile(file) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: parserPlugins,
    });
  } catch (e) {
    console.error(`Parse error in ${file}:`, e.message);
    return;
  }

  const traverse = traverseModule.default || traverseModule;

  traverse(ast, {
    CallExpression(path) {
      if (path.get("callee").matchesPattern("console.log")) {
        if (path.parentPath.isExpressionStatement()) {
          path.remove();
        } else {
          path.replaceWith(t.identifier("undefined"));
        }
      }
    },
  });

  const generate = generateModule.default || generateModule;
  const { code: out } = generate(ast, { comments: false });
  fs.writeFileSync(file, out, "utf8");
}

walk(root);
console.log("Strip complete");
