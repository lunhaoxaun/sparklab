/* 实验记录单：本地存储、动态表格、公式计算（汇总行 / 计算列）、CSV 导出、打印 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  function readAll() {
    var data = SL.storage.get(SL.KEYS.records, {});
    return data && typeof data === 'object' ? data : {};
  }

  function writeAll(data) { SL.storage.set(SL.KEYS.records, data); }

  function numeric(value) {
    var n = parseFloat(value);
    return isNaN(n) ? null : n;
  }

  function avgIndex(lab) {
    var idx = -1;
    (lab.columns || []).forEach(function (col, i) {
      if (col.key === lab.averageField) idx = i;
    });
    return idx;
  }

  /* ---------- 公式条目：读写 + 清洗 ---------- */
  function readCalc() {
    var data = SL.storage.get(SL.KEYS.calc, {});
    return data && typeof data === 'object' ? data : {};
  }

  function cleanItem(item, withCol) {
    if (!item || typeof item !== 'object') return null;
    var formula = String(item.formula || '').slice(0, 200).trim();
    if (!formula) return null;
    var out = {
      id: String(item.id || ('c' + Math.random().toString(36).slice(2, 7))),
      label: String(item.label || '计算').slice(0, 24),
      formula: formula
    };
    if (withCol) {
      out.col = String(item.col || '');
    } else {
      var dg = parseInt(item.digits, 10);
      out.digits = isNaN(dg) ? 2 : Math.max(0, Math.min(4, dg));
    }
    return out;
  }

  function emptyCalc() { return { rows: [], cols: [] }; }

  var calcStore = {
    /* 读出某实验的公式配置（永远是干净的结构） */
    get: function (labId) {
      var all = readCalc();
      var item = all[labId];
      if (!item || typeof item !== 'object') return emptyCalc();
      return {
        rows: (Array.isArray(item.rows) ? item.rows : []).map(function (r) { return cleanItem(r, true); }).filter(Boolean).slice(0, 8),
        cols: (Array.isArray(item.cols) ? item.cols : []).map(function (c) { return cleanItem(c, false); }).filter(Boolean).slice(0, 4)
      };
    },
    set: function (labId, calc) {
      var all = readCalc();
      all[labId] = {
        rows: (calc && calc.rows ? calc.rows : []).slice(0, 8),
        cols: (calc && calc.cols ? calc.cols : []).slice(0, 4)
      };
      SL.storage.set(SL.KEYS.calc, all);
      return all[labId];
    },
    clear: function (labId) {
      var all = readCalc();
      delete all[labId];
      SL.storage.set(SL.KEYS.calc, all);
    }
  };

  /* ---------- 表格结构 ---------- */
  /* 基础列 + 计算列 → 渲染用的列定义 */
  function buildColumns(lab, calc) {
    var base = lab.columns || [];
    var cols = base.map(function (col) {
      return { key: col.key, label: col.label, digits: col.digits, computed: false };
    });
    ((calc && calc.cols) || []).forEach(function (item) {
      cols.push({
        key: '__calc_' + item.id,
        label: item.label,
        digits: item.digits,
        computed: true,
        formula: item.formula,
        calcId: item.id
      });
    });
    return { cols: cols, base: base };
  }

  function evalCell(formula, base, rows, fillRow) {
    return SL.formula.evaluate(formula, base, rows, fillRow || 0);
  }

  function formatResult(res, digits) {
    if (!res.ok) return { text: res.error, error: true };
    if (res.numeric === false) return { text: String(res.value), error: false };
    return { text: SL.fmt(res.value, digits == null ? 2 : digits), error: false };
  }

  function cellHtml(col, row, index, base, rows) {
    if (!col.computed) {
      var raw = row[col.key];
      if (raw == null || raw === '') return '<td>—</td>';
      if (col.digits != null && !isNaN(raw)) return '<td class="num">' + SL.fmt(raw, col.digits) + '</td>';
      return '<td>' + SL.escape(raw) + '</td>';
    }
    var res = evalCell(col.formula, base, rows, index + 1);
    var out = formatResult(res, col.digits);
    return '<td class="num cell-calc' + (out.error ? ' is-error' : '') + '">' + SL.escape(out.text) + '</td>';
  }

  /* 平均值行：数值落在对应的数值列下方，列数与表头一致 */
  function avgCells(cols, lab, avg, tag) {
    var idx = avgIndex(lab);
    if (avg == null || idx < 0) return [];
    var cells = [];
    if (idx > 0) {
      cells.push('<td colspan="' + idx + '"' + (tag ? ' class="avg-label"' : '') + '>平均值</td>');
    }
    for (var i = idx; i < cols.length; i++) {
      if (i === idx) cells.push('<td class="num avg-value">' + SL.fmt(avg, cols[i].digits == null ? 1 : cols[i].digits) + '</td>');
      else cells.push('<td></td>');
    }
    return cells;
  }

  function tailCells(showTime, canDelete, actHtml) {
    var out = showTime ? '<td class="col-time"></td>' : '';
    if (canDelete) out += '<td class="col-act">' + (actHtml || '') + '</td>';
    return out;
  }

  var records = {
    get: function (labId) {
      var all = readAll();
      return Array.isArray(all[labId]) ? all[labId] : [];
    },
    add: function (labId, row) {
      var all = readAll();
      if (!Array.isArray(all[labId])) all[labId] = [];
      row._time = row._time || SL.now();
      row._date = row._date || SL.today();
      all[labId].push(row);
      writeAll(all);
      return row;
    },
    clear: function (labId) {
      var all = readAll();
      all[labId] = [];
      writeAll(all);
    },
    /* 整表覆盖写（删除单行用） */
    replace: function (labId, rows) {
      var all = readAll();
      all[labId] = Array.isArray(rows) ? rows : [];
      writeAll(all);
      return all[labId];
    },
    count: function (labId) {
      var all = readAll();
      return Array.isArray(all[labId]) ? all[labId].length : 0;
    },
    countAll: function () {
      var all = readAll();
      return Object.keys(all).reduce(function (sum, id) {
        return sum + (Array.isArray(all[id]) ? all[id].length : 0);
      }, 0);
    },
    average: function (lab, rows) {
      if (!lab.averageField) return null;
      var values = rows.map(function (row) { return numeric(row[lab.averageField]); }).filter(function (v) { return v != null; });
      if (!values.length) return null;
      return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    },

    /* ---------- 公式配置 ---------- */
    calc: calcStore,
    columnsOf: function (lab, calc) { return buildColumns(lab, calc).cols; },
    evaluate: function (formula, lab, rows, fillRow) {
      return evalCell(formula, lab.columns || [], rows, fillRow);
    },

    renderTable: function (host, lab, rows, opts) {
      opts = opts || {};
      var calc = opts.calc || null;
      var canDelete = typeof opts.onDelete === 'function';
      var showTime = !opts.compact;
      var letters = opts.letters !== false;
      var built = buildColumns(lab, calc);
      var cols = built.cols;
      var base = built.base;

      if (!rows.length) {
        host.innerHTML = '<div class="empty-note">' + SL.icon('chart-line', 'empty-icon', 22) +
          '<p>还没有数据<br><span class="muted">' +
          (lab.kind === 'sim' ? '调好参数、读数稳定后，点击「记录当前数据」。' : '接线通电后，点击「记录当前数据」。') +
          '</span></p></div>';
        return;
      }

      var head = cols.map(function (col, i) {
        var tag = letters ? '<span class="th-letter">' + SL.formula.colLetter(i) + '</span>' : '';
        if (col.computed) {
          var del = (typeof opts.onDeleteCalc === 'function')
            ? '<button type="button" class="th-del" data-calc-del="' + SL.escape(col.calcId) +
              '" title="删除计算列「' + SL.escape(col.label) + '」" aria-label="删除计算列">' + SL.icon('x', '', 10) + '</button>'
            : '';
          return '<th class="th-calc" title="计算列：' + SL.escape(col.formula) + '">' +
            tag + '<span class="th-label">' + SL.escape(col.label) + '</span>' + del + '</th>';
        }
        return '<th>' + tag + '<span class="th-label">' + SL.escape(col.label) + '</span></th>';
      }).join('') +
        (showTime ? '<th class="col-time">时间</th>' : '') +
        (canDelete ? '<th class="col-act"><span class="sr-only">删除</span></th>' : '');

      var body = rows.map(function (row, index) {
        var tds = cols.map(function (col) { return cellHtml(col, row, index, base, rows); }).join('');
        var isNew = opts.highlight === index;
        return '<tr' + (isNew ? ' class="is-new"' : '') + '>' + tds +
          (showTime ? '<td class="col-time muted">' + SL.escape(row._time || '') + '</td>' : '') +
          (canDelete
            ? '<td class="col-act"><button type="button" class="row-del" data-row="' + index + '" title="删除第 ' + (index + 1) + ' 行" aria-label="删除第 ' + (index + 1) + ' 行">' +
              SL.icon('x', '', 12) + '</button></td>'
            : '') +
          '</tr>';
      }).join('');

      /* 表尾：平均值行 + 自定公式行 */
      var foot = [];
      var avg = this.average(lab, rows);
      var avgRow = avgCells(cols, lab, avg, true);
      if (avgRow.length) {
        foot.push('<tr class="foot-avg">' + avgRow.join('') + tailCells(showTime, canDelete) + '</tr>');
      }

      var onDeleteCalc = typeof opts.onDeleteCalc === 'function';
      ((calc && calc.rows) || []).forEach(function (item) {
        var idx = -1;
        cols.forEach(function (col, i) { if (col.key === item.col) idx = i; });
        if (idx < 1) idx = Math.min(1, cols.length - 1);
        var res = evalCell(item.formula, base, rows, 0);
        var out = formatResult(res, cols[idx] ? cols[idx].digits : 2);
        var cells = [];
        /* 目标列靠右时才有空间展示公式原文，否则只留一个 ƒx 标记 */
        var expr = idx >= 2
          ? '<span class="calc-expr" title="' + SL.escape(item.formula) + '">' + SL.escape(item.formula) + '</span>'
          : '<span class="calc-mark" title="' + SL.escape(item.formula) + '">ƒx</span>';
        cells.push('<td colspan="' + idx + '" class="calc-label" title="' + SL.escape(item.label + ' ' + item.formula) + '"' +
          (typeof opts.onEditCalc === 'function' ? ' data-calc-id="' + SL.escape(item.id) + '"' : '') +
          '>' + SL.escape(item.label) + expr + '</td>');
        cells.push('<td class="num calc-value' + (out.error ? ' is-error' : '') + '">' + SL.escape(out.text) + '</td>');
        for (var i = idx + 1; i < cols.length; i++) cells.push('<td></td>');
        var act = onDeleteCalc
          ? '<button type="button" class="row-del calc-del" data-calc-del="' + SL.escape(item.id) + '" title="删除这一行计算" aria-label="删除计算行">' + SL.icon('x', '', 12) + '</button>'
          : '';
        foot.push('<tr class="foot-calc">' + cells.join('') + tailCells(showTime, canDelete, act) + '</tr>');
      });

      host.innerHTML = '<div class="table-wrap"><table class="record-table">' +
        '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody>' +
        (foot.length ? '<tfoot>' + foot.join('') + '</tfoot>' : '') +
        '</table></div>';

      if (canDelete) {
        SL.$$('.row-del[data-row]', host).forEach(function (btn) {
          btn.addEventListener('click', function () {
            opts.onDelete(Number(btn.getAttribute('data-row')));
          });
        });
      }
      if (onDeleteCalc) {
        SL.$$('[data-calc-del]', host).forEach(function (btn) {
          btn.addEventListener('click', function () {
            opts.onDeleteCalc(btn.getAttribute('data-calc-del'));
          });
        });
      }
      if (typeof opts.onEditCalc === 'function') {
        SL.$$('[data-calc-id]', host).forEach(function (cell) {
          cell.addEventListener('click', function () {
            opts.onEditCalc(cell.getAttribute('data-calc-id'));
          });
        });
      }
    },

    exportCSV: function (lab, rows, calc) {
      if (!rows.length) {
        SL.toast('还没有数据可以导出', 'warn');
        return;
      }
      var built = buildColumns(lab, calc);
      var cols = built.cols;
      var base = built.base;
      var lines = [];
      lines.push('实验,' + lab.name);
      lines.push('导出时间,' + SL.today() + ' ' + SL.now());
      lines.push('');
      lines.push(cols.map(function (c) { return '"' + c.label + '"'; }).join(',') + ',"时间"');
      rows.forEach(function (row, index) {
        var cells = cols.map(function (col) {
          if (col.computed) {
            var res = evalCell(col.formula, base, rows, index + 1);
            if (!res.ok) return '"' + res.error + '"';
            if (res.numeric === false) return '"' + String(res.value).replace(/"/g, '""') + '"';
            return Number(res.value).toFixed(col.digits == null ? 2 : col.digits);
          }
          var v = row[col.key];
          if (v == null) return '""';
          if (col.digits != null && !isNaN(v)) return Number(v).toFixed(col.digits);
          return '"' + String(v).replace(/"/g, '""') + '"';
        });
        cells.push('"' + (row._time || '') + '"');
        lines.push(cells.join(','));
      });
      var avg = this.average(lab, rows);
      if (avg != null && lab.averageField) {
        var avgLine = cols.map(function (col, i) {
          return col.key === lab.averageField ? avg.toFixed(col.digits == null ? 2 : col.digits) : '';
        });
        avgLine[0] = '平均值';
        avgLine.push('');
        lines.push(avgLine.join(','));
      }
      ((calc && calc.rows) || []).forEach(function (item) {
        var res = evalCell(item.formula, base, rows, 0);
        var line = cols.map(function (col) {
          return col.key === item.col ? (res.ok ? res.value : res.error) : '';
        });
        line[0] = item.label;
        line.push('');
        lines.push(line.join(','));
      });
      SL.download('实验记录_' + lab.name + '_' + SL.today() + '.csv', '\uFEFF' + lines.join('\r\n'), 'text/csv;charset=utf-8');
      SL.sound.play('record');
      SL.toast('已导出 CSV，可用 Excel 打开', 'ok');
    },

    print: function (lab, rows, answers, calc) {
      var built = buildColumns(lab, calc);
      var cols = built.cols;
      var base = built.base;
      var header = cols.map(function (c) { return '<th>' + SL.escape(c.label) + '</th>'; }).join('') + '<th>时间</th>';
      var body = '';
      if (rows.length) {
        body = rows.map(function (row, index) {
          var tds = cols.map(function (col) {
            if (col.computed) {
              var res = evalCell(col.formula, base, rows, index + 1);
              var out = formatResult(res, col.digits);
              return '<td>' + SL.escape(out.text) + '</td>';
            }
            var v = row[col.key];
            if (v == null || v === '') return '<td>—</td>';
            if (col.digits != null && !isNaN(v)) return '<td>' + SL.fmt(v, col.digits) + '</td>';
            return '<td>' + SL.escape(v) + '</td>';
          }).join('');
          return '<tr>' + tds + '<td>' + SL.escape(row._time || '') + '</td></tr>';
        }).join('');
      }
      var avg = this.average(lab, rows);
      var avgRowCells = avgCells(cols, lab, avg, false);
      var footRows = '';
      if (avgRowCells.length) footRows += '<tr>' + avgRowCells.join('') + '<td></td></tr>';
      ((calc && calc.rows) || []).forEach(function (item) {
        var idx = -1;
        cols.forEach(function (col, i) { if (col.key === item.col) idx = i; });
        if (idx < 1) idx = Math.min(1, cols.length - 1);
        var res = evalCell(item.formula, base, rows, 0);
        var out = formatResult(res, cols[idx] ? cols[idx].digits : 2);
        var cells = ['<td colspan="' + idx + '">' + SL.escape(item.label) + '</td>', '<td>' + SL.escape(out.text) + '</td>'];
        for (var i = idx + 1; i < cols.length; i++) cells.push('<td></td>');
        footRows += '<tr>' + cells.join('') + '<td></td></tr>';
      });
      var conclusionHtml = '';
      if (lab.conclusions && lab.conclusions.length) {
        conclusionHtml = '<h3>实验结论</h3><ol class="print-conclusions">' + lab.conclusions.map(function (q) {
          var ans = answers && answers[q.id] ? answers[q.id] : '（未填写）';
          return '<li>' + SL.escape(q.label) + ' <strong>' + SL.escape(ans) + '</strong> ' + SL.escape(q.suffix) + '</li>';
        }).join('') + '</ol>';
      }
      var sheet = SL.el('div', { class: 'print-sheet' });
      sheet.innerHTML = '<h1>' + SL.escape(lab.name) + '</h1>' +
        '<p class="print-meta">实验记录单 · ' + SL.today() + '</p>' +
        '<table class="print-table"><thead><tr>' + header + '</tr></thead><tbody>' +
        (body || '<tr><td colspan="' + (cols.length + 1) + '">暂无数据</td></tr>') + '</tbody>' +
        (footRows ? '<tfoot>' + footRows + '</tfoot>' : '') + '</table>' +
        conclusionHtml;
      document.body.appendChild(sheet);
      document.body.classList.add('printing');
      var cleanup = function () {
        document.body.classList.remove('printing');
        sheet.remove();
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
      window.setTimeout(cleanup, 1200);
    }
  };

  SL.records = records;
})();
