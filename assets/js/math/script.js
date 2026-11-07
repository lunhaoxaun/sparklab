/* 数学绘图器 · C++ 判断脚本解释器（SL.math.script）
   ---------------------------------------------------------------
   把一段「像 C++」的脚本跑成判定结果：
     词法 → 递归下降语法 → 树遍历求值

   支持的子集：
     类型 int / double / float / bool / string（可带初始化，逗号分隔多个）
     语句 块、if / else if / else、while、for(init; cond; step)、
          break、continue、空语句、表达式语句
     表达式 三目、&& ||（短路）、== !=、< > <= >=、+ -、* / %、
            一元 ! - +、前后缀 ++/--、成员访问与调用
     内置 sqrt/pow/sin/... 与 print/warn/pass/fail

   沙箱：脚本只能看到「作用域里的局部变量 + bridge 暴露的对象 + 内置表」，
   拿不到 window / document / eval；实现里也没有 eval / new Function。
   单条语句计入步数预算，单个循环单独计次，防止死循环把页面卡死。

   对外接口：
     SL.math.script.run(source, bridge, opts) -> {
       ok: boolean,
       logs: [{ level: 'print'|'warn'|'error', text }],
       results: [{ kind: 'pass'|'fail', text }],
       error: { message, line, col } | null
     }
     bridge = {
       resolve(name) -> 值 | undefined,     // 场景对象或常量
       isObjectName(name) -> boolean
     }
     对象值是代理：get(prop) / set(prop, value) / call(method, args)
     opts = { maxSteps: 50000, maxLoop: 10000 }

   依赖：无（不引用 geometry.js，场景访问一律走 bridge）。
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var SL = (window.SparkLab = window.SparkLab || {});
  SL.math = SL.math || {};

  var DEFAULT_MAX_STEPS = 50000;
  var DEFAULT_MAX_LOOP = 10000;
  var DEFAULT_EPS = 1e-9;
  var DEG = Math.PI / 180;

  var TYPE_NAMES = { int: 1, double: 1, float: 1, bool: 1, string: 1 };

  /* 语句位置出现这些词时给出「人话」提示，而不是干巴巴的语法错误 */
  var STMT_HINTS = {
    using: '不需要也不支持 using namespace std;（内置函数直接可用）',
    namespace: '不支持 namespace',
    return: '脚本没有自定义函数，不需要 return',
    do: '暂不支持 do-while，请改用 while',
    switch: '暂不支持 switch，请改用 if / else if',
    case: '暂不支持 switch-case，请改用 if / else if',
    default: '暂不支持 switch-case，请改用 if / else if',
    goto: '不支持 goto',
    class: '暂不支持类与结构体',
    struct: '暂不支持类与结构体',
    typedef: '不支持 typedef',
    const: '暂不支持 const 修饰，直接写 double 即可',
    static: '不支持 static',
    unsigned: '不支持 unsigned，请用 int',
    long: '不支持 long，请用 int 或 double',
    short: '不支持 short，请用 int',
    char: '暂不支持 char 字符类型，请用 string',
    void: '不支持 void；本引擎没有函数定义',
    auto: '不支持 auto，请写出类型',
    new: '不支持 new / 动态内存',
    delete: '不支持 delete',
    public: '暂不支持类',
    private: '暂不支持类',
    protected: '暂不支持类',
    cin: '暂不支持 cin，输入请用参数或对象属性',
    cout: '暂不支持 cout，输出请用 print(x)',
    endl: '不支持 endl，换行请写 "\\n"',
    std: '不支持 std:: 前缀，内置函数不带命名空间',
    malloc: '不支持动态内存分配',
    printf: '请用 print(x) 输出，printf 暂不支持'
  };

  var KEYWORDS = {
    int: 1, double: 1, float: 1, bool: 1, string: 1,
    if: 1, else: 1, while: 1, for: 1, break: 1, continue: 1,
    true: 1, false: 1
  };

  var TWO_CHAR_OPS = {
    '==': 1, '!=': 1, '<=': 1, '>=': 1, '&&': 1, '||': 1,
    '++': 1, '--': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1,
    '<<': 1, '>>': 1, '->': 1, '::': 1
  };

  var ONE_CHAR_OPS = {
    '+': 1, '-': 1, '*': 1, '/': 1, '%': 1, '!': 1, '<': 1, '>': 1, '=': 1,
    '(': 1, ')': 1, '{': 1, '}': 1, ';': 1, ',': 1, '.': 1, '?': 1, ':': 1,
    '&': 1, '|': 1, '^': 1, '~': 1, '[': 1, ']': 1
  };

  var ASSIGN_OPS = { '=': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1 };

  var CONSTANTS = { pi: Math.PI, PI: Math.PI, e: Math.E };

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  function isDigit(ch) { return ch >= '0' && ch <= '9'; }
  function isAlpha(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }
  function isIdentChar(ch) { return isAlpha(ch) || isDigit(ch); }

  /* 取整：向 0 截断（等价 Math.trunc，但 ES5 环境下自己算更稳） */
  function trunc(v) {
    if (!isFinite(v)) return 0;
    return v < 0 ? Math.ceil(v) : Math.floor(v);
  }

  /* ---------- 错误 ---------- */
  function ScriptError(message, line, col) {
    this.name = 'ScriptError';
    this.message = message;
    this.line = line || 1;
    this.col = col || 1;
    this.__scriptError = true;
  }

  function isScriptError(e) { return !!e && e.__scriptError === true; }

  function errAt(message, node) {
    return new ScriptError(message, node ? node.line : 1, node ? node.col : 1);
  }

  /* ============================================================
     词法
     ============================================================ */
  function lex(src) {
    var s = String(src == null ? '' : src);
    var n = s.length;
    var i = 0;
    var line = 1;
    var lineStart = 0;
    var toks = [];

    function push(t, v, l, c, p) {
      toks.push({ t: t, v: v, line: l, col: c, pos: p });
    }
    function err(msg, l, c) { throw new ScriptError(msg, l, c); }

    while (i < n) {
      var ch = s.charAt(i);

      /* 换行 / 空白 */
      if (ch === '\n') { i += 1; line += 1; lineStart = i; continue; }
      if (ch === '\r') {
        i += 1;
        if (s.charAt(i) === '\n') i += 1;
        line += 1;
        lineStart = i;
        continue;
      }
      if (ch === ' ' || ch === '\t' || ch === '\f' || ch === '\v' ||
          ch === '\u00a0' || ch === '\ufeff') {
        i += 1;
        continue;
      }

      var col = i - lineStart + 1;

      /* 注释 */
      if (ch === '/' && s.charAt(i + 1) === '/') {
        while (i < n && s.charAt(i) !== '\n') i += 1;
        continue;
      }
      if (ch === '/' && s.charAt(i + 1) === '*') {
        var cLine = line;
        var cCol = col;
        i += 2;
        var closed = false;
        while (i < n) {
          if (s.charAt(i) === '*' && s.charAt(i + 1) === '/') { i += 2; closed = true; break; }
          if (s.charAt(i) === '\n') { line += 1; lineStart = i + 1; }
          i += 1;
        }
        if (!closed) err('块注释 /* 没有闭合', cLine, cCol);
        continue;
      }

      /* 数字：123、1.5、.5、1e-3 */
      if (isDigit(ch) || (ch === '.' && isDigit(s.charAt(i + 1)))) {
        var nStart = i;
        while (i < n && isDigit(s.charAt(i))) i += 1;
        if (s.charAt(i) === '.') {
          i += 1;
          while (i < n && isDigit(s.charAt(i))) i += 1;
        }
        if (s.charAt(i) === '.' && isDigit(s.charAt(i + 1))) {
          err('数字格式有误：出现了多个小数点', line, col);
        }
        if (s.charAt(i) === 'e' || s.charAt(i) === 'E') {
          var save = i;
          i += 1;
          if (s.charAt(i) === '+' || s.charAt(i) === '-') i += 1;
          if (!isDigit(s.charAt(i))) i = save;
          else while (i < n && isDigit(s.charAt(i))) i += 1;
        }
        push('num', parseFloat(s.slice(nStart, i)), line, col, nStart);
        continue;
      }

      /* 字符串：只支持双引号 */
      if (ch === '"') {
        var sLine = line;
        var sCol = col;
        var buf = '';
        var j = i + 1;
        var done = false;
        while (j < n) {
          var c2 = s.charAt(j);
          if (c2 === '"') { done = true; j += 1; break; }
          if (c2 === '\n' || c2 === '\r') break;
          if (c2 === '\\') {
            var esc = s.charAt(j + 1);
            if (esc === '"') { buf += '"'; j += 2; continue; }
            if (esc === '\\') { buf += '\\'; j += 2; continue; }
            if (esc === 'n') { buf += '\n'; j += 2; continue; }
            if (esc === 't') { buf += '\t'; j += 2; continue; }
            if (esc === 'r') { buf += '\r'; j += 2; continue; }
            err('不支持的转义字符 \\' + esc + '（可用 \\" \\\\ \\n \\t \\r）', sLine, sCol);
          }
          buf += c2;
          j += 1;
        }
        if (!done) err('字符串没有闭合（缺少右引号 "）', sLine, sCol);
        push('str', buf, sLine, sCol, i);
        i = j;
        continue;
      }

      if (ch === "'") {
        err('字符串请用双引号 "..."（不支持单引号）', line, col);
      }

      /* 标识符 / 关键字 */
      if (isAlpha(ch)) {
        var start = i;
        while (i < n && isIdentChar(s.charAt(i))) i += 1;
        var word = s.slice(start, i);
        if (has(KEYWORDS, word)) push('kw', word, line, col, start);
        else push('ident', word, line, col, start);
        continue;
      }

      /* 运算符（先长后短） */
      var three = s.substr(i, 3);
      if (three === '<<=' || three === '>>=') {
        err('暂不支持位运算 / 流操作符：' + three, line, col);
      }
      var two = s.substr(i, 2);
      if (has(TWO_CHAR_OPS, two)) {
        push('op', two, line, col, i);
        i += 2;
        continue;
      }
      if (has(ONE_CHAR_OPS, ch)) {
        push('op', ch, line, col, i);
        i += 1;
        continue;
      }

      /* 其余字符给出针对性提示 */
      if (ch === '#') err('不支持预处理指令（#include 等），脚本里直接用内置函数即可', line, col);
      if (ch === '[' || ch === ']') err('暂不支持数组与下标访问', line, col);
      if (ch === '&') err('暂不支持引用与取地址（&）', line, col);
      if (ch === '|') err('暂不支持位运算（|）', line, col);
      if (ch === '^') err('暂不支持 ^ 运算符（乘方请用 pow(a, b)）', line, col);
      if (ch === '~') err('暂不支持位运算（~）', line, col);
      if (ch === '\\') err('无法识别的反斜杠 \\（转义要写在字符串引号内）', line, col);
      err('无法识别的字符 "' + ch + '"', line, col);
    }

    push('eof', '', line, i - lineStart + 1, n);
    return toks;
  }

  /* ============================================================
     语法：递归下降
     ============================================================ */
  function Parser(tokens) {
    this.ts = tokens;
    this.i = 0;
  }

  Parser.prototype.peek = function (k) {
    return this.ts[this.i + (k || 0)] || null;
  };

  Parser.prototype.next = function () { return this.ts[this.i++] || null; };

  Parser.prototype.last = function () {
    return this.ts[this.i > 0 ? this.i - 1 : 0] || { t: 'eof', v: '', line: 1, col: 1 };
  };

  Parser.prototype.atOp = function (v) {
    var t = this.peek();
    return !!t && t.t === 'op' && t.v === v;
  };

  Parser.prototype.eatOp = function (v) {
    if (this.atOp(v)) { this.i += 1; return true; }
    return false;
  };

  Parser.prototype.expectOp = function (v, msg) {
    if (this.eatOp(v)) return;
    var t = this.peek() || this.last();
    throw errAt(msg || ('这里需要 "' + v + '"'), t);
  };

  Parser.prototype.fail = function (msg, tok) {
    throw errAt(msg, tok || this.peek() || this.last());
  };

  function tokText(t) {
    if (!t) return '结尾';
    if (t.t === 'eof') return '结尾';
    if (t.t === 'str') return '"' + t.v + '"';
    return String(t.v);
  }

  /* ---------- 语句 ---------- */
  Parser.prototype.parseProgram = function () {
    var body = [];
    while (this.peek() && this.peek().t !== 'eof') {
      body.push(this.parseStatement());
    }
    return { k: 'block', body: body, line: 1, col: 1, top: true };
  };

  Parser.prototype.parseStatement = function () {
    var t = this.peek();
    if (!t || t.t === 'eof') this.fail('语句不完整（缺少内容）', this.last());

    if (t.t === 'op' && t.v === '{') return this.parseBlock();
    if (t.t === 'op' && t.v === ';') {
      this.next();
      return { k: 'empty', line: t.line, col: t.col };
    }

    if (t.t === 'kw') {
      if (t.v === 'if') return this.parseIf();
      if (t.v === 'while') return this.parseWhile();
      if (t.v === 'for') return this.parseFor();
      if (t.v === 'break' || t.v === 'continue') {
        this.next();
        this.expectOp(';', t.v + ' 后面缺少分号 ;');
        return { k: t.v, line: t.line, col: t.col };
      }
      if (has(TYPE_NAMES, t.v)) return this.parseDecl(true);
      if (t.v === 'else') this.fail('else 前面没有对应的 if', t);
    }

    if (t.t === 'ident' && has(STMT_HINTS, t.v)) this.fail(STMT_HINTS[t.v], t);
    if (t.t === 'op' && t.v === '}') this.fail('多了一个右花括号 }（前面没有对应的 {）', t);

    var expr = this.parseExpression();
    this.expectOp(';', '语句末尾缺少分号 ;');
    return { k: 'exprStmt', expr: expr, line: t.line, col: t.col };
  };

  Parser.prototype.parseBlock = function () {
    var open = this.next();      /* { */
    var body = [];
    for (;;) {
      var t = this.peek();
      if (!t || t.t === 'eof') this.fail('花括号 { 没有闭合', open);
      if (t.t === 'op' && t.v === '}') { this.next(); break; }
      body.push(this.parseStatement());
    }
    return { k: 'block', body: body, line: open.line, col: open.col };
  };

  Parser.prototype.parseIf = function () {
    var kw = this.next();
    this.expectOp('(', 'if 后面缺少左括号 (');
    var cond = this.parseExpression();
    this.expectOp(')', 'if 的条件缺少右括号 )');
    var then = this.parseStatement();
    var alt = null;
    var t = this.peek();
    if (t && t.t === 'kw' && t.v === 'else') {
      this.next();
      alt = this.parseStatement();
    }
    return { k: 'if', cond: cond, then: then, alt: alt, line: kw.line, col: kw.col };
  };

  Parser.prototype.parseWhile = function () {
    var kw = this.next();
    this.expectOp('(', 'while 后面缺少左括号 (');
    var cond = this.parseExpression();
    this.expectOp(')', 'while 的条件缺少右括号 )');
    var body = this.parseStatement();
    return { k: 'while', cond: cond, body: body, line: kw.line, col: kw.col };
  };

  Parser.prototype.parseFor = function () {
    var kw = this.next();
    this.expectOp('(', 'for 后面缺少左括号 (');

    var init = null;
    if (this.atOp(';')) {
      this.next();
    } else if (this.peek() && this.peek().t === 'kw' && has(TYPE_NAMES, this.peek().v)) {
      init = this.parseDecl(false);
      this.expectOp(';', 'for 的初始化部分缺少分号 ;');
    } else {
      var initTok = this.peek();
      init = { k: 'exprStmt', expr: this.parseExpression(), line: initTok.line, col: initTok.col };
      this.expectOp(';', 'for 的初始化部分缺少分号 ;');
    }

    var cond = null;
    if (!this.atOp(';')) cond = this.parseExpression();
    this.expectOp(';', 'for 的条件部分缺少分号 ;');

    var stepExpr = null;
    if (!this.atOp(')')) stepExpr = this.parseExpression();
    this.expectOp(')', 'for 缺少右括号 )');

    var body = this.parseStatement();
    return {
      k: 'for', init: init, cond: cond, stepExpr: stepExpr,
      body: body, line: kw.line, col: kw.col
    };
  };

  Parser.prototype.parseDecl = function (needSemi) {
    var typeTok = this.next();
    var items = [];
    for (;;) {
      var nameTok = this.peek();
      if (!nameTok || nameTok.t !== 'ident') {
        this.fail('变量声明缺少变量名（' + typeTok.v + ' 后面要写名字）', nameTok || typeTok);
      }
      var after = this.peek(1);
      if (after && after.t === 'op' && after.v === '(') {
        this.fail('暂不支持自定义函数：本引擎只支持 if / for / while 等语句，没有函数定义', nameTok);
      }
      this.next();
      var init = null;
      if (this.atOp('=')) {
        this.next();
        init = this.parseAssignment();
      }
      items.push({ name: nameTok.v, init: init, line: nameTok.line, col: nameTok.col });
      if (this.atOp(',')) { this.next(); continue; }
      break;
    }
    if (needSemi) this.expectOp(';', '变量声明末尾缺少分号 ;');
    return { k: 'decl', type: typeTok.v, items: items, line: typeTok.line, col: typeTok.col };
  };

  /* ---------- 表达式 ---------- */
  Parser.prototype.parseExpression = function () {
    return this.parseAssignment();
  };

  Parser.prototype.parseAssignment = function () {
    var left = this.parseTernary();
    var t = this.peek();
    if (t && t.t === 'op' && has(ASSIGN_OPS, t.v)) {
      this.next();
      if (!isLvalueNode(left)) {
        this.fail('赋值号左边必须是变量或对象属性（例如 n = 1 或 BC.color = "red"）', t);
      }
      var right = this.parseAssignment();
      return { k: 'assign', op: t.v, target: left, value: right, line: t.line, col: t.col };
    }
    return left;
  };

  Parser.prototype.parseTernary = function () {
    var cond = this.parseBinary(0);
    if (this.atOp('?')) {
      var q = this.next();
      var a = this.parseAssignment();
      this.expectOp(':', '三目运算符缺少冒号 :');
      var b = this.parseAssignment();
      return { k: 'ternary', cond: cond, a: a, b: b, line: q.line, col: q.col };
    }
    return cond;
  };

  /* 优先级从低到高：|| → && → == != → 比较 → + - → * / % */
  var BIN_LEVELS = [
    ['||'],
    ['&&'],
    ['==', '!='],
    ['<', '>', '<=', '>='],
    ['+', '-'],
    ['*', '/', '%']
  ];

  Parser.prototype.parseBinary = function (level) {
    if (level >= BIN_LEVELS.length) return this.parseUnary();
    var left = this.parseBinary(level + 1);
    var ops = BIN_LEVELS[level];
    for (;;) {
      var t = this.peek();
      if (!t || t.t !== 'op' || ops.indexOf(t.v) < 0) break;
      this.next();
      var right = this.parseBinary(level + 1);
      left = { k: 'bin', op: t.v, a: left, b: right, line: t.line, col: t.col };
    }
    return left;
  };

  Parser.prototype.parseUnary = function () {
    var t = this.peek();
    if (t && t.t === 'op' && (t.v === '!' || t.v === '-' || t.v === '+')) {
      this.next();
      return { k: 'unary', op: t.v, a: this.parseUnary(), line: t.line, col: t.col };
    }
    return this.parseIncDec();
  };

  Parser.prototype.parseIncDec = function () {
    var t = this.peek();
    if (t && t.t === 'op' && (t.v === '++' || t.v === '--')) {
      this.next();
      var operand = this.parseIncDec();
      if (!isLvalueNode(operand)) this.fail('++ / -- 只能用在变量或对象属性上', t);
      return { k: 'update', op: t.v, prefix: true, target: operand, line: t.line, col: t.col };
    }
    return this.parsePostfix();
  };

  Parser.prototype.parsePostfix = function () {
    var node = this.parsePrimary();
    for (;;) {
      var t = this.peek();
      if (!t || t.t !== 'op') break;

      if (t.v === '.') {
        this.next();
        var nameTok = this.peek();
        if (!nameTok || nameTok.t !== 'ident') this.fail('. 后面需要属性名', nameTok || t);
        this.next();
        node = { k: 'member', obj: node, name: nameTok.v, line: t.line, col: t.col };
        if (this.atOp('.')) {
          this.fail('成员访问只支持一层（obj.prop），不能连续取属性', t);
        }
      } else if (t.v === '(') {
        this.next();
        var args = [];
        if (!this.atOp(')')) {
          for (;;) {
            args.push(this.parseAssignment());
            if (this.atOp(',')) { this.next(); continue; }
            break;
          }
        }
        this.expectOp(')', '函数调用的参数列表缺少右括号 )');
        node = { k: 'call', callee: node, args: args, line: t.line, col: t.col };
      } else if (t.v === '++' || t.v === '--') {
        this.next();
        if (!isLvalueNode(node)) this.fail('++ / -- 只能用在变量或对象属性上', t);
        node = { k: 'update', op: t.v, prefix: false, target: node, line: t.line, col: t.col };
      } else if (t.v === '<<' || t.v === '>>') {
        this.fail('暂不支持 cout / cin 的 << >> 流操作，请用 print(x) 输出', t);
      } else {
        break;
      }
    }
    return node;
  };

  Parser.prototype.parsePrimary = function () {
    var t = this.next();
    if (!t || t.t === 'eof') this.fail('表达式不完整（缺少值）', this.last());

    if (t.t === 'num') return { k: 'num', v: t.v, line: t.line, col: t.col };
    if (t.t === 'str') return { k: 'str', v: t.v, line: t.line, col: t.col };
    if (t.t === 'kw' && (t.v === 'true' || t.v === 'false')) {
      return { k: 'bool', v: t.v === 'true', line: t.line, col: t.col };
    }
    if (t.t === 'ident') return { k: 'ident', name: t.v, line: t.line, col: t.col };
    if (t.t === 'op' && t.v === '(') {
      var inner = this.parseExpression();
      this.expectOp(')', '括号没有闭合（缺少右括号 )）');
      return inner;
    }
    this.fail('这里需要一个值（数字、字符串、变量或括号），但看到 "' + tokText(t) + '"', t);
  };

  function isLvalueNode(node) {
    return !!node && (node.k === 'ident' || node.k === 'member');
  }

  /* ============================================================
     作用域
     ============================================================ */
  function Scope(parent) {
    this.vars = {};
    this.parent = parent || null;
  }

  Scope.prototype.own = function (name) {
    return has(this.vars, name);
  };

  Scope.prototype.get = function (name) {
    var s = this;
    while (s) {
      if (has(s.vars, name)) return s.vars[name];
      s = s.parent;
    }
    return null;
  };

  Scope.prototype.declare = function (name, entry) {
    this.vars[name] = entry;
  };

  /* ============================================================
     取值与类型转换
     ============================================================ */
  function isProxy(v) {
    return !!v && typeof v === 'object' &&
      typeof v.get === 'function' && typeof v.set === 'function';
  }

  function toNumber(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') {
      var s = v.replace(/^\s+|\s+$/g, '');
      if (s === '') return 0;
      return Number(s);
    }
    if (isProxy(v)) return NaN;
    if (v == null) return 0;
    return Number(v);
  }

  function fmtNumber(v) {
    if (v !== v) return 'NaN';
    if (v === Infinity) return 'Infinity';
    if (v === -Infinity) return '-Infinity';
    if (v === 0) return (1 / v < 0) ? '-0' : '0';
    if (Math.floor(v) === v && Math.abs(v) < 1e21) return String(v);
    /* 去掉二进制浮点的尾巴：0.30000000000000004 → 0.3 */
    return String(Number(v.toPrecision(12)));
  }

  function toStr(v) {
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return fmtNumber(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (isProxy(v)) {
      var nm = quietGet(v, 'name');
      return '［对象 ' + (typeof nm === 'string' && nm ? nm : '?') + '］';
    }
    if (v == null) return '';
    return String(v);
  }

  function truthy(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;         /* NaN 视为真，同 C++ */
    if (typeof v === 'string') return v.length > 0;
    if (isProxy(v)) return true;
    return !!v;
  }

  function describeValue(v) {
    if (v === null || v === undefined) return '空值';
    if (typeof v === 'number') return '数字 ' + fmtNumber(v);
    if (typeof v === 'string') return '字符串 "' + v + '"';
    if (typeof v === 'boolean') return '布尔值 ' + (v ? 'true' : 'false');
    if (isProxy(v)) return '对象';
    return '值';
  }

  function defaultFor(type) {
    if (type === 'int') return 0;
    if (type === 'bool') return false;
    if (type === 'string') return '';
    return 0;
  }

  function coerceTo(type, value) {
    if (type === 'int') {
      var n = toNumber(value);
      if (!isFinite(n)) return 0;
      return trunc(n);
    }
    if (type === 'double' || type === 'float') return toNumber(value);
    if (type === 'bool') return truthy(value);
    return toStr(value);
  }

  /* 取属性：属性不存在或代理抛错时返回 undefined，不打断流程 */
  function quietGet(obj, name) {
    if (!isProxy(obj)) return undefined;
    try { return obj.get(name); } catch (e) { return undefined; }
  }

  /* ============================================================
     内置函数
     ============================================================ */
  var ARITY = {
    sqrt: 1, abs: 1, pow: 2, sin: 1, cos: 1, tan: 1,
    asin: 1, acos: 1, atan: 1, atan2: 2,
    floor: 1, ceil: 1, round: 1,
    log: 1, ln: 1, log10: 1, exp: 1,
    min: 'min2', max: 'min2',
    deg: 1, rad: 1, sind: 1, cosd: 1, tand: 1,
    near: 'near', dist: 2, angle: 3, length: 1,
    tonum: 1, tostr: 1,
    print: 'min1', warn: 'min1', pass: 'min1', fail: 'min1'
  };

  function checkArity(name, n, node) {
    var spec = ARITY[name];
    if (spec === 'near') {
      if (n < 2 || n > 3) throw errAt('函数 near 需要 2 或 3 个参数，实际给了 ' + n + ' 个', node);
      return;
    }
    if (spec === 'min1') {
      if (n < 1) throw errAt('函数 ' + name + ' 至少需要 1 个参数', node);
      return;
    }
    if (spec === 'min2') {
      if (n < 2) throw errAt('函数 ' + name + ' 至少需要 2 个参数', node);
      return;
    }
    if (n !== spec) {
      throw errAt('函数 ' + name + ' 需要 ' + spec + ' 个参数，实际给了 ' + n + ' 个', node);
    }
  }

  function pointXY(v, fname, node) {
    if (!isProxy(v)) {
      throw errAt(fname + '：参数必须是点对象（例如 A、B）', node);
    }
    var x = quietGet(v, 'x');
    var y = quietGet(v, 'y');
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
      throw errAt(fname + '：这个对象没有有效坐标（它可能不是点，或坐标尚未求出）', node);
    }
    return { x: x, y: y };
  }

  function joinArgs(args) {
    var out = [];
    for (var i = 0; i < args.length; i += 1) out.push(toStr(args[i]));
    return out.join(' ');
  }

  var BUILTINS = {
    sqrt: function (a) { return Math.sqrt(toNumber(a[0])); },
    abs: function (a) { return Math.abs(toNumber(a[0])); },
    pow: function (a) { return Math.pow(toNumber(a[0]), toNumber(a[1])); },
    sin: function (a) { return Math.sin(toNumber(a[0])); },
    cos: function (a) { return Math.cos(toNumber(a[0])); },
    tan: function (a) { return Math.tan(toNumber(a[0])); },
    asin: function (a) { return Math.asin(toNumber(a[0])); },
    acos: function (a) { return Math.acos(toNumber(a[0])); },
    atan: function (a) { return Math.atan(toNumber(a[0])); },
    atan2: function (a) { return Math.atan2(toNumber(a[0]), toNumber(a[1])); },
    floor: function (a) { return Math.floor(toNumber(a[0])); },
    ceil: function (a) { return Math.ceil(toNumber(a[0])); },
    round: function (a) {
      var v = toNumber(a[0]);
      return v < 0 ? -Math.round(-v) : Math.round(v);   /* 与 C++ 一致：.5 远离 0 */
    },
    /* log 与 ln 都是自然对数（对齐 C++ <cmath>），log10 才是常用对数 */
    log: function (a) { return Math.log(toNumber(a[0])); },
    ln: function (a) { return Math.log(toNumber(a[0])); },
    log10: function (a) { return Math.log(toNumber(a[0])) / Math.LN10; },
    exp: function (a) { return Math.exp(toNumber(a[0])); },
    min: function (a) {
      var v = toNumber(a[0]);
      for (var i = 1; i < a.length; i += 1) v = Math.min(v, toNumber(a[i]));
      return v;
    },
    max: function (a) {
      var v = toNumber(a[0]);
      for (var i = 1; i < a.length; i += 1) v = Math.max(v, toNumber(a[i]));
      return v;
    },
    deg: function (a) { return toNumber(a[0]) / DEG; },
    rad: function (a) { return toNumber(a[0]) * DEG; },
    sind: function (a) { return Math.sin(toNumber(a[0]) * DEG); },
    cosd: function (a) { return Math.cos(toNumber(a[0]) * DEG); },
    tand: function (a) { return Math.tan(toNumber(a[0]) * DEG); },
    near: function (a) {
      var eps = a.length >= 3 ? toNumber(a[2]) : DEFAULT_EPS;
      var x = toNumber(a[0]);
      var y = toNumber(a[1]);
      if (!isFinite(x) || !isFinite(y) || !isFinite(eps)) return false;
      return Math.abs(x - y) <= eps;
    },
    dist: function (a, it, node) {
      var p = pointXY(a[0], 'dist', node);
      var q = pointXY(a[1], 'dist', node);
      return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
    },
    angle: function (a, it, node) {
      var A = pointXY(a[0], 'angle', node);
      var B = pointXY(a[1], 'angle', node);
      var C = pointXY(a[2], 'angle', node);
      var v1x = A.x - B.x;
      var v1y = A.y - B.y;
      var v2x = C.x - B.x;
      var v2y = C.y - B.y;
      var n1 = Math.sqrt(v1x * v1x + v1y * v1y);
      var n2 = Math.sqrt(v2x * v2x + v2y * v2y);
      if (n1 === 0 || n2 === 0) return NaN;
      var cosv = (v1x * v2x + v1y * v2y) / (n1 * n2);
      if (cosv > 1) cosv = 1;
      if (cosv < -1) cosv = -1;
      return Math.acos(cosv) / DEG;
    },
    length: function (a, it, node) {
      var o = a[0];
      if (!isProxy(o)) throw errAt('length 需要一个几何对象（线段、圆或多边形）', node);
      var type = quietGet(o, 'type');
      var v;
      if (type === 'segment') v = quietGet(o, 'length');
      else if (type === 'circle') v = quietGet(o, 'circumference');
      else if (type === 'polygon') v = quietGet(o, 'perimeter');
      else {
        throw errAt('length 只支持线段、圆和多边形（当前类型：' + (type || '未知') + '）', node);
      }
      if (typeof v !== 'number' || !isFinite(v)) {
        throw errAt('这个对象的长度暂时算不出来（可能依赖的点还没确定）', node);
      }
      return v;
    },
    tonum: function (a) { return toNumber(a[0]); },
    tostr: function (a) { return toStr(a[0]); },
    print: function (a, it) {
      it.logs.push({ level: 'print', text: joinArgs(a) });
      return 0;
    },
    warn: function (a, it) {
      it.logs.push({ level: 'warn', text: joinArgs(a) });
      return 0;
    },
    pass: function (a, it) {
      it.results.push({ kind: 'pass', text: joinArgs(a) });
      return true;
    },
    fail: function (a, it) {
      it.results.push({ kind: 'fail', text: joinArgs(a) });
      return false;
    }
  };

  /* ============================================================
     解释器
     ============================================================ */
  var BREAK = { sig: 'break' };
  var CONTINUE = { sig: 'continue' };

  function Interp(bridge, opts) {
    this.bridge = (bridge && typeof bridge === 'object') ? bridge : {};
    var o = opts || {};
    this.maxSteps = (typeof o.maxSteps === 'number' && o.maxSteps > 0)
      ? Math.floor(o.maxSteps) : DEFAULT_MAX_STEPS;
    this.maxLoop = (typeof o.maxLoop === 'number' && o.maxLoop > 0)
      ? Math.floor(o.maxLoop) : DEFAULT_MAX_LOOP;
    this.steps = 0;
    this.logs = [];
    this.results = [];
    this.line = 1;
    this.col = 1;
  }

  Interp.prototype.step = function (node) {
    this.steps += 1;
    if (node) { this.line = node.line; this.col = node.col; }
    if (this.steps > this.maxSteps) {
      throw errAt('脚本执行步数超过上限（' + this.maxSteps + ' 步）：请检查循环是否写错', node);
    }
  };

  /* ---------- 语句执行 ---------- */
  Interp.prototype.exec = function (node, scope) {
    switch (node.k) {
      case 'block':
        this.execBlock(node, scope);
        return;
      case 'empty':
        this.step(node);
        return;
      case 'decl':
        this.step(node);
        this.execDecl(node, scope);
        return;
      case 'exprStmt':
        this.step(node);
        this.evalNode(node.expr, scope);
        return;
      case 'if':
        this.step(node);
        if (truthy(this.evalNode(node.cond, scope))) this.exec(node.then, scope);
        else if (node.alt) this.exec(node.alt, scope);
        return;
      case 'while':
        this.execWhile(node, scope);
        return;
      case 'for':
        this.execFor(node, scope);
        return;
      case 'break':
        this.step(node);
        throw BREAK;
      case 'continue':
        this.step(node);
        throw CONTINUE;
      default:
        throw errAt('无法执行的语句', node);
    }
  };

  Interp.prototype.execBlock = function (node, scope) {
    var inner = node.top ? scope : new Scope(scope);
    for (var i = 0; i < node.body.length; i += 1) {
      this.exec(node.body[i], inner);
    }
  };

  Interp.prototype.execDecl = function (node, scope) {
    for (var i = 0; i < node.items.length; i += 1) {
      var item = node.items[i];
      if (scope.own(item.name)) {
        throw errAt('变量 ' + item.name + ' 重复声明（同一作用域内不能重复声明）', item);
      }
      var raw = item.init ? this.evalNode(item.init, scope) : defaultFor(node.type);
      scope.declare(item.name, { type: node.type, value: coerceTo(node.type, raw) });
    }
  };

  Interp.prototype.runBody = function (body, scope) {
    try {
      this.exec(body, scope);
    } catch (e) {
      if (e === BREAK) return 'break';
      if (e === CONTINUE) return 'continue';
      throw e;
    }
    return 'next';
  };

  Interp.prototype.execWhile = function (node, scope) {
    var count = 0;
    for (;;) {
      this.step(node);
      if (!truthy(this.evalNode(node.cond, scope))) break;
      count += 1;
      if (count > this.maxLoop) {
        throw errAt('循环次数超过上限（' + this.maxLoop + ' 次）：循环条件可能永远为真', node);
      }
      if (this.runBody(node.body, scope) === 'break') break;
    }
  };

  Interp.prototype.execFor = function (node, scope) {
    var loopScope = new Scope(scope);
    if (node.init) {
      if (node.init.k === 'decl') this.execDecl(node.init, loopScope);
      else this.evalNode(node.init.expr, loopScope);
    }

    var count = 0;
    for (;;) {
      this.step(node);
      if (node.cond && !truthy(this.evalNode(node.cond, loopScope))) break;
      count += 1;
      if (count > this.maxLoop) {
        throw errAt('循环次数超过上限（' + this.maxLoop + ' 次）：循环条件可能永远为真', node);
      }
      var sig = this.runBody(node.body, loopScope);
      if (sig === 'break') break;
      if (node.stepExpr) this.evalNode(node.stepExpr, loopScope);
    }
  };

  /* ---------- 表达式求值 ---------- */
  Interp.prototype.evalNode = function (node, scope) {
    switch (node.k) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'bool': return node.v;
      case 'ident': return this.readIdent(node, scope);
      case 'unary': return this.evalUnary(node, scope);
      case 'bin': return this.evalBin(node, scope);
      case 'ternary':
        return truthy(this.evalNode(node.cond, scope))
          ? this.evalNode(node.a, scope) : this.evalNode(node.b, scope);
      case 'member': return this.readMember(node, scope);
      case 'call': return this.evalCall(node, scope);
      case 'assign': return this.evalAssign(node, scope);
      case 'update': return this.evalUpdate(node, scope);
      default:
        throw errAt('无法计算的表达式', node);
    }
  };

  Interp.prototype.readIdent = function (node, scope) {
    var entry = scope.get(node.name);
    if (entry) return entry.value;

    var value;
    if (typeof this.bridge.resolve === 'function') {
      try {
        value = this.bridge.resolve(node.name);
      } catch (e) {
        throw wrapBridgeError(e, node);
      }
    }
    if (value !== undefined) return value;

    if (has(CONSTANTS, node.name)) return CONSTANTS[node.name];

    if (typeof this.bridge.isObjectName === 'function') {
      var isObj = false;
      try { isObj = !!this.bridge.isObjectName(node.name); } catch (e) { isObj = false; }
      if (isObj) throw errAt('对象 ' + node.name + ' 取不到值（可能还没有求值结果）', node);
    }

    if (has(BUILTINS, node.name)) {
      throw errAt('函数 ' + node.name + ' 需要加括号调用，例如 ' + node.name + '(x)', node);
    }
    throw errAt('未定义的变量或对象：' + node.name, node);
  };

  Interp.prototype.readMember = function (node, scope) {
    var base = this.evalNode(node.obj, scope);
    if (!isProxy(base)) {
      throw errAt('只有对象才能取属性：' + exprName(node.obj) + ' 是' + describeValue(base), node);
    }
    var v;
    try {
      v = base.get(node.name);
    } catch (e) {
      throw wrapBridgeError(e, node);
    }
    if (v === undefined) {
      throw errAt('对象 ' + exprName(node.obj) + ' 没有属性 "' + node.name + '"（或该属性不可读）', node);
    }
    return v;
  };

  Interp.prototype.evalArgs = function (argNodes, scope) {
    var out = [];
    for (var i = 0; i < argNodes.length; i += 1) out.push(this.evalNode(argNodes[i], scope));
    return out;
  };

  Interp.prototype.callBuiltin = function (name, argNodes, posNode, scope) {
    checkArity(name, argNodes.length, posNode);
    var args = this.evalArgs(argNodes, scope);
    return BUILTINS[name](args, this, posNode);
  };

  Interp.prototype.evalCall = function (node, scope) {
    var callee = node.callee;

    if (callee.k === 'ident') {
      var name = callee.name;

      if (scope.get(name)) {
        throw errAt('变量 ' + name + ' 不是函数，不能这样调用', callee);
      }

      var isObj = false;
      if (typeof this.bridge.isObjectName === 'function') {
        try { isObj = !!this.bridge.isObjectName(name); } catch (e) { isObj = false; }
      }
      if (isObj) {
        throw errAt('对象 ' + name + ' 不能当函数调用（目前只有函数对象的 eval(x) 方法）', callee);
      }

      if (has(BUILTINS, name)) return this.callBuiltin(name, node.args, callee, scope);

      throw errAt('未定义的函数：' + name + '（可用函数见「语法详解」）', callee);
    }

    if (callee.k === 'member') {
      var obj = this.evalNode(callee.obj, scope);
      if (!isProxy(obj)) {
        throw errAt('只有对象才有方法：' + exprName(callee.obj) + ' 是' + describeValue(obj), callee);
      }
      var args = this.evalArgs(node.args, scope);
      try {
        return obj.call(callee.name, args);
      } catch (e) {
        throw wrapBridgeError(e, callee);
      }
    }

    throw errAt('这个表达式不能当函数调用', callee);
  };

  Interp.prototype.lvalue = function (node, scope) {
    if (node.k === 'ident') {
      var entry = scope.get(node.name);
      if (!entry) {
        throw errAt('变量 ' + node.name + ' 还没有声明，不能赋值（请先写类型声明，例如 int ' + node.name + ' = 0;）', node);
      }
      return {
        get: function () { return entry.value; },
        set: function (v) { entry.value = coerceTo(entry.type, v); }
      };
    }

    if (node.k === 'member') {
      var base = this.evalNode(node.obj, scope);
      if (!isProxy(base)) {
        throw errAt('只有对象才能改属性：' + exprName(node.obj) + ' 是' + describeValue(base), node);
      }
      return {
        get: function () {
          var v;
          try { v = base.get(node.name); } catch (e) { throw wrapBridgeError(e, node); }
          return v;
        },
        set: function (v) {
          try { base.set(node.name, v); } catch (e) { throw wrapBridgeError(e, node); }
        }
      };
    }

    throw errAt('赋值号左边必须是变量或对象属性', node);
  };

  Interp.prototype.evalAssign = function (node, scope) {
    var lv = this.lvalue(node.target, scope);
    var value;
    if (node.op === '=') {
      value = this.evalNode(node.value, scope);
    } else {
      var cur = lv.get();
      var right = this.evalNode(node.value, scope);
      value = this.applyBinary(node.op.charAt(0), cur, right, node);
    }
    lv.set(value);
    try {
      var after = lv.get();
      return after === undefined ? value : after;
    } catch (e) {
      return value;
    }
  };

  Interp.prototype.evalUpdate = function (node, scope) {
    var lv = this.lvalue(node.target, scope);
    var cur = toNumber(lv.get());
    var next = node.op === '++' ? cur + 1 : cur - 1;
    lv.set(next);
    if (node.prefix) {
      try {
        var after = lv.get();
        return after === undefined ? next : after;
      } catch (e) {
        return next;
      }
    }
    return cur;
  };

  Interp.prototype.evalUnary = function (node, scope) {
    var v = this.evalNode(node.a, scope);
    if (node.op === '!') return !truthy(v);
    if (node.op === '-') return -toNumber(v);
    return toNumber(v);
  };

  Interp.prototype.evalBin = function (node, scope) {
    var op = node.op;
    if (op === '&&') {
      return truthy(this.evalNode(node.a, scope)) ? truthy(this.evalNode(node.b, scope)) : false;
    }
    if (op === '||') {
      return truthy(this.evalNode(node.a, scope)) ? true : truthy(this.evalNode(node.b, scope));
    }
    var a = this.evalNode(node.a, scope);
    var b = this.evalNode(node.b, scope);
    return this.applyBinary(op, a, b, node);
  };

  Interp.prototype.applyBinary = function (op, a, b, node) {
    if (op === '+') {
      if (typeof a === 'string' || typeof b === 'string') return toStr(a) + toStr(b);
      return toNumber(a) + toNumber(b);
    }
    if (op === '-' || op === '*' || op === '/') {
      var x = toNumber(a);
      var y = toNumber(b);
      if (op === '-') return x - y;
      if (op === '*') return x * y;
      return x / y;                       /* 0/0 → NaN，1/0 → Infinity，同 IEEE */
    }
    if (op === '%') {
      var m = toNumber(a);
      var nn = toNumber(b);
      if (nn === 0) throw errAt('取余运算的除数为 0', node);
      return m % nn;
    }
    if (op === '==' || op === '!=') {
      var same;
      if (typeof a === 'string' && typeof b === 'string') same = a === b;
      else same = toNumber(a) === toNumber(b);
      return op === '==' ? same : !same;
    }

    /* 关系运算：两侧都是字符串按字典序，否则转数字比较 */
    if (typeof a === 'string' && typeof b === 'string') {
      if (op === '<') return a < b;
      if (op === '>') return a > b;
      if (op === '<=') return a <= b;
      return a >= b;
    }
    var na = toNumber(a);
    var nb = toNumber(b);
    if (op === '<') return na < nb;
    if (op === '>') return na > nb;
    if (op === '<=') return na <= nb;
    return na >= nb;
  };

  function exprName(node) {
    if (!node) return '表达式';
    if (node.k === 'ident') return node.name;
    if (node.k === 'member') return exprName(node.obj) + '.' + node.name;
    return '表达式';
  }

  function wrapBridgeError(e, node) {
    if (isScriptError(e)) return e;
    var msg = (e && e.message) ? String(e.message) : String(e);
    return errAt(msg, node);
  }

  /* ============================================================
     对外入口
     ============================================================ */
  function errorInfo(e, it) {
    if (isScriptError(e)) {
      return { message: e.message, line: e.line || 1, col: e.col || 1 };
    }
    var msg = (e && e.message) ? String(e.message) : String(e);
    return {
      message: '脚本执行出错：' + msg,
      line: (it && it.line) || 1,
      col: (it && it.col) || 1
    };
  }

  function run(source, bridge, opts) {
    var it = new Interp(bridge, opts);
    var out = { ok: true, logs: it.logs, results: it.results, error: null };

    try {
      var tokens = lex(source);
      var parser = new Parser(tokens);
      var ast = parser.parseProgram();
      var scope = new Scope(null);
      try {
        it.exec(ast, scope);
      } catch (e) {
        if (e === BREAK) throw errAt('break 只能用在循环里', { line: it.line, col: it.col });
        if (e === CONTINUE) throw errAt('continue 只能用在循环里', { line: it.line, col: it.col });
        throw e;
      }
    } catch (e) {
      out.ok = false;
      out.error = errorInfo(e, it);
    }

    return out;
  }

  SL.math.script = {
    run: run
  };
})();
