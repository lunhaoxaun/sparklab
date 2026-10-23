/* 实验二：伏安法测电阻 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['ohm-r'];

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

  function seriesPath(result, ampId) {
    return (result.meterInfo && result.meterInfo.ammetersOnPath || []).indexOf(ampId) !== -1;
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

  function rowsWithData(rows) {
    return rows.filter(function (r) {
      return r.voltage != null && r.current != null && !isNaN(r.current) && r.current > 0.005;
    });
  }

  var checks = [
    function (ctx) { return connected(ctx); },
    function (ctx) {
      var rheo = comps(ctx.scene, 'rheostat')[0];
      return !!rheo && rheo.props.slider >= 0.95;
    },
    function (ctx) {
      var rows = rowsWithData(ctx.rows);
      if (rows.length < 3) return false;
      var currents = rows.map(function (r) { return Number(r.current); });
      return Math.max.apply(null, currents) - Math.min.apply(null, currents) > 0.02;
    },
    function (ctx) { return !!ctx.state.allAnswered; }
  ];

  meta.steps.forEach(function (step, index) { step.check = checks[index]; });

  function example() {
    function C(type, x, y, props) { return SL.circuit.create(type, x, y, props); }
    var battery = C('battery', 300, 500, { cells: 3 });
    var amp = C('ammeter', 470, 650, { range: 0.6 });
    var sw = C('switch', 660, 500, { closed: false });
    var rx = C('resistor', 860, 500, { resistance: 10, unknown: true });
    var rheo = C('rheostat', 1080, 500, { slider: 1, max: 20 });
    var volt = C('voltmeter', 860, 300, { range: 3 });
    return {
      components: [battery, amp, sw, rx, rheo, volt],
      wires: [
        { id: 'wr-1', from: { compId: battery.id, terminalId: 'pos' }, to: { compId: amp.id, terminalId: 'plus' } },
        { id: 'wr-2', from: { compId: amp.id, terminalId: 'minus' }, to: { compId: sw.id, terminalId: 'a' } },
        { id: 'wr-3', from: { compId: sw.id, terminalId: 'b' }, to: { compId: rx.id, terminalId: 'a' } },
        { id: 'wr-4', from: { compId: rx.id, terminalId: 'b' }, to: { compId: rheo.id, terminalId: 'a' } },
        { id: 'wr-5', from: { compId: rheo.id, terminalId: 'c' }, to: { compId: battery.id, terminalId: 'neg' } },
        { id: 'wr-6', from: { compId: volt.id, terminalId: 'plus' }, to: { compId: rx.id, terminalId: 'a' } },
        { id: 'wr-7', from: { compId: volt.id, terminalId: 'minus' }, to: { compId: rx.id, terminalId: 'b' } }
      ]
    };
  }

  SL.labs['ohm-r'] = {
    id: 'ohm-r',
    meta: meta,
    palette: meta.palette,
    initial: function () { return { components: [], wires: [] }; },
    example: example,
    measure: function (ctx) {
      var amp = firstMeter(ctx.scene, ctx.result, 'ammeter');
      var volt = firstMeter(ctx.scene, ctx.result, 'voltmeter');
      if (!amp || !volt) {
        SL.toast('伏安法需要同时接入电流表和电压表', 'warn');
        return null;
      }
      var current = Math.abs(amp.meter.value);
      if (current < 0.005) {
        SL.toast('电流几乎为零，请检查开关是否闭合、滑动变阻器接法是否正确', 'warn');
        return null;
      }
      var voltage = Math.abs(volt.meter.value);
      var resistance = voltage / current;
      var rows = ctx.rows.filter(function (r) { return r.resistance != null; });
      return {
        group: rows.length + 1,
        voltage: voltage,
        current: current,
        resistance: Number(resistance.toFixed(1))
      };
    },
    tick: function (ctx) {
      var state = ctx.state;
      state.flags = state.flags || {};
      var sw = comps(ctx.scene, 'switch')[0];
      var rheo = comps(ctx.scene, 'rheostat')[0];
      var res = comps(ctx.scene, 'resistor')[0];
      var amp = firstMeter(ctx.scene, ctx.result, 'ammeter');
      var volt = firstMeter(ctx.scene, ctx.result, 'voltmeter');
      if (!sw || !sw.props.closed) {
        state.flags = {};
        return;
      }
      if (rheo && rheo.props.slider < 0.9 && !state.flags.lowSlider) {
        state.flags.lowSlider = true;
        SL.toast('闭合开关前应先把滑片移到阻值最大端，以保护电路', 'warn');
      }
      if (res && amp && !state.flags.ammeterParallel) {
        var nodes = ctx.result.terminalNode;
        var ra = nodes[res.id + ':a'], rb = nodes[res.id + ':b'];
        var ap = nodes[amp.comp.id + ':plus'], am = nodes[amp.comp.id + ':minus'];
        if ((ra === ap && rb === am) || (ra === am && rb === ap)) {
          state.flags.ammeterParallel = true;
          SL.toast('电流表并联在 Rx 两端会把 Rx 短路，非常危险', 'warn');
        }
      }
      if (volt && !state.flags.voltmeterSeries) {
        var across = ctx.result.meterInfo.voltmeterAcross[volt.comp.id];
        if (!across && seriesPath(ctx.result, volt.comp.id)) {
          state.flags.voltmeterSeries = true;
          SL.toast('电压表内阻很大，串联进电路后几乎没有电流', 'warn');
        }
      }
    }
  };
})();
