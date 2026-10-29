/* 化学计算：气体制取、燃烧条件、电解水、酸碱中和、自由混合
   纯函数 + 试剂/反应数据表，不依赖 DOM，供 labs/lab-chem-*.js 调用 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function round(v, n) {
    var p = Math.pow(10, n == null ? 2 : n);
    return Math.round(v * p) / p;
  }

  /* ================= 一、制取氧气 ================= */
  var OXY = {
    h2o2: {
      label: '过氧化氢溶液 + 二氧化锰',
      short: '过氧化氢',
      equation: '2H₂O₂ —MnO₂→ 2H₂O + O₂↑',
      needHeat: false,
      base: 0.55,
      catalyst: 24,
      device: 'solid-liquid',
      gas: 'O₂',
      note: '常温下即可反应，二氧化锰是催化剂，反应前后质量与化学性质都不变'
    },
    kmno4: {
      label: '高锰酸钾',
      short: '高锰酸钾',
      equation: '2KMnO₄ —Δ→ K₂MnO₄ + MnO₂ + O₂↑',
      needHeat: true,
      base: 5.4,
      catalyst: 1,
      device: 'solid-heat',
      gas: 'O₂',
      note: '固体加热型装置，试管口要略向下倾斜并塞一团棉花，防止粉末进入导管'
    },
    kclo3: {
      label: '氯酸钾 + 二氧化锰',
      short: '氯酸钾',
      equation: '2KClO₃ —MnO₂,Δ→ 2KCl + 3O₂↑',
      needHeat: true,
      base: 0.22,
      catalyst: 16,
      device: 'solid-heat',
      gas: 'O₂',
      note: '二氧化锰加快反应速率，不加时需很高温度才缓慢分解'
    }
  };

  var BOTTLE_ML = 250;

  function oxygen(values, state) {
    var def = OXY[values.reagent] || OXY.h2o2;
    var heated = !!values.heat;
    var catalyst = !!values.catalyst;
    var ok = true;
    var speed = def.base;

    if (def.needHeat && !heated) ok = false;
    if (catalyst) speed *= def.catalyst;
    else if (!def.needHeat) speed *= 0.06;   /* 过氧化氢不加催化剂：极慢 */
    if (!ok) speed = 0;

    var vol = state ? state.vol || 0 : 0;
    var purity = def.needHeat ? 99 : 96;     /* 排水法收集，纯度都很高 */
    var test = values.test || 'none';
    var ember = vol >= 60 && speed > 0 ? '复燃' : (vol > 0 ? '无变化' : '未收集到气体');

    return {
      label: def.label,
      equation: def.equation,
      note: def.note,
      device: def.device,
      reacts: ok,
      speed: speed,
      vol: Math.min(vol, BOTTLE_ML),
      capacity: BOTTLE_ML,
      full: vol >= BOTTLE_ML - 0.5,
      filled: clamp(vol / BOTTLE_ML, 0, 1),
      purity: purity,
      test: test,
      ember: ember,
      sulfur: vol >= 60 ? '明亮蓝紫色火焰' : '无变化'
    };
  }

  /* ================= 二、燃烧的条件 ================= */
  /* 着火点：白磷 40 ℃，红磷 240 ℃；热水最高 100 ℃ */
  var IGNITE = { white: 40, red: 240 };

  function combustion(values) {
    var temp = values.temp == null ? 80 : values.temp;
    var air = !!values.air;                  /* 是否向水中的白磷通入氧气 */
    var oxygenInAir = true;                  /* 铜片露在空气中，始终接触氧气 */

    var onPlateWhite = temp >= IGNITE.white && oxygenInAir;
    var onPlateRed = temp >= IGNITE.red && oxygenInAir;
    var inWaterWhite = temp >= IGNITE.white && air;

    function stateOf(burn, t, ignite) {
      if (burn) return '燃烧';
      if (t < ignite) return '不燃烧（温度未达着火点）';
      return '不燃烧（没有与氧气接触）';
    }

    var count = (onPlateWhite ? 1 : 0) + (onPlateRed ? 1 : 0) + (inWaterWhite ? 1 : 0);

    return {
      temp: temp,
      air: air,
      plateWhite: onPlateWhite,
      plateRed: onPlateRed,
      waterWhite: inWaterWhite,
      plateWhiteState: onPlateWhite ? '燃烧，产生大量白烟' : stateOf(false, temp, IGNITE.white),
      plateRedState: onPlateRed ? '燃烧' : '不燃烧（温度未达 240 ℃ 着火点）',
      waterWhiteState: inWaterWhite ? '燃烧，在水下剧烈反应' : stateOf(false, temp, IGNITE.white),
      burningCount: count,
      heatEnough: temp >= IGNITE.white
    };
  }

  /* ================= 三、电解水 ================= */
  var ELECTROLYTES = {
    h2so4: { label: '稀硫酸', conduct: 1.0, note: '增强导电性，本身不参与反应' },
    naoh: { label: '氢氧化钠溶液', conduct: 0.86, note: '增强导电性，本身不参与反应' }
  };

  function electrolysis(values, state) {
    var volt = values.voltage == null ? 6 : values.voltage;
    var ele = ELECTROLYTES[values.electrolyte] || ELECTROLYTES.h2so4;
    /* 超过分解电压后，产气速率近似与 (U − 1.5 V) 成正比 */
    var rate = volt <= 1.5 ? 0 : (volt - 1.5) * 0.62 * ele.conduct;
    var t = state ? state.t || 0 : 0;
    var vH = state ? state.vH || 0 : 0;
    var vO = state ? state.vO || 0 : 0;
    var max = 40;                              /* 两支刻度管各 40 mL */
    var ratio = vO > 0.4 ? vH / vO : 0;
    return {
      voltage: volt,
      electrolyte: ele.label,
      electrolyteNote: ele.note,
      rate: rate,
      t: t,
      vH: Math.min(vH, max),
      vO: Math.min(vO, max),
      max: max,
      ratio: ratio,
      splitRatio: ratio ? round(ratio, 1) : 0,
      running: rate > 0 && (vH < max || vO < max),
      negativeGas: '氢气（H₂）',
      positiveGas: '氧气（O₂）'
    };
  }

  /* ================= 四、酸碱中和 ================= */
  var INDICATORS = {
    none: { label: '不加指示剂' },
    litmus: { label: '紫色石蕊溶液' },
    phenolphthalein: { label: '无色酚酞溶液' }
  };

  var ACID_ML = 20;

  function acidBase(values) {
    var ca = values.acidConc == null ? 0.10 : values.acidConc;
    var cb = values.baseConc == null ? 0.10 : values.baseConc;
    var added = values.added == null ? 0 : values.added;
    var indicator = values.indicator || 'phenolphthalein';

    var nAcid = ca * ACID_ML;
    var nBase = cb * added;
    var diff = nBase - nAcid;
    var total = ACID_ML + added;
    var ph;

    if (Math.abs(diff) < 1e-6) ph = 7;
    else if (diff < 0) {
      var cH = Math.abs(diff) / total;
      ph = -Math.log(cH) / Math.LN10;
    } else {
      var cOH = diff / total;
      ph = 14 + Math.log(cOH) / Math.LN10;
    }
    ph = clamp(ph, 0, 14);

    var state = ph < 6.8 ? '酸过量' : ph > 7.2 ? '碱过量' : '恰好完全反应';
    var color, liquidColor;
    if (indicator === 'litmus') {
      color = ph < 6.5 ? '变红' : ph > 7.5 ? '变蓝' : '仍为紫色';
      liquidColor = ph < 6.5 ? '#d9534f' : ph > 7.5 ? '#3f7fd0' : '#8b6fbe';
    } else if (indicator === 'phenolphthalein') {
      color = ph < 8.2 ? '仍为无色' : '变红';
      liquidColor = ph < 8.2 ? '#eef2f6' : '#e8607d';
    } else {
      color = '无明显变化';
      liquidColor = '#eef2f6';
    }

    return {
      acidConc: ca,
      baseConc: cb,
      added: added,
      acidVolume: ACID_ML,
      nAcid: nAcid,
      nBase: nBase,
      ph: round(ph, 2),
      state: state,
      indicator: INDICATORS[indicator] ? INDICATORS[indicator].label : '',
      colorText: color,
      liquidColor: liquidColor,
      neutralized: Math.abs(diff) < 0.02,
      heat: nBase > 0 ? round(Math.min(nBase, nAcid) * 57.3, 1) : 0,
      equation: 'NaOH + HCl → NaCl + H₂O'
    };
  }

  /* ================= 五、自由混合（试剂反应表） ================= */
  var REAGENTS = {
    hcl: { label: '稀盐酸', color: '#e7eef5', kind: 'acid' },
    naoh: { label: '氢氧化钠溶液', color: '#eaf2f7', kind: 'base' },
    na2co3: { label: '碳酸钠溶液', color: '#eef3f6', kind: 'salt' },
    cuso4: { label: '硫酸铜溶液', color: '#5aa9e6', kind: 'salt' },
    cacl2: { label: '氯化钙溶液', color: '#eef3f6', kind: 'salt' },
    fe: { label: '铁钉', color: '#8a939c', kind: 'metal' },
    caco3: { label: '大理石（碳酸钙）', color: '#d8d2c4', kind: 'solid' },
    h2o: { label: '蒸馏水', color: '#eaf4fa', kind: 'water' }
  };

  /* key = 两试剂按字典序拼起来 */
  function keyOf(a, b) { return a < b ? a + '+' + b : b + '+' + a; }

  var REACTIONS = {};
  function react(a, b, conf) { REACTIONS[keyOf(a, b)] = conf; }

  react('hcl', 'naoh', {
    phenomenon: '无明显现象，溶液温度升高',
    equation: 'HCl + NaOH → NaCl + H₂O',
    type: '中和反应',
    color: null, bubbles: 0, precipitate: null, heat: true
  });
  react('hcl', 'na2co3', {
    phenomenon: '产生大量气泡，气体使澄清石灰水变浑浊',
    equation: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑',
    type: '复分解反应',
    color: null, bubbles: 1, precipitate: null
  });
  react('hcl', 'caco3', {
    phenomenon: '固体逐渐溶解，表面产生气泡',
    equation: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑',
    type: '复分解反应',
    color: null, bubbles: 0.7, precipitate: null, dissolve: true
  });
  react('hcl', 'fe', {
    phenomenon: '铁钉表面产生气泡，溶液由无色变为浅绿色',
    equation: 'Fe + 2HCl → FeCl₂ + H₂↑',
    type: '置换反应',
    color: '#bfe0c8', bubbles: 0.5, precipitate: null
  });
  react('naoh', 'cuso4', {
    phenomenon: '产生蓝色絮状沉淀',
    equation: '2NaOH + CuSO₄ → Cu(OH)₂↓ + Na₂SO₄',
    type: '复分解反应',
    color: '#8fb8d8', bubbles: 0, precipitate: '#3f8fd0'
  });
  react('cuso4', 'fe', {
    phenomenon: '铁钉表面覆盖一层红色物质，溶液蓝色变浅',
    equation: 'Fe + CuSO₄ → FeSO₄ + Cu',
    type: '置换反应',
    color: '#cfe3d6', bubbles: 0, precipitate: null, coating: '#b5544a'
  });
  react('cacl2', 'na2co3', {
    phenomenon: '产生白色沉淀',
    equation: 'CaCl₂ + Na₂CO₃ → CaCO₃↓ + 2NaCl',
    type: '复分解反应',
    color: null, bubbles: 0, precipitate: '#f2f4f5'
  });
  react('hcl', 'cacl2', { phenomenon: '不发生反应', equation: '—', type: '无反应', color: null, bubbles: 0, precipitate: null });
  react('naoh', 'na2co3', { phenomenon: '不发生反应', equation: '—', type: '无反应', color: null, bubbles: 0, precipitate: null });
  react('naoh', 'fe', { phenomenon: '不发生反应', equation: '—', type: '无反应', color: null, bubbles: 0, precipitate: null });
  react('naoh', 'cacl2', { phenomenon: '不发生反应', equation: '—', type: '无反应', color: null, bubbles: 0, precipitate: null });

  function freeMix(values) {
    var a = values.reagentA || 'hcl';
    var b = values.reagentB || 'naoh';
    var ind = values.indicator || 'none';
    var ra = REAGENTS[a] || REAGENTS.hcl;
    var rb = REAGENTS[b] || REAGENTS.naoh;
    var same = a === b;
    var conf = same ? { phenomenon: '把同一种试剂倒进另一支试管，没有新物质生成', equation: '—', type: '无反应' }
      : (REACTIONS[keyOf(a, b)] || { phenomenon: '不发生反应', equation: '—', type: '无反应' });

    /* 指示剂的额外显色 */
    var indText = '';
    var indColor = null;
    var acidish = (ra.kind === 'acid' || rb.kind === 'acid') && !conf.bubbles;
    var baseish = (ra.kind === 'base' || rb.kind === 'base');
    if (ind === 'litmus') {
      if (conf.type === '中和反应' || baseish && !acidish) { indText = '石蕊变蓝（溶液显碱性）'; indColor = '#3f7fd0'; }
      else if (acidish) { indText = '石蕊变红（溶液显酸性）'; indColor = '#d9534f'; }
      else { indText = '石蕊仍为紫色'; indColor = '#8b6fbe'; }
    } else if (ind === 'phenolphthalein') {
      if (conf.type === '中和反应') { indText = '酚酞变红后又褪为无色（恰好中和）'; indColor = null; }
      else if (baseish && !acidish) { indText = '酚酞变红（溶液显碱性）'; indColor = '#e8607d'; }
      else { indText = '酚酞仍为无色'; indColor = null; }
    }

    /* 混合后的液体颜色 */
    var liquid = conf.color || (conf.precipitate ? '#c9dbe8' : (a === 'cuso4' ? ra.color : b === 'cuso4' ? rb.color : '#eef2f6'));
    if (indColor && !conf.precipitate) liquid = indColor;

    return {
      a: a, b: b,
      aLabel: ra.label, bLabel: rb.label,
      phenomenon: conf.phenomenon,
      equation: conf.equation,
      type: conf.type || '—',
      bubbles: conf.bubbles || 0,
      precipitate: conf.precipitate || null,
      coating: conf.coating || null,
      dissolve: !!conf.dissolve,
      heat: !!conf.heat,
      colored: !!conf.color,
      liquid: liquid,
      indicator: ind,
      indicatorText: indText || (ind === 'none' ? '未加指示剂' : ''),
      reacted: conf.type && conf.type !== '无反应'
    };
  }

  SL.chem = {
    clamp: clamp,
    round: round,
    OXY: OXY,
    BOTTLE_ML: BOTTLE_ML,
    ELECTROLYTES: ELECTROLYTES,
    INDICATORS: INDICATORS,
    REAGENTS: REAGENTS,
    ACID_ML: ACID_ML,
    IGNITE: IGNITE,
    oxygen: oxygen,
    combustion: combustion,
    electrolysis: electrolysis,
    acidBase: acidBase,
    freeMix: freeMix
  };
})();
