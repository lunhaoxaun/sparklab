/* 实验一：串并联电路中电流、电压的规律 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById.series;

  function comps(scene, type) {
    return scene.components.filter(function (c) { return c.type === type; });
  }

  function bulbs(scene) { return comps(scene, 'bulb'); }

  function maxBatteryCurrent(result) {
    var max = 0;
    Object.keys(result.batteries || {}).forEach(function (id) {
      max = Math.max(max, Math.abs(result.batteries[id].current || 0));
    });
    return max;
  }

  function hasClosedSwitch(scene) {
    return scene.components.some(function (c) { return c.type === 'switch' && c.props.closed; });
  }

  function rowsAt(rows, sceneLabel, points) {
    return rows.filter(function (r) {
      return r.scene === sceneLabel && points.indexOf(r.point) !== -1 && parseFloat(r.current) > 0.004;
    });
  }

  function voltageRows(rows, sceneLabel, points) {
    return rows.filter(function (r) {
      return r.scene === sceneLabel && points.indexOf(r.point) !== -1;
    });
  }

  function spread(values) {
    if (!values.length) return 0;
    return Math.max.apply(null, values) - Math.min.apply(null, values);
  }

  function distinctPoints(rows) {
    var set = {};
    rows.forEach(function (r) { set[r.point] = true; });
    return Object.keys(set).length;
  }

  function seriesReady(ctx) {
    return ctx.result.sceneType === 'series' && bulbs(ctx.scene).length >= 2 &&
      comps(ctx.scene, 'battery').length >= 1 && comps(ctx.scene, 'switch').length >= 1;
  }

  function seriesFlowing(ctx) {
    return seriesReady(ctx) && hasClosedSwitch(ctx.scene) && maxBatteryCurrent(ctx.result) > 0.004;
  }

  function parallelReady(ctx) {
    return ctx.result.sceneType === 'parallel' && bulbs(ctx.scene).length >= 2;
  }

  var checks = [
    function (ctx) { return seriesReady(ctx); },
    function (ctx) {
      if (!seriesFlowing(ctx)) return false;
      return bulbs(ctx.scene).every(function (b) {
        var info = ctx.result.bulbs[b.id];
        return info && Math.abs(info.current) > 0.004;
      });
    },
    function (ctx) {
      var rows = rowsAt(ctx.rows, '串联', ['A', 'B', 'C']);
      if (rows.length < 2 || distinctPoints(rows) < 2) return false;
      var currents = rows.map(function (r) { return parseFloat(r.current); });
      return spread(currents) <= 0.025;
    },
    function (ctx) {
      var rows = voltageRows(ctx.rows, '串联', ['L1', 'L2', 'SRC']);
      var has = {};
      rows.forEach(function (r) { if (r.voltage !== '' && r.voltage != null) has[r.point] = parseFloat(r.voltage); });
      if (!has.L1 || !has.L2 || !has.SRC) return false;
      return Math.abs(has.L1 + has.L2 - has.SRC) <= 0.12;
    },
    function (ctx) { return parallelReady(ctx); },
    function (ctx) {
      var rows = rowsAt(ctx.rows, '并联', ['A', 'B', 'C']);
      if (rows.length < 3 || distinctPoints(rows) < 3) return false;
      var values = rows.map(function (r) { return parseFloat(r.current); });
      var max = Math.max.apply(null, values);
      var sum = values.reduce(function (a, b) { return a + b; }, 0);
      return Math.abs(sum - max * 2) <= 0.05;
    },
    function (ctx) {
      var rows = voltageRows(ctx.rows, '并联', ['L1', 'L2']);
      var has = {};
      rows.forEach(function (r) { if (r.voltage != null && r.voltage !== '') has[r.point] = parseFloat(r.voltage); });
      return has.L1 != null && has.L2 != null && Math.abs(has.L1 - has.L2) <= 0.1;
    },
    function (ctx) { return !!ctx.state.allAnswered; }
  ];

  meta.steps.forEach(function (step, index) { step.check = checks[index]; });

  function firstMeter(scene, result, type) {
    var list = comps(scene, type);
    for (var i = 0; i < list.length; i++) {
      var m = result.meters && result.meters[list[i].id];
      if (m) return { comp: list[i], meter: m };
    }
    return null;
  }

  function example() {
    function C(type, x, y, props) { return SL.circuit.create(type, x, y, props); }
    var battery = C('battery', 400, 480, { cells: 2 });
    var sw = C('switch', 610, 480, { closed: false });
    var l1 = C('bulb', 810, 480);
    var l2 = C('bulb', 810, 270);
    return {
      components: [battery, sw, l1, l2],
      wires: [
        { id: 'ws-1', from: { compId: battery.id, terminalId: 'pos' }, to: { compId: sw.id, terminalId: 'a' } },
        { id: 'ws-2', from: { compId: sw.id, terminalId: 'b' }, to: { compId: l1.id, terminalId: 'a' } },
        { id: 'ws-3', from: { compId: l1.id, terminalId: 'b' }, to: { compId: l2.id, terminalId: 'b' } },
        { id: 'ws-4', from: { compId: l2.id, terminalId: 'a' }, to: { compId: battery.id, terminalId: 'neg' } }
      ]
    };
  }

  SL.labs.series = {
    id: 'series',
    meta: meta,
    palette: meta.palette,
    initial: function () { return { components: [], wires: [] }; },
    example: example,
    measure: function (ctx) {
      var amp = firstMeter(ctx.scene, ctx.result, 'ammeter');
      var volt = firstMeter(ctx.scene, ctx.result, 'voltmeter');
      if (!amp && !volt) {
        SL.toast('场景里还没有电表，请先接入电流表或电压表', 'warn');
        return null;
      }
      var point = ctx.state.point || 'A';
      var needsCurrent = ['A', 'B', 'C'].indexOf(point) !== -1;
      if (needsCurrent && !amp) {
        SL.toast('测量电流需要先接入电流表', 'warn');
        return null;
      }
      if (!needsCurrent && !volt) {
        SL.toast('测量电压需要先接入电压表', 'warn');
        return null;
      }
      if (!needsCurrent) {
        var across = ctx.result.meterInfo.voltmeterAcross[volt.comp.id];
        var target = null;
        var targetLabel = point;
        if (point === 'SRC') {
          var bat = comps(ctx.scene, 'battery')[0];
          target = bat ? bat.id : null;
          targetLabel = '电源';
        } else {
          var bs = bulbs(ctx.scene);
          var bulb = point === 'L1' ? bs[0] : bs[1];
          target = bulb ? bulb.id : null;
        }
        if (across !== target) {
          SL.toast('电压表没有接在' + targetLabel + '两端，请先调整接线再记录', 'warn');
          return null;
        }
      }
      var sceneLabel = ctx.result.sceneType === 'series' ? '串联' : ctx.result.sceneType === 'parallel' ? '并联' : '其他';
      var row = {
        scene: sceneLabel,
        point: point,
        current: amp ? SL.fmt(Math.abs(amp.meter.value), 2) : '',
        voltage: volt ? SL.fmt(Math.abs(volt.meter.value), 2) : ''
      };
      return row;
    },
    tick: function () { /* 实验一无需额外交互提示 */ }
  };
})();
