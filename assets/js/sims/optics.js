/* 光学引擎：光的反射、平面镜成像、凸透镜成像
   全部为纯函数，画布只负责把计算结果画成光线 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function num(v, def) { return typeof v === 'number' && isFinite(v) ? v : def; }
  function round(v, digits) {
    var k = Math.pow(10, digits == null ? 1 : digits);
    return Math.round(v * k) / k;
  }

  function reflection(values) {
    var i = clamp(num(values.incidence, 45), 0, 89);
    var fold = !!values.fold;
    return {
      i: i,
      r: i,
      deviation: 180 - 2 * i,
      coplanar: !fold,
      reflectedVisible: !fold,
      fold: fold,
      normalAngle: 90,
      text: fold ? '光屏翻折后看不到反射光线' : '反射角等于入射角：r = i = ' + round(i, 0) + '°'
    };
  }

  function planeMirror(values) {
    var u = clamp(num(values.distance, 15), 1, 40);
    var h = clamp(num(values.height, 4), 1, 12);
    return {
      u: u,
      v: u,
      h: h,
      imageH: h,
      upright: true,
      virtual: true,
      sameSize: true,
      text: '像与物关于镜面对称：v = u = ' + round(u, 1) + ' cm'
    };
  }

  function classify(u, f, v) {
    if (Math.abs(u - f) < 0.5) return { key: 'u=f', position: 'u = f', text: '不成像（平行光）' };
    if (u > 2 * f) return { key: 'u>2f', position: 'u > 2f', text: '倒立、缩小的实像' };
    if (Math.abs(u - 2 * f) < 0.5) return { key: 'u=2f', position: 'u = 2f', text: '倒立、等大的实像' };
    if (u > f) return { key: 'f<u<2f', position: 'f < u < 2f', text: '倒立、放大的实像' };
    return { key: 'u<f', position: 'u < f', text: '正立、放大的虚像' };
  }

  function lens(values) {
    var f = clamp(num(values.focal, 10), 1, 40);
    var u = clamp(num(values.u, 30), 1, 80);
    var h = clamp(num(values.height, 4), 0.5, 12);
    var cls = classify(u, f, null);
    if (Math.abs(u - f) < 0.5) {
      return {
        f: f, u: u, height: h, v: null, m: null, imageH: null,
        real: false, upright: false, noImage: true,
        nature: cls.text, position: cls.position, key: cls.key,
        distanceText: 'u = f，折射光线平行射出'
      };
    }
    var v = u * f / (u - f);
    var m = Math.abs(v / u);
    var imageH = h * m;
    var real = v > 0;
    var upright = !real;
    var size = m > 1.0001 ? '放大' : m < 0.9999 ? '缩小' : '等大';
    var nature = (upright ? '正立' : '倒立') + '、' + size + '的' + (real ? '实像' : '虚像');
    var position = cls.position;
    return {
      f: f, u: u, height: h, v: v, m: m, imageH: imageH,
      real: real, upright: upright, noImage: false,
      nature: nature, position: position, key: cls.key,
      sameSize: Math.abs(m - 1) < 0.002,
      distanceText: real ? 'v = ' + round(v, 1) + ' cm（异侧）' : 'v = ' + round(v, 1) + ' cm（同侧虚像）'
    };
  }

  SL.optics = {
    reflection: reflection,
    planeMirror: planeMirror,
    lens: lens,
    classify: classify,
    clamp: clamp,
    round: round
  };
})();
