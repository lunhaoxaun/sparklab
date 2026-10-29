/* 力学计算引擎：杠杆平衡、滑轮组机械效率、浮力（纯函数，不碰 DOM） */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  SL.mech = SL.mech || {};

  var G = 10; /* 初中取 g = 10 N/kg */

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* ---------- 杠杆平衡 ----------
     values: { leftCount, leftArm, rightCount, rightArm, hookMass(g) }
     输出：两侧拉力、力矩、是否平衡、杠杆倾角（度） */
  function lever(values) {
    var mass = values.hookMass == null ? 50 : values.hookMass;
    var weight = (mass / 1000) * G;          /* 单个钩码重 N */
    var f1 = values.leftCount * weight;
    var f2 = values.rightCount * weight;
    var l1 = values.leftArm;                  /* 单位：格，1 格 = 5 cm */
    var l2 = values.rightArm;
    var l1cm = l1 * 5;
    var l2cm = l2 * 5;
    var m1 = f1 * l1cm;                       /* 力矩单位 N·cm */
    var m2 = f2 * l2cm;
    var diff = m1 - m2;
    var balanced = Math.abs(diff) < 1e-9;
    var maxM = Math.max(m1, m2, 1);
    /* 力矩差越大倾斜越明显，最大 16° */
    var angle = balanced ? 0 : clamp((diff / maxM) * 16, -16, 16);
    return {
      g: G,
      hookWeight: weight,
      f1: f1,
      f2: f2,
      l1: l1,
      l2: l2,
      m1: m1,
      m2: m2,
      diff: diff,
      balanced: balanced,
      angle: -angle,          /* 屏幕坐标：左侧下沉为正角度 */
      armCm: l1cm,
      armCm2: l2cm
    };
  }

  /* ---------- 滑轮组 ----------
     values: { segments, loadN, movingN, h, friction }
     segments：承担物重的绳段数（2/3/4）
     输出：绳端拉力 F、绳端移动距离 s、有用功、总功、机械效率 */
  function pulley(values) {
    var n = values.segments;
    var load = values.loadN;
    var moving = values.movingN;
    var h = values.h;
    var fric = values.friction == null ? 0.04 : values.friction;   /* 每段绳的等效摩擦阻力 N */
    var f = (load + moving + n * fric) / n;
    var s = n * h;
    var wUse = load * h;
    var wTotal = f * s;
    var eta = wTotal > 0 ? (wUse / wTotal) * 100 : 0;
    return {
      n: n,
      F: f,
      s: s,
      h: h,
      load: load,
      moving: moving,
      wUse: wUse,
      wTotal: wTotal,
      wExtra: wTotal - wUse,
      eta: eta,
      etaIdeal: (load / (load + moving)) * 100,
      segments: n
    };
  }

  /* ---------- 浮力（阿基米德原理） ----------
     values: { liquidRho(g/cm³), solidRho(g/cm³), volume(cm³), submerge(0~1) }
     物体挂在弹簧测力计下，逐渐浸入液体 */
  function buoyancy(values) {
    var rhoL = values.liquidRho;      /* g/cm³ */
    var rhoS = values.solidRho;
    var volume = values.volume;       /* cm³ */
    var ratio = clamp(values.submerge, 0, 1);
    var volumeM3 = volume * 1e-6;
    var vDisplaced = volumeM3 * ratio;
    var fBuoy = rhoL * 1000 * G * vDisplaced;
    var gObject = rhoS * 1000 * G * volumeM3;
    var gDisplaced = rhoL * 1000 * G * vDisplaced;   /* 排开液体所受重力 */
    var floats = rhoS < rhoL;
    var equilibriumRatio = floats ? rhoS / rhoL : 1;
    var reading = gObject - fBuoy;
    if (floats && ratio >= equilibriumRatio) reading = 0;   /* 已浮起，测力计不受力 */
    if (reading < 0) reading = 0;
    var state = floats
      ? (ratio >= equilibriumRatio - 1e-6 ? '漂浮' : '浸入中')
      : (Math.abs(rhoS - rhoL) < 1e-6 ? '悬浮' : (ratio >= 1 ? '浸没' : '浸入中'));
    return {
      rhoL: rhoL,
      rhoS: rhoS,
      volume: volume,
      ratio: ratio,
      vDisplaced: vDisplaced * 1e6,      /* 回到 cm³ 便于显示 */
      fBuoy: fBuoy,
      gObject: gObject,
      gDisplaced: gDisplaced,
      reading: reading,
      floats: floats,
      equilibriumRatio: equilibriumRatio,
      state: state,
      fNet: reading
    };
  }

  SL.mech.G = G;
  SL.mech.lever = lever;
  SL.mech.pulley = pulley;
  SL.mech.buoyancy = buoyancy;
  SL.mech.clamp = clamp;
})();
