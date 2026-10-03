import ts from 'typescript';

/**
 * The value-import graph of packages/core/src, which must stay acyclic (#92).
 *
 * An ES module cycle that carries values can read a binding before the module
 * defining it has run, and in core it also means a leaf module (`grammar.ts`)
 * has grown a dependency on the simulation that uses it. #32's first build
 * shipped four such cycles through every gate step.
 *
 * The source is PARSED, not grepped, so a comment or a string naming an
 * import is never read as one. A type-only declaration (`import type`,
 * `export type`, or one whose every specifier is `type X`) carries no value,
 * so it is no edge. An empty `import {} from './x'` is one: it binds nothing
 * but still loads the module, and `verbatimModuleSyntax` keeps it.
 */

/** One relative import or export declaration. */
export interface RelativeImport {
  /** The specifier as written: `'./sim'`. */
  readonly specifier: string;
  /** False for a type-only declaration, which carries no value and is no edge. */
  readonly value: boolean;
}

/** What one module names, read from its source. */
export interface ModuleScan {
  /** Every relative import and export declaration, in source order. */
  readonly imports: readonly RelativeImport[];
  /** Forms the reader cannot place in the graph, each named with its line. */
  readonly refused: readonly string[];
}

const CORE_PACKAGE = '@wordfarer/core';

/** `.` and `..` name a directory's index.ts, so they are relative too. */
const isRelative = (specifier: string): boolean =>
  specifier === '.' ||
  specifier === '..' ||
  specifier.startsWith('./') ||
  specifier.startsWith('../');

/** Does the declaration bind or load a value, or is it types only? */
function carriesValue(
  node: ts.ImportDeclaration | ts.ExportDeclaration,
): boolean {
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (clause === undefined) return true;
    if (clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return false;
    if (clause.name !== undefined) return true;
    const bindings = clause.namedBindings;
    if (bindings === undefined || ts.isNamespaceImport(bindings)) return true;
    return (
      bindings.elements.length === 0 ||
      bindings.elements.some((element) => !element.isTypeOnly)
    );
  }
  if (node.isTypeOnly) return false;
  const clause = node.exportClause;
  if (clause === undefined || ts.isNamespaceExport(clause)) return true;
  return (
    clause.elements.length === 0 ||
    clause.elements.some((element) => !element.isTypeOnly)
  );
}

export function scanModule(file: string, source: string): ModuleScan {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const imports: RelativeImport[] = [];
  const refused: string[] = [];
  const refuse = (node: ts.Node, problem: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    refused.push(`${file}:${String(line + 1)}: ${problem}`);
  };

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const specifier = node.moduleSpecifier.text;
      if (isRelative(specifier)) {
        imports.push({ specifier, value: carriesValue(node) });
      } else if (
        specifier === CORE_PACKAGE ||
        specifier.startsWith(`${CORE_PACKAGE}/`)
      ) {
        refuse(
          node,
          `'${specifier}' names core's own package, which loads index.ts behind the graph's back; import the module relatively`,
        );
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      refuse(
        node,
        'import = require() is CommonJS, which the graph does not read; import it statically',
      );
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        refuse(
          node,
          'dynamic import() names a module only when it runs, so the graph cannot hold it; import it statically',
        );
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require'
      ) {
        refuse(
          node,
          'require() is CommonJS, which the graph does not read; import it statically',
        );
      }
    }
    // A block body: forEachChild stops at the first callback that returns
    // something truthy, so the visitor must return nothing.
    ts.forEachChild(node, (child) => {
      visit(child);
    });
  };
  visit(sf);
  return { imports, refused };
}

/**
 * Relative specifiers in a module's RAW text, counted without the parser: a
 * `from` clause or a side-effect `import` naming `.`, `..` or a path under
 * either. The guard checks this against `scanModule`'s imports, so a reader
 * blind to one form of declaration goes red on the file holding it. A comment spelling out
 * such a clause counts too, which reddens the check rather than hiding a miss.
 */
export const rawRelativeImports = (source: string): number =>
  (source.match(/\b(?:from|import)\s*['"]\.\.?(?:\/|['"])/g) ?? []).length;
