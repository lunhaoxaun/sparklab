/* 全自由电学实验室：空白画布，不限元件数量与参数，无引导步骤 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['sandbox'];

  function firstMeter(scene, result, type) {
    var list = scene.components.filter(function (c) { return c.type === type; });
    for (var i = 0; i < list.length; i++) {
      var m = result.meters && result.meters[list[i].id];
      if (m) return { comp: list[i], meter: m };
    }
    return null;
  }

  function example() {
    function C(type, x, y, props) { return SL.circuit.create(type, x, y, props); }
    var battery = C('battery', 320, 480, { cells: 2 });
    var sw = C('switch', 500, 480, { closed: false });
    var bulb = C('bulb', 680, 480);
    var amp = C('ammeter', 500, 660, { range: 0.6 });
    var volt = C('voltmeter', 680, 300, { range: 3 });
    return {
      components: [battery, sw, bulb, amp, volt],
      wires: [
        { id: 'wf-1', from: { compId: battery.id, terminalId: 'pos' }, to: { compId: sw.id, terminalId: 'a' } },
        { id: 'wf-2', from: { compId: sw.id, terminalId: 'b' }, to: { compId: bulb.id, terminalId: 'a' } },
        { id: 'wf-3', from: { compId: bulb.id, terminalId: 'b' }, to: { compId: amp.id, terminalId: 'plus' } },
        { id: 'wf-4', from: { compId: amp.id, terminalId: 'minus' }, to: { compId: battery.id, terminalId: 'neg' } },
        { id: 'wf-5', from: { compId: volt.id, terminalId: 'plus' }, to: { compId: bulb.id, terminalId: 'a' } },
        { id: 'wf-6', from: { compId: volt.id, terminalId: 'minus' }, to: { compId: bulb.id, terminalId: 'b' } }
      ]
    };
  }

  SL.labs['sandbox'] = {
    id: 'sandbox',
    meta: meta,
    palette: meta.palette,
    initial: function () { return { components: [], wires: [] }; },
    example: example,
    measure: function (ctx) {
      var amp = firstMeter(ctx.scene, ctx.result, 'ammeter');
      var volt = firstMeter(ctx.scene, ctx.result, 'voltmeter');
      if (!amp && !volt) {
        SL.toast('至少接入一个电流表或电压表再记录数据', 'warn');
        return null;
      }
      var current = amp ? Math.abs(amp.meter.value) : null;
      if (amp && current < 0.005) {
        SL.toast('电流几乎为零，请检查开关是否闭合、接线是否完整', 'warn');
        return null;
      }
      var voltage = volt ? Math.abs(volt.meter.value) : null;
      return {
        group: ctx.rows.length + 1,
        voltage: voltage,
        current: current,
        resistance: current != null && voltage != null ? Number((voltage / current).toFixed(1)) : null
      };
    }
  };
})();
