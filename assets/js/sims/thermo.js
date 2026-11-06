/* 热学引擎：沸腾、比热容、熔化三套「加热—温度」模型
   全部为纯函数；随时间累积的状态放在实验模块的 rt 里，由 onTick 推进 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  var MAT = {
    water: { label: '水', c: 4200, melt: 0, boil: 100, Lf: 334000, Lv: 2260000 },
    oil: { label: '食用油', c: 2100, melt: -20, boil: 230, Lf: 0, Lv: 0 },
    ice: { label: '冰', c: 2100, melt: 0, boil: 100, Lf: 334000, Lv: 2260000 },
    hypo: { label: '海波', c: 1720, melt: 48, boil: 260, Lf: 230000, Lv: 0 },
    wax: { label: '蜡', c: 2200, melt: 60, boil: 300, Lf: 200000, Lv: 0 }
  };

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function num(v, def) { return typeof v === 'number' && isFinite(v) ? v : def; }
  function round(v, digits) {
    var k = Math.pow(10, digits == null ? 1 : digits);
    return Math.round(v * k) / k;
  }

  function effectivePower(values) {
    var power = num(values.power, 500);
    return power * (values.cover ? 0.85 : 0.62);
  }

  /* ---------- 水沸腾 ---------- */
  function boiling(values, rt) {
    rt = rt || { t: 0, temp: 20, vapor: 0, maxTemp: 20, plateauT: 0 };
    var mass = num(values.mass, 100);
    var pEff = effectivePower(values);
    var vapor = Math.min(mass, num(rt.vapor, 0));
    var vaporRatio = mass ? vapor / mass : 0;
    var reached = rt.temp >= 99.99;
    var phase = vaporRatio >= 0.999 ? '已汽化' : reached ? '沸腾中' : '升温中';
    return {
      t: num(rt.t, 0),
      temp: num(rt.temp, 20),
      phase: phase,
      reached: reached,
      vapor: vapor,
      vaporRatio: clamp(vaporRatio, 0, 1),
      remaining: Math.max(0, mass - vapor),
      absorbed: pEff * num(rt.t, 0),
      powerEff: pEff,
      boilPoint: MAT.water.boil,
      plateau: num(rt.plateauT, 0),
      maxTemp: num(rt.maxTemp, 20),
      mass: mass
    };
  }

  function tickBoiling(dt, values, rt) {
    var mass = num(values.mass, 100);
    var m = mass / 1000;
    var pEff = effectivePower(values);
    rt.t = num(rt.t, 0) + dt;
    rt.heat = num(rt.heat, 0) + pEff * dt;
    rt.vapor = num(rt.vapor, 0);
    rt.plateauT = num(rt.plateauT, 0);

    if (rt.temp < MAT.water.boil) {
      var need = m * MAT.water.c * (MAT.water.boil - rt.temp);
      var energy = pEff * dt;
      if (energy < need) {
        rt.temp += energy / (m * MAT.water.c);
      } else {
        var rest = energy - need;
        rt.temp = MAT.water.boil;
        rt.plateauT += dt - need / pEff;
        rt.vapor = Math.min(mass, rt.vapor + rest / MAT.water.Lv * 1000);
      }
    } else if (rt.vapor < mass) {
      rt.temp = MAT.water.boil;
      rt.vapor = Math.min(mass, rt.vapor + pEff * dt / MAT.water.Lv * 1000);
      rt.plateauT += dt;
    } else {
      rt.temp = Math.min(110, rt.temp + dt * 0.2);
    }

    rt.maxTemp = Math.max(num(rt.maxTemp, 20), rt.temp);
    rt.touched = true;
    return rt;
  }

  /* ---------- 比热容 ---------- */
  function heatCapacity(values, rt) {
    rt = rt || { t: 0, ta: 20, tb: 20 };
    var a = MAT[values.materialA] || MAT.water;
    var b = MAT[values.materialB] || MAT.oil;
    var dTA = num(rt.ta, 20) - 20;
    var dTB = num(rt.tb, 20) - 20;
    return {
      t: num(rt.t, 0),
      ta: num(rt.ta, 20),
      tb: num(rt.tb, 20),
      dTA: Math.max(0, dTA),
      dTB: Math.max(0, dTB),
      ratio: dTA > 0.01 ? dTB / dTA : 0,
      heatRatio: a.c && b.c ? b.c / a.c : 0,
      cA: a.c,
      cB: b.c,
      labelA: a.label,
      labelB: b.label,
      slower: dTA <= dTB ? a.label : b.label,
      faster: dTA <= dTB ? b.label : a.label
    };
  }

  function tickHeatCapacity(dt, values, rt) {
    var mass = num(values.mass, 100) / 1000;
    var power = num(values.power, 300);
    var a = MAT[values.materialA] || MAT.water;
    var b = MAT[values.materialB] || MAT.oil;
    rt.t = num(rt.t, 0) + dt;
    if (rt.ta < 95) rt.ta = Math.min(95, rt.ta + power / (mass * a.c) * dt);
    if (rt.tb < 95) rt.tb = Math.min(95, rt.tb + power / (mass * b.c) * dt);
    rt.touched = true;
    return rt;
  }

  /* ---------- 晶体熔化 ---------- */
  function melting(values, rt) {
    var src = MAT[values.material] || MAT.ice;
    var mass = num(values.mass, 100);
    rt = rt || { t: 0, temp: -10, melted: 0 };
    var melted = clamp(num(rt.melted, 0), 0, mass);
    var progress = mass ? melted / mass * 100 : 0;
    var phase = progress >= 99.9 ? '已全部熔化'
      : progress > 0 ? '熔化中'
        : (rt.temp >= src.melt - 0.01 ? '即将熔化' : '固态升温');
    return {
      t: num(rt.t, 0),
      temp: num(rt.temp, -10),
      phase: phase,
      stateText: phase,
      meltPoint: src.melt,
      material: src.label,
      melted: melted,
      progress: progress,
      remaining: Math.max(0, mass - melted),
      absorbed: num(rt.heat, 0),
      mass: mass
    };
  }

  function tickMelting(dt, values, rt) {
    var src = MAT[values.material] || MAT.ice;
    var mass = num(values.mass, 100);
    var m = mass / 1000;
    var power = num(values.power, 500) * 0.75;
    rt.t = num(rt.t, 0) + dt;
    rt.heat = num(rt.heat, 0) + power * dt;
    rt.melted = num(rt.melted, 0);

    if (rt.temp < src.melt) {
      rt.temp = Math.min(src.melt, rt.temp + power / (m * src.c) * dt);
    } else if (rt.melted < mass) {
      rt.temp = src.melt;
      rt.melted = Math.min(mass, rt.melted + power * dt / src.Lf * 1000);
    } else {
      rt.temp = Math.min(src.melt + 30, rt.temp + power / (m * src.c) * dt);
    }
    rt.touched = true;
    return rt;
  }

  SL.thermo = {
    MAT: MAT,
    boiling: boiling,
    tickBoiling: tickBoiling,
    heatCapacity: heatCapacity,
    tickHeatCapacity: tickHeatCapacity,
    melting: melting,
    tickMelting: tickMelting,
    effectivePower: effectivePower,
    clamp: clamp,
    round: round
  };
})();
