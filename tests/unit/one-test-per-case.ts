import ts from 'typescript';

/** A loop inside one test that asserts, or changes page state, on each pass. */
export interface LoopedCase {
  /** The test's title, as written in the source. */
  readonly test: string;
  /** The loop's header, whitespace collapsed: `for (const x of XS)`. */
  readonly loop: string;
  /** 1-based line of the loop, for a human to open. */
  readonly line: number;
}

/**
 * Playwright calls that change what the page is on each pass: a navigation,
 * new content, a new page or context, or a change of viewport or media.
 * Matched as a call's own name, bare or as a method.
 */
const PAGE_STATE = new Set([
  'goto',
  'reload',
  'setContent',
  'setViewportSize',
  'emulateMedia',
  'newPage',
  'newContext',
]);

/** The two loops allowed inside a test, each declared with its reason. */
const MARKERS = ['runtime population:', 'one scenario:'];

/** Array methods that run their function argument once per element. */
const ITERATING = new Set(['forEach', 'map', 'every', 'some']);

/** Run modifiers of `it`/`test`; `describe`, `step`, `use` and hooks are not tests. */
const TEST_MODIFIERS = new Set([
  'only',
  'skip',
  'fails',
  'concurrent',
  'fixme',
  'fail',
  'slow',
]);

/** Table forms, called with a table and then with the title: `it.each(XS)('t', fn)`. */
const TABLE_FORMS = new Set(['each', 'for']);

const isTestName = (node: ts.Expression): boolean =>
  ts.isIdentifier(node) && (node.text === 'it' || node.text === 'test');

const isTestCall = (call: ts.CallExpression): boolean => {
  const callee = call.expression;
  if (isTestName(callee)) return true;
  if (ts.isPropertyAccessExpression(callee))
    return (
      isTestName(callee.expression) && TEST_MODIFIERS.has(callee.name.text)
    );
  return (
    ts.isCallExpression(callee) &&
    ts.isPropertyAccessExpression(callee.expression) &&
    isTestName(callee.expression.expression) &&
    TABLE_FORMS.has(callee.expression.name.text)
  );
};

/**
 * A test's body: its first function argument. Not its last, since Vitest
 * takes a timeout or options after the body as well as before it.
 */
const callbackOf = (
  call: ts.CallExpression,
): ts.ArrowFunction | ts.FunctionExpression | null =>
  call.arguments.find(
    (arg): arg is ts.ArrowFunction | ts.FunctionExpression =>
      ts.isArrowFunction(arg) || ts.isFunctionExpression(arg),
  ) ?? null;

/** A title as written: a template keeps its `${…}`, so an entry naming it is stable. */
const titleOf = (sf: ts.SourceFile, call: ts.CallExpression): string => {
  const first = call.arguments[0];
  if (!first) return '';
  if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))
    return first.text;
  return first.getText(sf).replace(/^`|`$/g, '');
};

/** The identifier a call chain starts from: `expect` for `expect.soft(x).not.toBe(y)`. */
const chainRoot = (call: ts.CallExpression): string => {
  let at: ts.Expression = call.expression;
  while (ts.isPropertyAccessExpression(at) || ts.isCallExpression(at))
    at = at.expression;
  return ts.isIdentifier(at) ? at.text : '';
};

const ownName = (call: ts.CallExpression): string => {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  return ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
};

/** Whether `node` asserts, or changes page state, anywhere inside it. */
const actsPerPass = (node: ts.Node): boolean => {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (
      ts.isCallExpression(child) &&
      (chainRoot(child) === 'expect' || PAGE_STATE.has(ownName(child)))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
};

/** A line comment's own text: its two marker characters and outer space dropped. */
const lineCommentText = (sf: ts.SourceFile, range: ts.CommentRange): string =>
  range.kind === ts.SyntaxKind.SingleLineCommentTrivia
    ? sf.text.slice(range.pos + 2, range.end).trim()
    : '';

/**
 * The statement holding `node` (itself when it is one), never past the
 * function it sits in: in a one-line test, the statement above the loop is
 * the test call, and a marker there must not cover the loop inside it.
 */
const statementOf = (node: ts.Node): ts.Node => {
  for (let at: ts.Node = node; !ts.isSourceFile(at); at = at.parent) {
    if (ts.isStatement(at)) return at;
    if (ts.isFunctionLike(at)) break;
  }
  return node;
};

/** Whether a marker with a reason sits in a line comment directly above `node` or its statement. */
const declared = (sf: ts.SourceFile, node: ts.Node): boolean =>
  [node, statementOf(node)].some((at) =>
    (ts.getLeadingCommentRanges(sf.text, at.getFullStart()) ?? []).some(
      (range) => {
        const text = lineCommentText(sf, range);
        return MARKERS.some(
          (marker) =>
            text.startsWith(marker) && text.slice(marker.length).trim() !== '',
        );
      },
    ),
  );

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** A loop's header and the body run on each pass, or null for anything else. */
const loopParts = (
  sf: ts.SourceFile,
  node: ts.Node,
): { header: string; body: ts.Node } | null => {
  if (
    ts.isForOfStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForStatement(node) ||
    ts.isWhileStatement(node)
  )
    return {
      header: collapse(
        sf.text.slice(node.getStart(sf), node.statement.getStart(sf)),
      ),
      body: node.statement,
    };
  if (ts.isDoStatement(node))
    return {
      header: collapse(`do … while (${node.expression.getText(sf)})`),
      body: node.statement,
    };
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !ITERATING.has(node.expression.name.text)
  )
    return null;
  const callback = node.arguments[0];
  return callback &&
    (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
    ? {
        header: collapse(`${node.expression.getText(sf)}(…)`),
        body: callback,
      }
    : null;
};

/**
 * Every loop inside a test body that asserts, or changes page state, on each
 * pass, unless a marker declares it a runtime population or one scenario. A
 * loop OUTSIDE a test that generates one test per case is the shape this asks
 * for, so it is never reported.
 */
export function loopedCases(source: string, fileName: string): LoopedCase[] {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const cases: LoopedCase[] = [];
  const inTest = (title: string, node: ts.Node): void => {
    const loop = loopParts(sf, node);
    if (loop && actsPerPass(loop.body) && !declared(sf, node))
      cases.push({
        test: title,
        loop: loop.header,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      });
    ts.forEachChild(node, (child) => {
      inTest(title, child);
    });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isTestCall(node)) {
      const callback = callbackOf(node);
      if (callback) {
        inTest(titleOf(sf, node), callback.body);
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return cases;
}
