const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

test('배포 화면: HtmlService가 URL 뒤 코드를 지우는 템플릿 문자열 방지', () => {
  execFileSync(process.execPath, ['scripts/build-apps-script.mjs'], { timeout: 30000 });
  for (const page of ['Index', 'Privacy']) {
    const html = fs.readFileSync(`apps-script/${page}.html`, 'utf8');
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 2);
    for (const [index, match] of scripts.entries()) {
      const source = match[1].replace('<?!= appUrlJson ?>', '"https://example.invalid/exec"');
      assert.doesNotThrow(() => new vm.Script(source), `${page} script ${index}`);
      const tree = ts.createSourceFile('bundle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      let templates = 0;
      function walk(node) {
        if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) templates++;
        ts.forEachChild(node, walk);
      }
      walk(tree);
      assert.equal(templates, 0, `${page} script ${index} must use ordinary quoted strings`);
    }
  }
});
