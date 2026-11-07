/* 数学绘图器 · 表达式引擎（SL.math.expr）
   ---------------------------------------------------------------
   把 "x^2-2x+1" 这样的表达式编译成语法树，再按 x 与参数反复求值。
   纯前端、无第三方库、不使用 eval / new Function。

   兼容课本与计算器的书写习惯：
   - 隐式乘法：2x、3(x+1)、(x+1)(x-1)、2sin(x)、x(x+1)
   - ^ 右结合（2^3^2 = 512）；一元负号比 ^ 松（-2^2 = -4）
   - 常数 pi、e、π；三角函数按弧度，另给 sind/cosd/tand 按角度
   - 定义域外返回 NaN（sqrt(-1)、ln(0)、0/0），1/0 返回 Infinity

   对外接口：
     SL.math.expr.compile(src) -> {
       ok: boolean,
       error: { message, line, col, pos } | null,   // line/col 从 1 开始
       eval: function (x, params) -> number,        // 定义域外返回 NaN
       freeVars: string[],                          // 不含 x、pi、e、π、函数名
       ast: object
     }
     SL.math.expr.FUNCTIONS   // 名称 -> 实现（收一个参数数组），供 freeVars 排除
     SL.math.expr.CONSTANTS   // 常数表（附加导出，便于上层判断某个名字是不是常数）

   依赖：无。
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var SL = (window.SparkLab = window.SparkLab || {});
  SL.math = SL.math || {};

  var DEG = Math.PI / 180;

  /* 常数：解析时直接变成数值节点，因此不会进入 freeVars */
  var CONSTANTS = { pi: Math.PI, 'π': Math.PI, e: Math.E };

  /* 参数个数：数字＝固定个数，'min2'＝至少 2 个 */
  var ARITY = {
    sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1,
    sqrt: 1, abs: 1, ln: 1, log: 1, log10: 1, exp: 1,
    floor: 1, ceil: 1, round: 1, sind: 1, cosd: 1, tand: 1,
    pow: 2, mod: 2, min: 'min2', max: 'min2'
  };

  /* 函数表：名称 -> function (args) -> number。
     统一收一个参数数组，min/max 这类可变参数才好写。
     注意 log 与 ln 一样是自然对数（与 C++ <cmath> 一致），log10 才是常用对数。 */
  var FUNCTIONS = {
    sin: function (a) { return Math.sin(a[0]); },
    cos: function (a) { return Math.cos(a[0]); },
    tan: function (a) { return Math.tan(a[0]); },
    asin: function (a) { return Math.asin(a[0]); },
    acos: function (a) { return Math.acos(a[0]); },
    atan: function (a) { return Math.atan(a[0]); },
    sind: function (a) { return Math.sin(a[0] * DEG); },
    cosd: function (a) { return Math.cos(a[0] * DEG); },
    tand: function (a) { return Math.tan(a[0] * DEG); },
    sqrt: function (a) { return a[0] < 0 ? NaN : Math.sqrt(a[0]); },
    abs: function (a) { return Math.abs(a[0]); },
    ln: function (a) { return a[0] <= 0 ? NaN : Math.log(a[0]); },
    log: function (a) { return a[0] <= 0 ? NaN : Math.log(a[0]); },
    log10: function (a) { return a[0] <= 0 ? NaN : Math.log(a[0]) / Math.LN10; },
    exp: function (a) { return Math.exp(a[0]); },
    floor: function (a) { return Math.floor(a[0]); },
    ceil: function (a) { return Math.ceil(a[0]); },
    round: function (a) { return Math.round(a[0]); },
    pow: function (a) { return Math.pow(a[0], a[1]); },
    mod: function (a) { return a[1] === 0 ? NaN : a[0] % a[1]; },
    min: function (a) { return Math.min.apply(null, a); },
    max: function (a) { return Math.max.apply(null, a); }
  };

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function isDigit(ch) { return ch >= '0' && ch <= '9'; }
  function isAlpha(ch) { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'); }

  /* 解析期错误：只带位置，行列由 compile 依据源码算（避免每个 throw 都传行列） */
  function ExprError(message, pos) {
    this.name = 'ExprError';
    this.message = message;
    this.pos = pos;
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

    while (i < n) {
      var ch = s.charAt(i);

      /* 换行要单独处理：行列依赖它 */
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

      /* 数字：整数、小数、.5、科学计数法 1e-3 */
      if (isDigit(ch) || (ch === '.' && isDigit(s.charAt(i + 1)))) {
        var nStart = i;
        var nLine = line;
        var nCol = i - lineStart + 1;
        while (i < n && isDigit(s.charAt(i))) i += 1;
        if (s.charAt(i) === '.') {
          i += 1;
          while (i < n && isDigit(s.charAt(i))) i += 1;
        }
        var mark = s.charAt(i);
        if (mark === 'e' || mark === 'E') {
          var j = i + 1;
          if (s.charAt(j) === '+' || s.charAt(j) === '-') j += 1;
          if (isDigit(s.charAt(j))) {
            while (j < n && isDigit(s.charAt(j))) j += 1;
            i = j;
          }
        }
        /* 一个数字后面紧跟小数点只可能是笔误（2..3、2.5.5） */
        if (s.charAt(i) === '.') {
          throw new ExprError('数字写法有误：多了一个小数点', i);
        }
        toks.push({ t: 'num', v: parseFloat(s.slice(nStart, i)), pos: nStart, line: nLine, col: nCol });
        continue;
      }

      /* 标识符：字母/下划线开头；π 单独算一个标识符（\u03c0） */
      if (isAlpha(ch) || ch === '_' || ch === '\u03c0') {
        var iStart = i;
        var iLine = line;
        var iCol = i - lineStart + 1;
        if (ch === '\u03c0') {
          i += 1;
          toks.push({ t: 'ident', v: '\u03c0', pos: iStart, line: iLine, col: iCol });
          continue;
        }
        while (i < n) {
          var c = s.charAt(i);
          if (isAlpha(c) || isDigit(c) || c === '_') i += 1;
          else break;
        }
        toks.push({ t: 'ident', v: s.slice(iStart, i), pos: iStart, line: iLine, col: iCol });
        continue;
      }

      if ('+-*/^%(),'.indexOf(ch) >= 0) {
        toks.push({ t: 'op', v: ch, pos: i, line: line, col: i - lineStart + 1 });
        i += 1;
        continue;
      }

      throw new ExprError('无法识别的字符「' + ch + '」', i);
    }

    return toks;
  }

  /* ============================================================
     语法：递归下降
     优先级（松 → 紧）：+ -  →  * / % 与隐式乘法  →  一元 + -  →  ^  →  括号/数/变量/函数
     ============================================================ */
  function Parser(toks, src) {
    this.ts = toks;
    this.i = 0;
    this.endPos = src.length;
    this.vars = [];
    this.seen = {};
  }

  Parser.prototype.peek = function () { return this.ts[this.i] || null; };

  Parser.prototype.atOp = function (v) {
    var t = this.peek();
    return !!t && t.t === 'op' && t.v === v;
  };

  Parser.prototype.parseExpr = function () { return this.parseAdd(); };

  Parser.prototype.parseAdd = function () {
    var node = this.parseMul();
    while (this.atOp('+') || this.atOp('-')) {
      var op = this.ts[this.i].v;
      this.i += 1;
      node = { k: 'bin', op: op, a: node, b: this.parseMul() };
    }
    return node;
  };

  Parser.prototype.parseMul = function () {
    var node = this.parseUnary();
    for (;;) {
      var t = this.peek();
      if (!t) break;

      if (t.t === 'op' && (t.v === '*' || t.v === '/' || t.v === '%')) {
        this.i += 1;
        node = { k: 'bin', op: t.v, a: node, b: this.parseUnary() };
        continue;
      }

      /* 隐式乘法：因子结束后紧跟 数字 / 标识符 / '(' 就补一个 '*'。
         函数调用（sin(x)）在 parsePrimary 里已经吃掉 '('，不会走到这里。 */
      if (t.t === 'num' || t.t === 'ident' || (t.t === 'op' && t.v === '(')) {
        node = { k: 'bin', op: '*', a: node, b: this.parseUnary(), implicit: true };
        continue;
      }

      break;
    }
    return node;
  };

  Parser.prototype.parseUnary = function () {
    if (this.atOp('-')) {
      this.i += 1;
      return { k: 'neg', a: this.parseUnary() };
    }
    if (this.atOp('+')) {
      this.i += 1;
      return this.parseUnary();
    }
    return this.parsePower();
  };

  Parser.prototype.parsePower = function () {
    var base = this.parsePrimary();
    if (this.atOp('^')) {
      this.i += 1;
      /* 指数用 parseUnary：既允许 2^-3，又让 ^ 天然右结合 */
      return { k: 'bin', op: '^', a: base, b: this.parseUnary() };
    }
    return base;
  };

  Parser.prototype.parsePrimary = function () {
    var t = this.peek();
    if (!t) throw new ExprError('表达式不完整：结尾还需要数字、变量或「(」', this.endPos);

    if (t.t === 'num') {
      this.i += 1;
      return { k: 'num', v: t.v };
    }

    if (t.t === 'ident') {
      var name = t.v;

      if (has(CONSTANTS, name)) {
        this.i += 1;
        return { k: 'constant', name: name, v: CONSTANTS[name] };
      }

      var next = this.ts[this.i + 1] || null;
      if (has(FUNCTIONS, name)) {
        if (!next || next.t !== 'op' || next.v !== '(') {
          throw new ExprError('函数「' + name + '」后面需要「(」', t.pos);
        }
        return this.parseCall(t);
      }

      this.i += 1;
      if (name === 'x') return { k: 'var', name: 'x' };
      if (!this.seen[name]) {
        this.seen[name] = true;
        this.vars.push(name);
      }
      return { k: 'var', name: name };
    }

    if (t.t === 'op') {
      if (t.v === '(') {
        this.i += 1;
        if (this.atOp(')')) throw new ExprError('括号内不能为空', this.peek().pos);
        if (!this.peek()) throw new ExprError('括号没有闭合：缺少右括号「)」', this.endPos);
        var inner = this.parseExpr();
        var close = this.peek();
        if (!close || close.t !== 'op' || close.v !== ')') {
          throw new ExprError('缺少右括号「)」', close ? close.pos : this.endPos);
        }
        this.i += 1;
        return inner;
      }
      if (t.v === ')') throw new ExprError('右括号「)」前面还缺少内容', t.pos);
      throw new ExprError('这里需要数字、变量或「(」，却遇到「' + t.v + '」', t.pos);
    }

    throw new ExprError('无法解析的内容「' + t.v + '」', t.pos);
  };

  Parser.prototype.parseCall = function (fnTok) {
    var name = fnTok.v;
    this.i += 2;                       /* 函数名 与 '(' */
    var args = [];

    if (this.atOp(')')) {
      this.i += 1;
    } else {
      for (;;) {
        args.push(this.parseExpr());
        var sep = this.peek();
        if (sep && sep.t === 'op' && sep.v === ',') { this.i += 1; continue; }
        if (sep && sep.t === 'op' && sep.v === ')') { this.i += 1; break; }
        throw new ExprError('函数「' + name + '」的参数后面缺少「,」或「)」',
          sep ? sep.pos : this.endPos);
      }
    }

    this.checkArity(name, args.length, fnTok.pos);
    return { k: 'call', name: name, args: args };
  };

  Parser.prototype.checkArity = function (name, got, pos) {
    var need = ARITY[name];
    if (need === undefined) return;
    if (need === 'min2') {
      if (got < 2) throw new ExprError('函数「' + name + '」至少需要 2 个参数', pos);
      return;
    }
    if (got !== need) {
      throw new ExprError('函数「' + name + '」需要 ' + need + ' 个参数，实际给了 ' + got + ' 个', pos);
    }
  };

  function tokText(t) {
    if (!t) return '';
    return String(t.v);
  }

  function parse(src) {
    var toks = lex(src);
    if (!toks.length) throw new ExprError('表达式不能为空', 0);

    var p = new Parser(toks, src);
    var ast = p.parseExpr();
    if (p.i < toks.length) {
      var t = toks[p.i];
      throw new ExprError('多余的内容「' + tokText(t) + '」', t.pos);
    }
    return { ast: ast, vars: p.vars };
  }

  /* ============================================================
     求值
     ============================================================ */
  function toNum(v) {
    if (typeof v === 'number') return v;
    if (v === undefined || v === null) return NaN;
    return Number(v);
  }

  function evalNode(node, x, params) {
    var k = node.k;

    if (k === 'num') return node.v;
    if (k === 'constant') return node.v;

    if (k === 'var') {
      if (node.name === 'x') return toNum(x);
      if (!params) return NaN;
      var raw = params[node.name];
      return raw === undefined ? NaN : toNum(raw);
    }

    if (k === 'neg') return -evalNode(node.a, x, params);

    if (k === 'bin') {
      var a = evalNode(node.a, x, params);
      var b = evalNode(node.b, x, params);
      var op = node.op;
      if (op === '+') return a + b;
      if (op === '-') return a - b;
      if (op === '*') return a * b;
      if (op === '/') return a / b;                    /* 0/0 → NaN，1/0 → Infinity */
      if (op === '%') return b === 0 ? NaN : a % b;
      if (op === '^') return Math.pow(a, b);
      return NaN;
    }

    if (k === 'call') {
      var args = [];
      for (var i = 0; i < node.args.length; i += 1) {
        args.push(evalNode(node.args[i], x, params));
      }
      var fn = FUNCTIONS[node.name];
      return fn ? fn(args) : NaN;
    }

    return NaN;
  }

  function makeEval(ast) {
    return function (x, params) {
      return evalNode(ast, x, params || null);
    };
  }

  /* ============================================================
     位置换算：pos → 行列（都从 1 开始）
     ============================================================ */
  function posOf(src, pos) {
    var p = pos;
    if (typeof p !== 'number' || !isFinite(p)) p = 0;
    if (p < 0) p = 0;
    if (p > src.length) p = src.length;
    var line = 1;
    var lastBreak = -1;
    for (var i = 0; i < p; i += 1) {
      if (src.charCodeAt(i) === 10) {
        line += 1;
        lastBreak = i;
      }
    }
    return { line: line, col: p - lastBreak };
  }

  /* ============================================================
     编译缓存：按源码字符串缓存，最多 50 条（先进先出淘汰）
     ============================================================ */
  var CACHE_MAX = 50;
  var cache = {};
  var cacheOrder = [];

  function cacheGet(key) {
    var k = '#' + key;
    return has(cache, k) ? cache[k] : null;
  }

  function cachePut(key, value) {
    var k = '#' + key;
    if (!has(cache, k)) {
      cacheOrder.push(k);
      if (cacheOrder.length > CACHE_MAX) {
        delete cache[cacheOrder.shift()];
      }
    }
    cache[k] = value;
  }

  /* ============================================================
     对外：compile
     ============================================================ */
  function compile(src) {
    var key = src == null ? '' : String(src);
    var hit = cacheGet(key);
    if (hit) return hit;

    var result;
    try {
      var parsed = parse(key);
      result = {
        ok: true,
        error: null,
        eval: makeEval(parsed.ast),
        freeVars: parsed.vars.slice(),
        ast: parsed.ast
      };
    } catch (err) {
      var message = (err && err.message) ? err.message : '表达式有误';
      var pos = (err && typeof err.pos === 'number') ? err.pos : 0;
      var at = posOf(key, pos);
      result = {
        ok: false,
        error: { message: message, line: at.line, col: at.col, pos: pos },
        eval: function () { return NaN; },
        freeVars: [],
        ast: null
      };
    }

    cachePut(key, result);
    return result;
  }

  var expr = (SL.math.expr = SL.math.expr || {});
  expr.compile = compile;
  expr.FUNCTIONS = FUNCTIONS;
  expr.CONSTANTS = CONSTANTS;
})();
