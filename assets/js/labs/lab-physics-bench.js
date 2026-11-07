/* 物理综合实验台（physics-bench）
   ------------------------------------------------------------
   把力学、热学、光学三科的全部装置（电学除外）摆进同一个实验台：
   每台装置占一块自己的画布，各有各的参数、读数和动画，互不干扰，
   所以可以「一边看杠杆平衡、一边看水沸腾、一边看凸透镜成像」。

   本文件同样不写任何公式，只做三件事：
     1) 登记装置（学科、图标、搜索别名，以及它由哪个自由实验室托管）；
     2) 把「装置 + 自己的参数」翻译成渲染所需的 ctx，交给原来的实验去算去画；
     3) 给 app.js 的综合实验台装配链路（kind = 'combo'）提供纯函数接口。
   新增装置只要在 DEVICES 里加一行，前提是那个实验已经注册在 SL.labs 里。 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.labs = SL.labs || {};

  var meta = SL.data.labsById['physics-bench'];

  var SUBJECTS = {
    mechanics: { label: '力学' },
    thermal: { label: '热学' },
    optics: { label: '光学' }
  };

  /* provider = 托管该装置的自由实验室；dev = 该实验室内部认的 device 值 */
  var DEVICES = [
    {
      id: 'lever', label: '杠杆', subject: 'mechanics', provider: 'mech-free', dev: 'lever',
      icon: 'seesaw', keys: ['杠杆', '力矩', '平衡', 'gan', 'gangan', 'lever']
    },
    {
      id: 'pulley', label: '滑轮组', subject: 'mechanics', provider: 'mech-free', dev: 'pulley',
      icon: 'pulley', keys: ['滑轮', '滑轮组', '机械效率', 'huallun', 'hl', 'pulley']
    },
    {
      id: 'buoyancy', label: '浮力', subject: 'mechanics', provider: 'mech-free', dev: 'buoyancy',
      icon: 'waves', keys: ['浮力', '阿基米德', '排开', 'fuli', 'fl', 'buoyancy']
    },
    {
      id: 'boiling', label: '水沸腾', subject: 'thermal', provider: 'thermo-free', dev: 'thermo-boiling',
      icon: 'flame', keys: ['沸腾', '水沸腾', '沸点', 'feiteng', 'ft', 'boiling']
    },
    {
      id: 'heatcap', label: '比热容', subject: 'thermal', provider: 'thermo-free', dev: 'thermo-heatcap',
      icon: 'thermometer', keys: ['比热容', '吸热', '温度', 'birecong', 'brr', 'heat']
    },
    {
      id: 'melting', label: '晶体熔化', subject: 'thermal', provider: 'thermo-free', dev: 'melting',
      icon: 'beaker', keys: ['熔化', '晶体', '熔点', 'ronghua', 'rh', 'melting']
    },
    {
      id: 'reflection', label: '光的反射', subject: 'optics', provider: 'optics-free', dev: 'optics-reflection',
      icon: 'dep-rays', keys: ['反射', '入射角', '反射角', 'fanshe', 'fs', 'reflection']
    },
    {
      id: 'plane', label: '平面镜成像', subject: 'optics', provider: 'optics-free', dev: 'plane-mirror',
      icon: 'dep-mirror', keys: ['平面镜', '成像', '虚像', 'pingmianjing', 'pmj', 'mirror']
    },
    {
      id: 'lens', label: '凸透镜成像', subject: 'optics', provider: 'optics-free', dev: 'optics-lens',
      icon: 'dep-lens', keys: ['凸透镜', '透镜', '焦距', '成像', 'toutoujing', 'ttj', 'lens']
    }
  ];

  /* 默认三台：一科一台，正好说明「可以一起做」 */
  var DEFAULT_PANELS = ['lever', 'boiling', 'reflection'];

  function deviceById(id) {
    for (var i = 0; i < DEVICES.length; i++) {
      if (DEVICES[i].id === id) return DEVICES[i];
    }
    return null;
  }

  function providerOf(device) {
    return device && SL.labs[device.provider] ? SL.labs[device.provider] : null;
  }

  /* 该装置的出厂参数（深拷贝一层：参数都是数值/字符串，够用） */
  function freshValues(device) {
    var p = providerOf(device);
    var v = { device: device.dev };
    var src = (p && p.defaults) || {};
    Object.keys(src).forEach(function (key) {
      if (key !== 'device') v[key] = src[key];
    });
    return v;
  }

  /* 只保留适用于当前装置的控件（自由实验室用 when() 做了分组） */
  function schemaFor(device, values) {
    var p = providerOf(device);
    if (!p) return [];
    return (p.controls || []).filter(function (def) {
      if (def.key === 'device') return false;
      return !def.when || def.when(values);
    });
  }

  function calcOf(device, values) {
    var p = providerOf(device);
    if (!p || !p.calc) return null;
    try { return p.calc(values); } catch (e) { return null; }
  }

  function drawOf(device, ctx) {
    var p = providerOf(device);
    if (p && p.draw) p.draw(ctx);
  }

  function readoutsOf(device, calc, values) {
    var p = providerOf(device);
    return p && p.readouts ? (p.readouts(calc, values) || []) : [];
  }

  function warningsOf(device, calc, values) {
    var p = providerOf(device);
    return p && p.warnings ? (p.warnings(calc, values) || []) : [];
  }

  function animatedOf(device, values) {
    var p = providerOf(device);
    if (!p) return false;
    return typeof p.animated === 'function' ? !!p.animated(values) : !!p.animated;
  }

  SL.labs['physics-bench'] = {
    id: 'physics-bench',
    kind: 'combo',
    meta: meta,
    canvas: { w: 900, h: 520 },

    devices: DEVICES,
    subjects: SUBJECTS,
    defaultPanels: DEFAULT_PANELS,

    /* app.js 的通用存档只认 simValues，所以整台实验台的状态都放这里 */
    defaults: {
      combo: { panels: DEFAULT_PANELS.slice(), active: DEFAULT_PANELS[0], values: {} }
    },
    controls: [],
    freeDevices: DEVICES.map(function (d) { return { id: d.id, label: d.label, icon: d.icon }; }),

    freeGuide: {
      title: '物理综合实验台',
      text: '力学、热学、光学三科装置同屏摆放：每台装置有自己的画布和参数，改一台不影响另一台，可以一边调杠杆，一边看水沸腾。',
      list: [
        '点左栏「装置库」里的器材，就往台面上加一台；点面板右上角的 × 移除',
        '点某块面板选中它，左栏参数与右栏读数就切到那台装置',
        '热学与滑轮组会随时间推进，用「播放 / 暂停」控制，复位只回到初始状态',
        '每块面板底部有两条关键读数，选中后右栏是完整读数',
        '记录当前数据时，记录的是「选中那台」的读数，装置列会写明是哪台'
      ]
    },

    deviceById: deviceById,
    freshValues: freshValues,
    schemaFor: schemaFor,
    calcOf: calcOf,
    drawOf: drawOf,
    readoutsOf: readoutsOf,
    warningsOf: warningsOf,
    animatedOf: animatedOf,

    reset: function () {
      DEVICES.forEach(function (d) {
        var p = providerOf(d);
        if (p && p.reset) { try { p.reset(); } catch (e) { /* 单个装置复位失败不影响别的 */ } }
      });
    },

    /* 记录单：转发给托管实验室，装置列写明是哪台装置 */
    measure: function (ctx) {
      var d = deviceById(ctx && ctx.device);
      if (!d) return null;
      var p = providerOf(d);
      if (!p || !p.measure) return null;
      var row = null;
      try { row = p.measure(ctx); } catch (e) { return null; }
      if (!row) return null;
      row.device = d.label;
      return row;
    }
  };
})();
