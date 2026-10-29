/* 表格公式引擎：仿 Excel 的 A1 引用、区域、四则运算与常用函数
   —— 记录单的「汇总行」和「计算列」都用它求值，纯前端、无依赖。 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  var ERR = {
    REF: '#REF!',
    DIV: '#DIV/0!',
    NAME: '#NAME?',
    VALUE: '#VALUE!',
    NUM: '#NUM!',
    SYNTAX: '#SYNTAX!'
  };

  function FormulaError(code) { this.code = code; }
  FormulaError.prototype.toString = function () { return this.code; };

  /* ---------- 列字母：0 → A，25 → Z，26 → AA ---------- */
  function colLetter(index) {
    var n = Math.max(0, Math.floor(index));
    var s = '';
    do {
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
  }

  function colIndex(letters) {
    var s = String(letters || '').toUpperCase().replace(/\$/g, '');
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (code < 65 || code > 90) return -1;
      n = n * 26 + (code - 64);
    }
    return n - 1;
  }

  /* ---------- 词法 ---------- */
  function tokenize(src) {
    var s = String(src == null ? '' : src).replace(/^\s*=/, '');
    var out = [];
    var i = 0;
    var n = s.length;
    while (i < n) {
      var ch = s[i];
      if (/\s/.test(ch)) { i += 1; continue; }

      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(s[i + 1] || ''))) {
        var j = i;
        while (j < n && /[0-9.]/.test(s[j])) j += 1;
        if (/[eE]/.test(s[j] || '') && /[0-9+-]/.test(s[j + 1] || '')) {
          j += 1;
          if (/[+-]/.test(s[j] || '')) j += 1;
          while (j < n && /[0-9]/.test(s[j])) j += 1;
        }
        out.push({ t: 'num', v: parseFloat(s.slice(i, j)) });
        i = j;
        continue;
      }

      if (ch === '"' || ch === "'") {
        var q = ch;
        var k = i + 1;
        var buf = '';
        while (k < n && s[k] !== q) { buf += s[k]; k += 1; }
        out.push({ t: 'str', v: buf });
        i = k + 1;
        continue;
      }

      var two = s.substr(i, 2);
      if (two === '<=' || two === '>=' || two === '<>' || two === '!=') {
        out.push({ t: 'op', v: two === '!=' ? '<>' : two });
        i += 2;
        continue;
      }
      if ('+-*/^%(),=<>:&'.indexOf(ch) >= 0) {
        out.push({ t: 'op', v: ch });
        i += 1;
        continue;
      }

      if (/[A-Za-z_$\u4e00-\u9fa5]/.test(ch)) {
        var m = i;
        while (m < n && /[A-Za-z0-9_$.\u4e00-\u9fa5]/.test(s[m])) m += 1;
        var word = s.slice(i, m);
        var bare = word.replace(/\$/g, '');
        /* $C$2 里的 $ 只表示绝对引用，这里直接忽略 */
        var ref = /^([A-Za-z]{1,3})([0-9]{1,6})$/.exec(bare);
        if (ref) {
          out.push({ t: 'ref', col: colIndex(ref[1]), row: parseInt(ref[2], 10) });
        } else {
          out.push({ t: 'name', v: bare });
        }
        i = m;
        continue;
      }

      throw new FormulaError(ERR.SYNTAX);
    }
    return out;
  }

  /* ---------- 语法：递归下降 ---------- */
  function Parser(tokens) {
    this.ts = tokens;
    this.i = 0;
  }
  Parser.prototype.peek = function () { return this.ts[this.i] || null; };
  Parser.prototype.next = function () { return this.ts[this.i++] || null; };
  Parser.prototype.isOp = function (v) {
    var t = this.peek();
    return !!t && t.t === 'op' && t.v === v;
  };
  Parser.prototype.eat = function (v) {
    if (this.isOp(v)) { this.i += 1; return true; }
    return false;
  };
  Parser.prototype.expect = function (v) {
    if (!this.eat(v)) throw new FormulaError(ERR.SYNTAX);
  };

  Parser.prototype.parse = function () {
    var node = this.compare();
    if (this.i < this.ts.length) throw new FormulaError(ERR.SYNTAX);
    return node;
  };

  var CMP = ['=', '<>', '<', '>', '<=', '>='];

  Parser.prototype.compare = function () {
    var left = this.additive();
    while (this.peek() && this.peek().t === 'op' && CMP.indexOf(this.peek().v) >= 0) {
      var op = this.next().v;
      var right = this.additive();
      left = { k: 'bin', op: op, a: left, b: right };
    }
    return left;
  };

  Parser.prototype.additive = function () {
    var left = this.term();
    while (this.isOp('+') || this.isOp('-')) {
      var op = this.next().v;
      left = { k: 'bin', op: op, a: left, b: this.term() };
    }
    return left;
  };

  Parser.prototype.term = function () {
    var left = this.power();
    while (this.isOp('*') || this.isOp('/')) {
      var op = this.next().v;
      left = { k: 'bin', op: op, a: left, b: this.power() };
    }
    return left;
  };

  Parser.prototype.power = function () {
    var left = this.unary();
    while (this.isOp('^')) {
      this.next();
      left = { k: 'bin', op: '^', a: left, b: this.unary() };
    }
    return left;
  };

  Parser.prototype.unary = function () {
    if (this.isOp('-')) { this.next(); return { k: 'neg', a: this.unary() }; }
    if (this.isOp('+')) { this.next(); return this.unary(); }
    var node = this.primary();
    while (this.isOp('%')) { this.next(); node = { k: 'pct', a: node }; }
    return node;
  };

  Parser.prototype.primary = function () {
    var t = this.peek();
    if (!t) throw new FormulaError(ERR.SYNTAX);

    if (t.t === 'num') { this.next(); return { k: 'num', v: t.v }; }
    if (t.t === 'str') { this.next(); return { k: 'str', v: t.v }; }

    if (t.t === 'ref') {
      this.next();
      if (this.isOp(':')) {
        this.next();
        var to = this.next();
        if (!to || to.t !== 'ref') throw new FormulaError(ERR.REF);
        return { k: 'range', a: { col: t.col, row: t.row }, b: { col: to.col, row: to.row } };
      }
      return { k: 'ref', col: t.col, row: t.row };
    }

    if (t.t === 'name') {
      this.next();
      if (this.isOp('(')) {
        this.next();
        var args = [];
        if (!this.isOp(')')) {
          do {
            args.push(this.compare());
          } while (this.eat(','));
        }
        this.expect(')');
        return { k: 'call', name: t.v.toUpperCase(), args: args };
      }
      return { k: 'name', v: t.v };
    }

    if (t.t === 'op' && t.v === '(') {
      this.next();
      var inner = this.compare();
      this.expect(')');
      return inner;
    }

    throw new FormulaError(ERR.SYNTAX);
  };

  /* ---------- 取值 ---------- */
  function normalize(raw) {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    if (typeof raw === 'boolean') return raw ? 1 : 0;
    var str = String(raw).trim();
    if (str === '') return null;
    if (str.indexOf(',') < 0 && /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(str)) return parseFloat(str);
    return str;
  }

  function toNumber(v) {
    if (v == null) return 0;
    if (v && v.__range) throw new FormulaError(ERR.VALUE);
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    var num = parseFloat(String(v).replace(/,/g, ''));
    if (isNaN(num)) throw new FormulaError(ERR.VALUE);
    return num;
  }

  function toText(v) {
    if (v == null) return '';
    if (v && v.__range) throw new FormulaError(ERR.VALUE);
    return String(v);
  }

  function makeContext(columns, rows, fillRow) {
    return {
      columns: columns || [],
      rows: rows || [],
      fillRow: fillRow || 0,
      cell: function (colIdx, rowNum) {
        var r = rowNum;
        if (this.fillRow && r >= 1) r = r + this.fillRow - 1;
        var row = this.rows[r - 1];
        if (!row) return null;
        var col = this.columns[colIdx];
        if (!col) throw new FormulaError(ERR.REF);
        return normalize(row[col.key]);
      }
    };
  }

  function flatten(list) {
    var out = [];
    list.forEach(function (a) {
      if (a && a.__range) {
        a.values.forEach(function (v) { out.push(v); });
      } else {
        out.push(a);
      }
    });
    return out;
  }

  function numbersOf(list) {
    var out = [];
    flatten(list).forEach(function (v) {
      if (v == null) return;
      if (typeof v === 'number') { out.push(v); return; }
      var n = parseFloat(String(v).replace(/,/g, ''));
      if (!isNaN(n)) out.push(n);
    });
    return out;
  }

  function sumOf(list) {
    return numbersOf(list).reduce(function (a, b) { return a + b; }, 0);
  }

  function roundTo(value, digits) {
    var d = Math.max(0, Math.min(10, Math.floor(digits || 0)));
    var p = Math.pow(10, d);
    return Math.round((value + (value >= 0 ? 1e-12 : -1e-12)) * p) / p;
  }

  /* COUNTIF / SUMIF 的条件：">3"、"<=0.5"、"10" 这类 */
  function matchCriteria(value, criteria) {
    var crit = criteria;
    if (crit && crit.__range) crit = crit.values[0];
    if (typeof crit === 'number') return toNumber(value) === crit;
    var text = String(crit == null ? '' : crit).trim();
    var m = /^(<=|>=|<>|<|>|=)\s*(.*)$/.exec(text);
    if (!m) return toText(value) === text;
    var op = m[1];
    var target = m[2];
    var tn = parseFloat(target);
    var vn = value == null || value === '' ? null : parseFloat(value);
    var numeric = !isNaN(tn) && vn != null && !isNaN(vn);
    if (op === '=') return numeric ? vn === tn : toText(value) === target;
    if (op === '<>') return numeric ? vn !== tn : toText(value) !== target;
    if (!numeric) return false;
    if (op === '<') return vn < tn;
    if (op === '>') return vn > tn;
    if (op === '<=') return vn <= tn;
    return vn >= tn;
  }

  /* ---------- 函数表 ---------- */
  var FUNCS = {
    SUM: function (a) { return sumOf(a); },
    AVERAGE: function (a) {
      var list = numbersOf(a);
      if (!list.length) throw new FormulaError(ERR.DIV);
      return sumOf(a) / list.length;
    },
    AVG: function (a) { return FUNCS.AVERAGE(a); },
    MAX: function (a) {
      var list = numbersOf(a);
      return list.length ? Math.max.apply(null, list) : 0;
    },
    MIN: function (a) {
      var list = numbersOf(a);
      return list.length ? Math.min.apply(null, list) : 0;
    },
    COUNT: function (a) { return numbersOf(a).length; },
    COUNTA: function (a) {
      return flatten(a).filter(function (v) { return v != null && v !== ''; }).length;
    },
    MEDIAN: function (a) {
      var list = numbersOf(a).sort(function (x, y) { return x - y; });
      if (!list.length) throw new FormulaError(ERR.NUM);
      var mid = Math.floor(list.length / 2);
      return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
    },
    STDEV: function (a) {
      var list = numbersOf(a);
      if (list.length < 2) throw new FormulaError(ERR.DIV);
      var mean = sumOf(a) / list.length;
      var sq = list.reduce(function (acc, v) { return acc + Math.pow(v - mean, 2); }, 0);
      return Math.sqrt(sq / (list.length - 1));
    },
    ROUND: function (a) { return roundTo(toNumber(a[0]), a.length > 1 ? toNumber(a[1]) : 0); },
    ROUNDUP: function (a) {
      var d = a.length > 1 ? toNumber(a[1]) : 0;
      var p = Math.pow(10, Math.max(0, Math.min(10, d)));
      var v = toNumber(a[0]) * p;
      return (v >= 0 ? Math.ceil(v - 1e-9) : Math.floor(v + 1e-9)) / p;
    },
    ROUNDDOWN: function (a) {
      var d = a.length > 1 ? toNumber(a[1]) : 0;
      var p = Math.pow(10, Math.max(0, Math.min(10, d)));
      var v = toNumber(a[0]) * p;
      return (v >= 0 ? Math.floor(v + 1e-9) : Math.ceil(v - 1e-9)) / p;
    },
    ABS: function (a) { return Math.abs(toNumber(a[0])); },
    SQRT: function (a) {
      var v = toNumber(a[0]);
      if (v < 0) throw new FormulaError(ERR.NUM);
      return Math.sqrt(v);
    },
    POWER: function (a) { return Math.pow(toNumber(a[0]), toNumber(a[1])); },
    MOD: function (a) {
      var d = toNumber(a[1]);
      if (!d) throw new FormulaError(ERR.DIV);
      return toNumber(a[0]) % d;
    },
    INT: function (a) { return Math.floor(toNumber(a[0])); },
    SIGN: function (a) { return Math.sign(toNumber(a[0])); },
    PI: function () { return Math.PI; },
    AND: function (a) { return numbersOf(a).every(function (v) { return !!v; }) ? 1 : 0; },
    OR: function (a) { return numbersOf(a).some(function (v) { return !!v; }) ? 1 : 0; },
    NOT: function (a) { return toNumber(a[0]) ? 0 : 1; },
    COUNTIF: function (a) {
      var values = a[0] && a[0].__range ? a[0].values : [a[0]];
      var crit = a[1];
      return values.filter(function (v) { return matchCriteria(v, crit); }).length;
    },
    SUMIF: function (a) {
      var values = a[0] && a[0].__range ? a[0].values : [a[0]];
      var crit = a[1];
      var sums = a[2] && a[2].__range ? a[2].values : null;
      var total = 0;
      values.forEach(function (v, i) {
        if (!matchCriteria(v, crit)) return;
        var target = sums ? sums[i] : v;
        if (target == null || target === '') return;
        var n = parseFloat(target);
        if (!isNaN(n)) total += n;
      });
      return total;
    }
  };

  var LAZY = { IF: true, IFERROR: true, AND: true, OR: true };

  function evalNode(node, ctx) {
    switch (node.k) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'ref': return ctx.cell(node.col, node.row);
      case 'range': {
        var c1 = Math.min(node.a.col, node.b.col);
        var c2 = Math.max(node.a.col, node.b.col);
        var r1 = Math.min(node.a.row, node.b.row);
        var r2 = Math.max(node.a.row, node.b.row);
        if (c2 - c1 > 40 || r2 - r1 > 2000) throw new FormulaError(ERR.REF);
        var values = [];
        for (var r = r1; r <= r2; r++) {
          for (var c = c1; c <= c2; c++) values.push(ctx.cell(c, r));
        }
        return { __range: true, values: values };
      }
      case 'name': {
        var up = node.v.toUpperCase();
        if (up === 'PI') return Math.PI;
        if (up === 'TRUE') return 1;
        if (up === 'FALSE') return 0;
        throw new FormulaError(ERR.NAME);
      }
      case 'neg': return -toNumber(evalNode(node.a, ctx));
      case 'pct': return toNumber(evalNode(node.a, ctx)) / 100;
      case 'bin': return binary(node.op, node.a, node.b, ctx);
      case 'call': return callFunc(node, ctx);
      default: throw new FormulaError(ERR.SYNTAX);
    }
  }

  function binary(op, aNode, bNode, ctx) {
    if (op === '&') return toText(evalNode(aNode, ctx)) + toText(evalNode(bNode, ctx));
    var a = evalNode(aNode, ctx);
    var b = evalNode(bNode, ctx);
    if (op === '+' || op === '-' || op === '*' || op === '/' || op === '^') {
      var x = toNumber(a);
      var y = toNumber(b);
      if (op === '/') {
        if (y === 0) throw new FormulaError(ERR.DIV);
        return x / y;
      }
      if (op === '^') return Math.pow(x, y);
      return op === '+' ? x + y : op === '-' ? x - y : x * y;
    }
    /* 比较：两边都是数字就按数字比，否则按文字比 */
    var an = a == null ? null : typeof a === 'number' ? a : parseFloat(a);
    var bn = b == null ? null : typeof b === 'number' ? b : parseFloat(b);
    var numeric = an != null && bn != null && !isNaN(an) && !isNaN(bn);
    var left = numeric ? an : toText(a);
    var right = numeric ? bn : toText(b);
    switch (op) {
      case '=': return left === right ? 1 : 0;
      case '<>': return left !== right ? 1 : 0;
      case '<': return left < right ? 1 : 0;
      case '>': return left > right ? 1 : 0;
      case '<=': return left <= right ? 1 : 0;
      case '>=': return left >= right ? 1 : 0;
      default: throw new FormulaError(ERR.SYNTAX);
    }
  }

  function callFunc(node, ctx) {
    var name = node.name;
    if (name === 'IF') {
      var cond = toNumber(evalNode(node.args[0], ctx));
      if (cond) return node.args[1] ? evalNode(node.args[1], ctx) : 1;
      return node.args[2] ? evalNode(node.args[2], ctx) : 0;
    }
    if (name === 'IFERROR') {
      try {
        return evalNode(node.args[0], ctx);
      } catch (e) {
        return node.args[1] ? evalNode(node.args[1], ctx) : 0;
      }
    }
    var fn = FUNCS[name];
    if (!fn) throw new FormulaError(ERR.NAME);
    var args = node.args.map(function (arg) { return evalNode(arg, ctx); });
    return fn(args, ctx);
  }

  /* ---------- 解析缓存 ---------- */
  var cache = {};
  function parseFormula(src) {
    var key = String(src == null ? '' : src);
    if (cache[key]) return cache[key];
    var ast = new Parser(tokenize(key)).parse();
    if (Object.keys(cache).length > 200) cache = {};
    cache[key] = ast;
    return ast;
  }

  function evaluate(src, ctx) {
    if (src == null || String(src).trim() === '' || String(src).trim() === '=') {
      return { ok: false, error: ERR.SYNTAX };
    }
    try {
      var ast = parseFormula(src);
      var value = evalNode(ast, ctx);
      if (value && value.__range) {
        var first = value.values.filter(function (v) { return v != null; })[0];
        value = first == null ? 0 : first;
      }
      if (value == null) value = 0;
      if (typeof value === 'number') {
        if (!isFinite(value)) throw new FormulaError(ERR.NUM);
        return { ok: true, value: value, numeric: true };
      }
      /* 文字结果（例如 IF 返回「偏大」）原样保留 */
      var text = String(value);
      var num = parseFloat(text);
      if (text.trim() !== '' && !isNaN(num) && isFinite(num)) {
        return { ok: true, value: num, numeric: true };
      }
      return { ok: true, value: text, numeric: false };
    } catch (e) {
      return { ok: false, error: e instanceof FormulaError ? e.code : ERR.SYNTAX };
    }
  }

  SL.formula = {
    ERR: ERR,
    colLetter: colLetter,
    colIndex: colIndex,
    context: makeContext,
    evaluate: function (src, columns, rows, fillRow) {
      return evaluate(src, makeContext(columns, rows, fillRow));
    },
    /* 便捷版：直接拿 lab.meta 的 columns + 记录行 */
    evaluateLab: function (src, columns, rows, fillRow) {
      return evaluate(src, makeContext(columns, rows, fillRow));
    }
  };
})();
