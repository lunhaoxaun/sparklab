/* 实验三：探究电流与电压、电阻的关系（欧姆定律） */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['ohm-law'];

  function comps(scene, type) {
    return scene.components.filter(function (c) { return c.type === type; });
  }

  function firstMeter(scene, result, type) {
    var list = comps(scene, type);
    for (var i = 0; i < list.length; i++) {
      var m = result.meters && result.meters[list[i].id];
      if (m) return { comp: list[i], meter: m };
    }
    return null;
  }

  function seriesPath(result, id) {
    return (result.meterInfo && result.meterInfo.ammetersOnPath || []).indexOf(id) !== -1;
  }

  function connected(ctx) {
    var res = comps(ctx.scene, 'resistor')[0];
    var rheo = comps(ctx.scene, 'rheostat')[0];
    var bat = comps(ctx.scene, 'battery')[0];
    var sw = comps(ctx.scene, 'switch')[0];
    var amp = firstMeter(ctx.scene, ctx.result, 'ammeter');
    var volt = firstMeter(ctx.scene, ctx.result, 'voltmeter');
    if (!res || !rheo || !bat || !sw || !amp || !volt) return false;
    if (!ctx.result.ok) return false;
    if (ctx.result.rheostats[rheo.id].wiring !== 'valid') return false;
    if (!seriesPath(ctx.result, amp.comp.id)) return false;
    if (ctx.result.meterInfo.voltmeterAcross[volt.comp.id] !== res.id) return false;
    return true;
  }

  function regression(points) {
    var n = points.length;
    if (n < 2) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    points.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; syy += p.y * p.y; });
    var denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-12) return null;
    var a = (n * sxy - sx * sy) / denom;
    var b = (sy - a * sx) / n;
    var meanY = sy / n;
    var ssTot = points.reduce(function (sum, p) { return sum + Math.pow(p.y - meanY, 2); }, 0);
    var ssRes = points.reduce(function (sum, p) { return sum + Math.pow(p.y - (a * p.x + b), 2); }, 0);
    var r2 = ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;
    return { a: a, b: b, r2: r2 };
  }

  function iuRows(rows) {
    return rows.filter(function (r) {
      return Number(r.resistance) === 10 && Number(r.current) > 0.004 && Number(r.voltage) > 0;
    });
  }

  function irRows(rows) {
    return rows.filter(function (r) {
      return Math.abs(Number(r.voltage) - 2) <= 0.15 && Number(r.current) > 0.004;
    });
  }

  var checks = [
    function (ctx) { return connected(ctx); },
    function (ctx) {
      var rows = iuRows(ctx.rows);
      var us = {};
      rows.forEach(function (r) { us[Number(r.voltage).toFixed(1)] = true; });
      return rows.length >= 4 && Object.keys(us).length >= 3;
    },
    function (ctx) {
      var rows = iuRows(ctx.rows);
      if (rows.length < 4) return false;
      var fit = regression(rows.map(function (r) { return { x: Number(r.voltage), y: Number(r.current) }; }));
      return !!fit && fit.r2 > 0.95;
    },
    function (ctx) {
      var rows = irRows(ctx.rows);
      var rs = {};
      rows.forEach(function (r) { rs[Number(r.resistance)] = true; });
      return rows.length >= 4 && Object.keys(rs).length >= 4;
    },
    function (ctx) { return !!ctx.state.allAnswered; }
  ];

  meta.steps.forEach(function (step, index) { step.check = checks[index]; });

  function example() {
    function C(type, x, y, props) { return SL.circuit.create(type, x, y, props); }
    var battery = C('battery', 300, 500, { cells: 2 });
    var amp = C('ammeter', 470, 650, { range: 0.6 });
    var sw = C('switch', 660, 500, { closed: false });
    var rx = C('resistor', 860, 500, { resistance: 10 });
    var rheo = C('rheostat', 1080, 500, { slider: 0.5, max: 20 });
    var volt = C('voltmeter', 860, 300, { range: 3 });
    return {
      components: [battery, amp, sw, rx, rheo, volt],
      wires: [
        { id: 'wo-1', from: { compId: battery.id, terminalId: 'pos' }, to: { compId: amp.id, terminalId: 'plus' } },
        { id: 'wo-2', from: { compId: amp.id, terminalId: 'minus' }, to: { compId: sw.id, terminalId: 'a' } },
        { id: 'wo-3', from: { compId: sw.id, terminalId: 'b' }, to: { compId: rx.id, terminalId: 'a' } },
        { id: 'wo-4', from: { compId: rx.id, terminalId: 'b' }, to: { compId: rheo.id, terminalId: 'a' } },
        { id: 'wo-5', from: { compId: rheo.id, terminalId: 'c' }, to: { compId: battery.id, terminalId: 'neg' } },
        { id: 'wo-6', from: { compId: volt.id, terminalId: 'plus' }, to: { compId: rx.id, terminalId: 'a' } },
        { id: 'wo-7', from: { compId: volt.id, terminalId: 'minus' }, to: { compId: rx.id, terminalId: 'b' } }
      ]
    };
  }

  function chart(points, xLabel, yLabel, emptyText) {
    if (!points.length) {
      return '<div class="chart-empty">' + SL.icon('chart-line', '', 20) + '<span>' + emptyText + '</span></div>';
    }
    var W = 340, H = 216, L = 48, R = 14, T = 16, B = 40;
    var maxX = Math.max.apply(null, points.map(function (p) { return p.x; }));
    var maxY = Math.max.apply(null, points.map(function (p) { return p.y; }));
    maxX = Math.max(maxX * 1.15, 0.1);
    maxY = Math.max(maxY * 1.15, 0.05);
    var plotW = W - L - R, plotH = H - T - B;
    function px(x) { return L + (x / maxX) * plotW; }
    function py(y) { return T + plotH - (y / maxY) * plotH; }
    var grid = '';
    for (var i = 0; i <= 4; i++) {
      var gx = L + (plotW * i) / 4;
      var gy = T + (plotH * i) / 4;
      grid += '<line class="chart-grid" x1="' + gx + '" y1="' + T + '" x2="' + gx + '" y2="' + (T + plotH) + '"/>';
      grid += '<line class="chart-grid" x1="' + L + '" y1="' + gy + '" x2="' + (L + plotW) + '" y2="' + gy + '"/>';
      grid += '<text class="chart-tick" x="' + (gx) + '" y="' + (T + plotH + 16) + '" text-anchor="middle">' + SL.fmt((maxX * i) / 4, maxX < 1 ? 2 : 1) + '</text>';
      grid += '<text class="chart-tick" x="' + (L - 8) + '" y="' + (T + plotH - (plotH * i) / 4 + 4) + '" text-anchor="end">' + SL.fmt((maxY * i) / 4, maxY < 0.5 ? 3 : 2) + '</text>';
    }
    var fit = regression(points);
    var fitLine = '';
    if (fit && points.length >= 2) {
      fitLine = '<line class="chart-fit" x1="' + px(0) + '" y1="' + py(fit.b) + '" x2="' + px(maxX) + '" y2="' + py(fit.a * maxX + fit.b) + '"/>';
    }
    var dots = points.map(function (p, index) {
      return '<circle class="chart-dot" cx="' + px(p.x) + '" cy="' + py(p.y) + '" r="4.5"><title>' +
        xLabel + '=' + SL.fmt(p.x, 2) + ', ' + yLabel + '=' + SL.fmt(p.y, 3) + '</title></circle>';
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + xLabel + ' 与 ' + yLabel + ' 的关系图">' +
      grid +
      '<line class="chart-axis" x1="' + L + '" y1="' + (T + plotH) + '" x2="' + (L + plotW) + '" y2="' + (T + plotH) + '"/>' +
      '<line class="chart-axis" x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + plotH) + '"/>' +
      fitLine + dots +
      '<text class="chart-label" x="' + (L + plotW / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + xLabel + '</text>' +
      '<text class="chart-label" transform="translate(12 ' + (T + plotH / 2) + ') rotate(-90)" text-anchor="middle">' + yLabel + '</text>' +
      '</svg>' +
      (fit ? '<div class="chart-note">拟合：I = ' + SL.fmt(fit.a, 3) + ' × ' + xLabel + (fit.b >= 0 ? ' + ' : ' − ') + SL.fmt(Math.abs(fit.b), 3) + '　R² = ' + SL.fmt(fit.r2, 4) + '</div>' : '');
  }

  SL.labs['ohm-law'] = {
    id: 'ohm-law',
    meta: meta,
    palette: meta.palette,
    initial: function () { return { components: [], wires: [] }; },
    example: example,
    measure: function (ctx) {
      var res = comps(ctx.scene, 'resistor')[0];
      var amp = firstMeter(ctx.scene, ctx.result, 'ammeter');
      var volt = firstMeter(ctx.scene, ctx.result, 'voltmeter');
      if (!res || !amp || !volt) {
        SL.toast('需要同时接入定值电阻、电流表和电压表', 'warn');
        return null;
      }
      var current = Math.abs(amp.meter.value);
      if (current < 0.004) {
        SL.toast('电流几乎为零，请检查开关和接线', 'warn');
        return null;
      }
      var voltage = Math.abs(volt.meter.value);
      var resistance = Number(res.props.resistance || 10);
      var rows = ctx.rows.filter(function (r) { return r.current != null; });
      return {
        group: rows.length + 1,
        resistance: resistance,
        voltage: voltage,
        current: current,
        ratio: Number((voltage / current).toFixed(1))
      };
    },
    tick: function (ctx) {
      var state = ctx.state;
      var res = comps(ctx.scene, 'resistor')[0];
      if (!res) return;
      if (state.lastResistance == null) { state.lastResistance = res.props.resistance; return; }
      if (state.lastResistance !== res.props.resistance) {
        state.lastResistance = res.props.resistance;
        var sw = comps(ctx.scene, 'switch')[0];
        if (sw && sw.props.closed) {
          SL.toast('电阻已更换，请调节滑片使电阻两端电压保持 2.0V', 'info');
        }
      }
    },
    renderExtra: function (host, rows) {
      if (!host) return;
      var iu = iuRows(rows).map(function (r) { return { x: Number(r.voltage), y: Number(r.current) }; });
      var ir = irRows(rows).map(function (r) { return { x: 1 / Number(r.resistance), y: Number(r.current) }; });
      host.innerHTML =
        '<div class="chart-card"><div class="chart-head"><span>I–U 图像</span><em>保持 R = 10Ω</em></div>' +
        chart(iu, 'U/V', 'I/A', '记录 4 组 R=10Ω 的 U、I 数据后生成图像') + '</div>' +
        '<div class="chart-card"><div class="chart-head"><span>I–1/R 图像</span><em>保持 U = 2.0V</em></div>' +
        chart(ir, '1/R (Ω⁻¹)', 'I/A', '保持电压 2.0V、更换 4 种电阻后生成图像') + '</div>';
    },
    stats: function (rows) {
      var fit = regression(iuRows(rows).map(function (r) { return { x: Number(r.voltage), y: Number(r.current) }; }));
      return fit ? fit.r2 : null;
    }
  };
})();
