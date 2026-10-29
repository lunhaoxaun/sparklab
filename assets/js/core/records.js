/* 实验记录单：本地存储、动态表格、平均值、CSV 导出、打印 */
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

  /* 平均值行：数值落在对应的数值列下方，列数与表头一致 */
  function avgCells(lab, avg, tag) {
    var idx = avgIndex(lab);
    if (avg == null || idx < 0) return [];
    var cells = [];
    if (idx > 0) {
      cells.push('<td colspan="' + idx + '"' + (tag ? ' class="avg-label"' : '') + '>平均值</td>');
    }
    (lab.columns || []).forEach(function (col, i) {
      if (i < idx) return;
      if (i === idx) cells.push('<td class="num avg-value">' + SL.fmt(avg, 1) + '</td>');
      else cells.push('<td></td>');
    });
    return cells;
  }

  function avgFooter(lab, avg) {
    var cells = avgCells(lab, avg, true);
    if (!cells.length) return '';
    return '<tfoot><tr>' + cells.join('') + '<td class="col-time"></td></tr></tfoot>';
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
    renderTable: function (host, lab, rows) {
      if (!rows.length) {
        host.innerHTML = '<div class="empty-note">' + SL.icon('chart-line', 'empty-icon', 22) +
          '<p>还没有数据<br><span class="muted">' +
          (lab.kind === 'sim' ? '调好参数、读数稳定后，点击「记录当前数据」。' : '接线通电后，点击「记录当前数据」。') +
          '</span></p></div>';
        return;
      }
      var head = lab.columns.map(function (col) { return '<th>' + col.label + '</th>'; }).join('') + '<th class="col-time">时间</th>';
      var body = rows.map(function (row, index) {
        var tds = lab.columns.map(function (col) {
          var raw = row[col.key];
          if (raw == null || raw === '') return '<td>—</td>';
          if (col.digits != null && !isNaN(raw)) return '<td class="num">' + SL.fmt(raw, col.digits) + '</td>';
          return '<td>' + SL.escape(raw) + '</td>';
        }).join('');
        return '<tr>' + tds +
          '<td class="col-time muted">' + SL.escape(row._time || '') + '</td></tr>';
      }).join('');
      var avg = this.average(lab, rows);
      var footer = avgFooter(lab, avg);
      host.innerHTML = '<div class="table-wrap"><table class="record-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody>' + footer + '</table></div>';
    },
    exportCSV: function (lab, rows) {
      if (!rows.length) {
        SL.toast('还没有数据可以导出', 'warn');
        return;
      }
      var cols = lab.columns;
      var lines = [];
      lines.push('实验,' + lab.name);
      lines.push('导出时间,' + SL.today() + ' ' + SL.now());
      lines.push('');
      lines.push(cols.map(function (c) { return '"' + c.label + '"'; }).join(',') + ',"时间"');
      rows.forEach(function (row) {
        var cells = cols.map(function (col) {
          var v = row[col.key];
          if (v == null) return '""';
          if (col.digits != null && !isNaN(v)) return Number(v).toFixed(col.digits);
          return '"' + String(v).replace(/"/g, '""') + '"';
        });
        cells.push('"' + (row._time || '') + '"');
        lines.push(cells.join(','));
      });
      var avg = this.average(lab, rows);
      if (avg != null) {
        var avgCells = cols.map(function (col) {
          return col.key === lab.averageField ? avg.toFixed(col.digits == null ? 2 : col.digits) : '';
        });
        avgCells[0] = '平均值';
        avgCells.push('');
        lines.push(avgCells.join(','));
      }
      SL.download('实验记录_' + lab.name + '_' + SL.today() + '.csv', '\uFEFF' + lines.join('\r\n'), 'text/csv;charset=utf-8');
      SL.sound.play('record');
      SL.toast('已导出 CSV，可用 Excel 打开', 'ok');
    },
    print: function (lab, rows, answers) {
      var cols = lab.columns;
      var header = cols.map(function (c) { return '<th>' + c.label + '</th>'; }).join('') + '<th>时间</th>';
      var body = '';
      if (rows.length) {
        body = rows.map(function (row, index) {
          var tds = cols.map(function (col) {
            var v = row[col.key];
            if (v == null || v === '') return '<td>—</td>';
            if (col.digits != null && !isNaN(v)) return '<td>' + SL.fmt(v, col.digits) + '</td>';
            return '<td>' + SL.escape(v) + '</td>';
          }).join('');
          return '<tr>' + tds + '<td>' + SL.escape(row._time || '') + '</td></tr>';
        }).join('');
      }
      var avg = this.average(lab, rows);
      var avgRowCells = avgCells(lab, avg, false);
      var avgRow = avgRowCells.length ? '<tfoot><tr>' + avgRowCells.join('') + '<td></td></tr></tfoot>' : '';
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
        (body || '<tr><td colspan="' + (cols.length + 1) + '">暂无数据</td></tr>') + '</tbody>' + avgRow + '</table>' +
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
