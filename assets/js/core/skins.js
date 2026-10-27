/* 元件皮肤：教材符号（classic）与拟真元件（nb）两套视觉，可切换 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  var C = {
    shell: '#e6edf5', shellTop: '#cfdae6', edge: '#8b9db0',
    steel: '#b3bfcc', steelDark: '#6d7a88', brass: '#c9a24a', brassDark: '#8a6a26',
    dark: '#2e3a45', red: '#c0392b', black: '#2b323a', green: '#356b4f'
  };

  function num(v, d) { return SL.fmt(v, d == null ? 2 : d); }

  function signed(v, d) {
    if (v > 1e-9) return '+' + SL.fmt(v, d);
    if (v < -1e-9) return '−' + SL.fmt(-v, d);
    return SL.fmt(0, d);
  }

  /* ---------- 电池组 ---------- */
  function battery(comp) {
    var cells = Math.max(1, Math.min(4, Math.round((comp.props || {}).cells || 2)));
    var body =
      '<rect x="-42" y="-19" width="84" height="38" rx="6" fill="#2e4a3d" stroke="#1a2e25" stroke-width="1.4"/>' +
      '<rect x="-42" y="-19" width="84" height="11" rx="6" fill="#ffffff" opacity=".16"/>';
    for (var i = 0; i < cells; i++) {
      var cx = -30 + i * 20;
      body +=
        '<rect x="' + (cx - 8) + '" y="-12" width="16" height="24" rx="3" fill="#1b2a22" stroke="#101a16" stroke-width="1"/>' +
        '<rect x="' + (cx - 6) + '" y="-12" width="12" height="5" rx="2" fill="' + C.brass + '"/>' +
        '<text x="' + cx + '" y="9" fill="#e8f3ec" font-size="7" text-anchor="middle">1.5V</text>';
    }
    body += '<text x="-35" y="4" fill="#ffffff" font-size="12" font-weight="700">+</text>' +
      '<text x="29" y="4" fill="#ffffff" font-size="12" font-weight="700">−</text>';
    return body;
  }

  /* ---------- 学生电源 ---------- */
  function dcsupply(comp, board) {
    var v = Math.max(1.5, Math.min(12, Number((comp.props || {}).voltage) || 3));
    var info = board.result && board.result.supplies ? board.result.supplies[comp.id] : null;
    var shown = info ? info.voltage : v;
    return '<rect x="-44" y="-21" width="88" height="42" rx="6" fill="' + C.shell + '" stroke="' + C.edge + '" stroke-width="1.4"/>' +
      '<rect x="-44" y="-21" width="88" height="12" rx="6" fill="' + C.shellTop + '"/>' +
      '<rect x="-35" y="-13" width="42" height="23" rx="3" fill="#152019" stroke="#0b120e" stroke-width="1"/>' +
      '<text x="-14" y="5" fill="#7ef0a4" font-size="12" text-anchor="middle" font-family="Consolas, monospace">' + num(shown, 1) + 'V</text>' +
      '<circle cx="26" cy="0" r="9.5" fill="' + C.steel + '" stroke="' + C.steelDark + '" stroke-width="1.2"/>' +
      '<line x1="26" y1="0" x2="26" y2="-7" stroke="' + C.dark + '" stroke-width="2"/>' +
      '<text x="-37" y="16" fill="' + C.red + '" font-size="8">＋</text>' +
      '<text x="31" y="16" fill="' + C.black + '" font-size="8">－</text>';
  }

  /* ---------- 开关 ---------- */
  function sw(comp) {
    var closed = !!(comp.props || {}).closed;
    return '<rect x="-36" y="-20" width="72" height="40" rx="8" fill="#f3f6fa" stroke="#a7b5c5" stroke-width="1.3"/>' +
      '<rect x="-36" y="-20" width="72" height="9" rx="8" fill="#dde5ee"/>' +
      '<circle cx="-16" cy="4" r="5" fill="' + C.brass + '" stroke="' + C.brassDark + '" stroke-width="1"/>' +
      '<circle cx="16" cy="4" r="5" fill="' + C.brass + '" stroke="' + C.brassDark + '" stroke-width="1"/>' +
      '<line x1="-16" y1="4" x2="' + (closed ? 16 : 13) + '" y2="' + (closed ? 4 : -13) + '" stroke="' + C.steelDark + '" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="' + (closed ? 16 : 13) + '" cy="' + (closed ? 4 : -13) + '" r="4.2" fill="' + C.red + '"/>';
  }

  /* ---------- 单刀双掷开关 ---------- */
  function spdt(comp) {
    var toC = (comp.props || {}).to === 'c';
    return '<rect x="-36" y="-18" width="72" height="34" rx="8" fill="#f3f6fa" stroke="#a7b5c5" stroke-width="1.3"/>' +
      '<circle cx="-24" cy="4" r="4.6" fill="' + C.brass + '" stroke="' + C.brassDark + '" stroke-width="1"/>' +
      '<circle cx="-8" cy="-8" r="4.6" fill="' + C.brass + '" stroke="' + C.brassDark + '" stroke-width="1"/>' +
      '<circle cx="22" cy="4" r="4.6" fill="' + C.brass + '" stroke="' + C.brassDark + '" stroke-width="1"/>' +
      '<line x1="-24" y1="4" x2="' + (toC ? 22 : -8) + '" y2="' + (toC ? 4 : -8) + '" stroke="' + C.steelDark + '" stroke-width="4" stroke-linecap="round"/>' +
      '<text x="-8" y="-13" class="comp-value">b</text>' +
      '<text x="24" y="-12" class="comp-value">c</text>';
  }

  /* ---------- 小灯泡 ---------- */
  function bulb(comp, board) {
    var ratio = 0;
    var b = board.result && board.result.bulbs ? board.result.bulbs[comp.id] : null;
    if (b) ratio = Math.max(0, Math.min(1.4, b.ratio || 0));
    var burned = !!(comp.props || {}).burned;
    return (ratio > 0.05 ? '<circle cx="0" cy="0" r="50" fill="url(#bulb-glow)" opacity="' + Math.min(1, ratio).toFixed(2) + '"/>' : '') +
      '<path d="M-20 18 Q-24 -6 -14 -18 Q0 -30 14 -18 Q24 -6 20 18 Z" fill="' + (burned ? '#ddd6d6' : '#eaf4ff') + '" stroke="#7e98b4" stroke-width="1.6"/>' +
      '<path d="M-13 -6 Q-8 6 0 0 Q8 -6 13 6" fill="none" stroke="' + (burned ? '#8d7b7b' : '#d08b2c') + '" stroke-width="1.8"/>' +
      '<rect x="-9" y="18" width="18" height="13" rx="2" fill="' + C.steel + '" stroke="' + C.steelDark + '" stroke-width="1"/>' +
      '<line x1="-9" y1="23" x2="9" y2="23" stroke="#7d8a98" stroke-width="1"/>' +
      '<line x1="-9" y1="27" x2="9" y2="27" stroke="#7d8a98" stroke-width="1"/>' +
      '<line x1="-30" y1="0" x2="-19" y2="6" stroke="#6d7a88" stroke-width="2"/>' +
      '<line x1="30" y1="0" x2="19" y2="6" stroke="#6d7a88" stroke-width="2"/>';
  }

  /* ---------- 发光二极管 ---------- */
  function led(comp, board) {
    var info = board.result && board.result.leds ? board.result.leds[comp.id] : null;
    var on = !!(info && info.on);
    return (on ? '<circle cx="0" cy="-4" r="40" fill="url(#bulb-glow)" opacity="0.75"/>' : '') +
      '<path d="M-16 10 Q-16 -18 0 -18 Q16 -18 16 10 Z" fill="' + (on ? '#ff7a6b' : '#d9534a') + '" opacity="' + (on ? '.95' : '.75') + '" stroke="#8e2f27" stroke-width="1.4"/>' +
      '<rect x="-16" y="10" width="32" height="5" rx="2" fill="#c3ced9"/>' +
      '<line x1="-34" y1="0" x2="-16" y2="4" stroke="#8b98a6" stroke-width="2"/>' +
      '<line x1="34" y1="0" x2="16" y2="4" stroke="#8b98a6" stroke-width="2"/>' +
      (on ? '<text x="0" y="30" class="comp-value">发光</text>' : '');
  }

  /* ---------- 定值电阻 ---------- */
  function resistor(comp) {
    var p = comp.props || {};
    var bands = ['#7b4b28', '#2c2c2c', '#c0392b', '#c9a24a'];
    var bandMarkup = '';
    for (var i = 0; i < bands.length; i++) {
      bandMarkup += '<rect x="' + (-22 + i * 7) + '" y="-8" width="4.5" height="16" fill="' + bands[i] + '"/>';
    }
    return '<line x1="-46" y1="0" x2="-32" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<line x1="32" y1="0" x2="46" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<rect x="-32" y="-10" width="64" height="20" rx="7" fill="#e7d7b8" stroke="#bda57b" stroke-width="1.4"/>' +
      bandMarkup +
      '<text x="0" y="-17" class="comp-value">' + (p.unknown ? 'Rx' : (p.resistance || 10) + 'Ω') + '</text>';
  }

  /* ---------- 电阻箱 ---------- */
  function resistanceBox(comp) {
    var digits = Array.isArray((comp.props || {}).digits) ? comp.props.digits : [0, 0, 1, 0];
    var weights = [1000, 100, 10, 1];
    var total = 0;
    var markup = '';
    for (var i = 0; i < 4; i++) {
      var d = Math.max(0, Math.min(9, Math.round(Number(digits[i]) || 0)));
      total += d * weights[i];
      var wx = -33 + i * 22;
      markup += '<rect x="' + (wx - 9) + '" y="-13" width="18" height="26" rx="5" fill="' + C.steel + '" stroke="' + C.steelDark + '" stroke-width="1.1"/>' +
        '<text x="' + wx + '" y="4" fill="#243141" font-size="11" text-anchor="middle">' + d + '</text>' +
        '<text x="' + wx + '" y="19" class="comp-value">×' + weights[i] + '</text>';
    }
    return '<rect x="-44" y="-19" width="88" height="38" rx="5" fill="' + C.shell + '" stroke="' + C.edge + '" stroke-width="1.4"/>' +
      '<rect x="-44" y="-19" width="88" height="8" rx="5" fill="' + C.shellTop + '"/>' +
      markup +
      '<text x="0" y="-24" class="comp-value">' + total + 'Ω</text>';
  }

  /* ---------- 滑动变阻器 ---------- */
  function rheostat(comp, board) {
    var p = comp.props || {};
    var slider = Math.max(0, Math.min(1, p.slider == null ? 0.5 : p.slider));
    var knobX = -48 + slider * 96;
    var info = SL.circuit.rheostatInfo(comp, board.scene);
    var shown = info.wiring === 'incomplete' ? '未接入' : (info.active < 0.05 ? '≈0' : String(Math.round(info.active * 10) / 10)) + 'Ω';
    var coils = '';
    for (var i = 0; i < 18; i++) {
      coils += '<line x1="' + (-45 + i * 5.2) + '" y1="-9" x2="' + (-45 + i * 5.2) + '" y2="9" stroke="#b98b4a" stroke-width="1.6"/>';
    }
    return '<rect x="-52" y="-13" width="104" height="26" rx="5" fill="#efe4cd" stroke="#c2ac82" stroke-width="1.4"/>' +
      coils +
      '<line x1="-66" y1="-24" x2="66" y2="-24" stroke="#9aa8b6" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="' + knobX + '" y1="-24" x2="' + knobX + '" y2="-12" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<rect x="' + (knobX - 8) + '" y="-32" width="16" height="9" rx="3" fill="' + C.red + '"/>' +
      '<circle cx="' + knobX + '" cy="-24" r="8" fill="' + C.dark + '" stroke="#1b242d" stroke-width="1.2" data-slider="' + comp.id + '"/>' +
      '<text x="0" y="32" class="comp-value">' + shown + '</text>';
  }

  /* ---------- 电流表 / 电压表 ---------- */
  function meter(comp, board) {
    var isA = comp.type === 'ammeter';
    var range = Number((comp.props || {}).range) || (isA ? 0.6 : 3);
    var m = board.result && board.result.meters ? board.result.meters[comp.id] : null;
    var val = m ? Math.abs(m.value) : 0;
    var over = !!(m && m.overRange);
    var ratio = Math.max(-1, Math.min(1, val / range));
    var needle = ratio * 62;
    return '<rect x="-30" y="-30" width="60" height="60" rx="8" fill="#f4f7fb" stroke="#96a6b8" stroke-width="1.6"/>' +
      '<path d="M-21 12 A21 21 0 0 1 21 12" fill="none" stroke="' + (over ? C.red : '#8fa3b8') + '" stroke-width="1.4"/>' +
      '<line x1="0" y1="16" x2="0" y2="-20" stroke="' + (over ? C.red : '#33414f') + '" stroke-width="1.8" transform="rotate(' + needle.toFixed(1) + ')"/>' +
      '<circle cx="0" cy="16" r="3" fill="#33414f"/>' +
      '<text x="0" y="-8" class="meter-letter">' + (isA ? 'A' : 'V') + '</text>' +
      '<text x="0" y="44" class="comp-value ' + (over ? 'danger' : '') + '">' + num(val, isA ? 2 : 1) + (over ? ' ⚠' : '') + '</text>';
  }

  /* ---------- 电动机 ---------- */
  function motor(comp, board) {
    var info = board.result && board.result.motors ? board.result.motors[comp.id] : null;
    var spinning = !!(info && info.spinning);
    return '<line x1="-44" y1="0" x2="-30" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<line x1="30" y1="0" x2="44" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<rect x="-30" y="-24" width="60" height="48" rx="8" fill="' + C.steel + '" stroke="' + C.steelDark + '" stroke-width="1.6"/>' +
      '<rect x="-30" y="-24" width="60" height="14" rx="8" fill="#ffffff" opacity=".28"/>' +
      '<circle cx="0" cy="0" r="14" fill="#8494a4" stroke="#5d6b79" stroke-width="1.2"/>' +
      '<text x="0" y="5" fill="#1f2a35" font-size="13" font-weight="700" text-anchor="middle">M</text>' +
      (spinning ? '<path d="M-13 -30 Q0 -38 13 -30" fill="none" stroke="' + C.red + '" stroke-width="2"/>' : '');
  }

  /* ---------- 电铃 ---------- */
  function bell(comp, board) {
    var info = board.result && board.result.bells ? board.result.bells[comp.id] : null;
    var ringing = !!(info && info.ringing);
    return '<line x1="-44" y1="0" x2="-26" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<line x1="26" y1="0" x2="44" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<path d="M-24 12 Q-24 -20 0 -20 Q24 -20 24 12 Z" fill="' + C.brass + '" stroke="' + C.brassDark + '" stroke-width="1.5"/>' +
      '<rect x="-28" y="12" width="56" height="6" rx="3" fill="#8a6a26"/>' +
      '<circle cx="0" cy="20" r="4.5" fill="' + C.steelDark + '"/>' +
      (ringing ? '<path d="M-34 -16 Q-42 -2 -34 10 M34 -16 Q42 -2 34 10" fill="none" stroke="' + C.red + '" stroke-width="2"/>' : '');
  }

  /* ---------- 保险丝 ---------- */
  function fuse(comp, board) {
    var p = comp.props || {};
    var info = board.result && board.result.fuses ? board.result.fuses[comp.id] : null;
    var blown = !!(p.blown || (info && info.blown));
    return '<line x1="-46" y1="0" x2="-32" y2="0" stroke="#8b98a6" stroke-width="2.2"/>' +
      '<line x1="32" y1="0" x2="46" y2="0" stroke="#8b98a6" stroke-width="2.2"/>' +
      '<rect x="-32" y="-9" width="64" height="18" rx="9" fill="#e9f2f8" opacity=".92" stroke="#a9bccc" stroke-width="1.2"/>' +
      '<rect x="-34" y="-9" width="8" height="18" rx="3" fill="' + C.steel + '" stroke="' + C.steelDark + '" stroke-width="1"/>' +
      '<rect x="26" y="-9" width="8" height="18" rx="3" fill="' + C.steel + '" stroke="' + C.steelDark + '" stroke-width="1"/>' +
      (blown
        ? '<line x1="-24" y1="0" x2="-4" y2="0" stroke="' + C.red + '" stroke-width="1.8"/>' +
          '<line x1="4" y1="0" x2="24" y2="0" stroke="' + C.red + '" stroke-width="1.8"/>' +
          '<text x="0" y="3" fill="' + C.red + '" font-size="9" text-anchor="middle">熔断</text>'
        : '<line x1="-24" y1="0" x2="24" y2="0" stroke="#b0762a" stroke-width="1.8"/>') +
      '<text x="0" y="-15" class="comp-value">' + (p.rating || 0.5) + 'A</text>';
  }

  /* ---------- 电磁铁 ---------- */
  function electromagnet(comp, board) {
    var info = board.result && board.result.electromagnets ? board.result.electromagnets[comp.id] : null;
    var on = !!(info && info.on);
    var left = !on ? 'N' : (info.poleN === 'left' ? 'N' : 'S');
    var right = !on ? 'S' : (info.poleN === 'left' ? 'S' : 'N');
    var windings = '';
    for (var i = 0; i < 5; i++) {
      windings += '<ellipse cx="' + (-16 + i * 8) + '" cy="0" rx="3.4" ry="16" fill="none" stroke="#b5762f" stroke-width="2"/>';
    }
    return '<rect x="-34" y="-20" width="68" height="40" rx="4" fill="' + C.steel + '" opacity=".35"/>' +
      windings +
      '<rect x="-36" y="-6" width="8" height="12" rx="2" fill="' + C.steelDark + '"/>' +
      '<rect x="28" y="-6" width="8" height="12" rx="2" fill="' + C.steelDark + '"/>' +
      '<text x="-46" y="5" fill="' + (on ? C.red : '#8b9db0') + '" font-size="11" font-weight="700">' + left + '</text>' +
      '<text x="41" y="5" fill="' + (on ? '#2f6fb2' : '#8b9db0') + '" font-size="11" font-weight="700">' + right + '</text>';
  }

  /* ---------- 手摇发电机 ---------- */
  function generator(comp, board) {
    var p = comp.props || {};
    var info = board && board.result && board.result.generators ? board.result.generators[comp.id] : null;
    var running = info ? info.emf > 0 : p.running !== false;
    var emf = info ? info.emf : (p.running === false ? 0 : Math.max(1.5, Math.min(12, Number(p.voltage) || 3)));
    var rotor =
      '<circle cx="0" cy="0" r="13" fill="#8494a4" stroke="' + C.steelDark + '" stroke-width="1.2"/>' +
      '<line x1="-11" y1="0" x2="11" y2="0" stroke="' + C.dark + '" stroke-width="2.4"/>' +
      '<line x1="0" y1="-11" x2="0" y2="11" stroke="' + C.dark + '" stroke-width="2.4"/>' +
      '<circle cx="0" cy="0" r="3.4" fill="' + C.shellTop + '" stroke="' + C.steelDark + '" stroke-width="1"/>' +
      (running ? '<animateTransform attributeName="transform" type="rotate" additive="sum" from="0 0 0" to="360 0 0" dur="1.1s" repeatCount="indefinite"/>' : '');
    return '<line x1="-48" y1="0" x2="-40" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<line x1="40" y1="0" x2="48" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<rect x="-40" y="-26" width="70" height="52" rx="8" fill="' + C.shell + '" stroke="' + C.edge + '" stroke-width="1.4"/>' +
      '<rect x="-40" y="-26" width="70" height="12" rx="8" fill="' + C.shellTop + '"/>' +
      '<g transform="translate(-8 2)">' + rotor + '</g>' +
      '<circle cx="30" cy="2" r="11" fill="' + C.steel + '" stroke="' + C.steelDark + '" stroke-width="1.3"/>' +
      '<circle cx="30" cy="2" r="4" fill="' + C.dark + '" opacity=".7"/>' +
      '<path d="M-8 -16 Q10 -28 30 -9 M-8 20 Q10 32 30 13" fill="none" stroke="' + C.dark + '" stroke-width="1.6" opacity=".55"/>' +
      '<line x1="30" y1="2" x2="39" y2="-9" stroke="' + C.steelDark + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="39" cy="-9" r="3.2" fill="' + C.red + '"/>' +
      (running ? '<path d="M-20 -30 Q-14 -36 -8 -30" fill="none" stroke="' + C.red + '" stroke-width="2"/>' : '') +
      '<text x="-6" y="42" class="comp-value">' + num(emf, 1) + 'V</text>';
  }

  /* ---------- 电磁继电器 ---------- */
  function relay(comp, board) {
    var info = board && board.result && board.result.relays ? board.result.relays[comp.id] : null;
    var on = !!(info && info.energized);
    var windings = '';
    for (var i = 0; i < 4; i++) {
      windings += '<ellipse cx="' + (-36 + i * 7) + '" cy="0" rx="3" ry="13" fill="none" stroke="#b5762f" stroke-width="1.8"/>';
    }
    return '<rect x="-48" y="-34" width="96" height="68" rx="7" fill="' + C.shell + '" stroke="' + C.edge + '" stroke-width="1.4"/>' +
      '<rect x="-48" y="-34" width="96" height="12" rx="7" fill="' + C.shellTop + '"/>' +
      '<line x1="-55" y1="22" x2="-44" y2="16" stroke="#8b98a6" stroke-width="2"/>' +
      '<line x1="-55" y1="-22" x2="-44" y2="-16" stroke="#8b98a6" stroke-width="2"/>' +
      '<rect x="-44" y="-16" width="26" height="32" rx="3" fill="' + C.steel + '" opacity=".35"/>' +
      windings +
      '<line x1="55" y1="26" x2="26" y2="26" stroke="#8b98a6" stroke-width="2"/>' +
      '<line x1="55" y1="0" x2="44" y2="0" stroke="#8b98a6" stroke-width="2"/>' +
      '<line x1="55" y1="-22" x2="44" y2="-22" stroke="#8b98a6" stroke-width="2"/>' +
      '<circle cx="44" cy="0" r="4.2" fill="' + (on ? C.green : C.steel) + '" stroke="' + (on ? '#1e4a34' : C.steelDark) + '" stroke-width="1"/>' +
      '<circle cx="44" cy="-22" r="4.2" fill="' + (on ? C.steel : C.green) + '" stroke="' + (on ? C.steelDark : '#1e4a34') + '" stroke-width="1"/>' +
      '<circle cx="26" cy="26" r="5" fill="' + C.steelDark + '"/>' +
      '<line x1="26" y1="26" x2="44" y2="' + (on ? 0 : -22) + '" stroke="' + C.dark + '" stroke-width="4" stroke-linecap="round"/>' +
      '<text x="-12" y="31" class="comp-value">' + (on ? '吸合' : '释放') + '</text>';
  }

  /* ---------- 扬声器 ---------- */
  function speaker(comp, board) {
    var info = board && board.result && board.result.speakers ? board.result.speakers[comp.id] : null;
    var active = !!(info && info.active);
    return '<line x1="-44" y1="0" x2="-28" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<line x1="32" y1="0" x2="44" y2="0" stroke="#8b98a6" stroke-width="2.4"/>' +
      '<rect x="-28" y="-16" width="18" height="32" rx="3" fill="' + C.dark + '" stroke="#1b242d" stroke-width="1"/>' +
      '<rect x="-26" y="-12" width="14" height="24" rx="2" fill="' + C.steel + '" opacity=".45"/>' +
      '<path d="M-10 -24 L24 -12 L32 -10 L32 10 L24 12 L-10 24 Z" fill="' + C.steel + '" stroke="' + C.steelDark + '" stroke-width="1.3"/>' +
      '<rect x="32" y="-12" width="5" height="24" rx="2" fill="' + C.steelDark + '"/>' +
      (active
        ? '<path d="M40 -12 Q48 0 40 12 M47 -19 Q58 0 47 19" fill="none" stroke="' + C.red + '" stroke-width="2.2"/>' +
          '<text x="-2" y="42" class="comp-value">发声</text>'
        : '<text x="-2" y="42" class="comp-value">无声</text>');
  }

  /* ---------- 灵敏电流计 ---------- */
  function galvanometer(comp, board) {
    var p = comp.props || {};
    var range = Number(p.range) || 0.1;
    var m = board && board.result && board.result.meters ? board.result.meters[comp.id] : null;
    var value = m ? m.value : 0;
    var over = !!(m && m.overRange);
    var deg = Math.max(-1, Math.min(1, value / range)) * 55;
    return '<rect x="-28" y="-28" width="56" height="56" rx="7" fill="#f4f7fb" stroke="' + (over ? C.red : '#96a6b8') + '" stroke-width="1.6"/>' +
      '<path d="M-20 12 A21 21 0 0 1 20 12" fill="none" stroke="' + (over ? C.red : '#8fa3b8') + '" stroke-width="1.4"/>' +
      '<line x1="-15.3" y1="-12.9" x2="-12.3" y2="-10.3" stroke="#35506b" stroke-width="1.2"/>' +
      '<line x1="-8.5" y1="-18.1" x2="-6.8" y2="-14.5" stroke="#35506b" stroke-width="1.2"/>' +
      '<line x1="0" y1="-20" x2="0" y2="-15.5" stroke="#35506b" stroke-width="1.6"/>' +
      '<line x1="8.5" y1="-18.1" x2="6.8" y2="-14.5" stroke="#35506b" stroke-width="1.2"/>' +
      '<line x1="15.3" y1="-12.9" x2="12.3" y2="-10.3" stroke="#35506b" stroke-width="1.2"/>' +
      '<text x="0" y="-8" class="comp-value">0</text>' +
      '<line x1="0" y1="14" x2="0" y2="-20" stroke="' + (over ? C.red : '#33414f') + '" stroke-width="1.8" transform="rotate(' + deg.toFixed(1) + ')"/>' +
      '<circle cx="0" cy="14" r="3" fill="#33414f"/>' +
      '<text x="0" y="24" class="comp-value">G</text>' +
      '<text x="0" y="42" class="comp-value' + (over ? ' danger' : '') + '">' + signed(value, 3) + ' A</text>';
  }

  var RENDER = {
    battery: battery,
    dcsupply: dcsupply,
    switch: sw,
    'switch-spdt': spdt,
    bulb: bulb,
    led: led,
    resistor: resistor,
    'resistance-box': resistanceBox,
    rheostat: rheostat,
    ammeter: meter,
    voltmeter: meter,
    motor: motor,
    bell: bell,
    fuse: fuse,
    electromagnet: electromagnet,
    generator: generator,
    relay: relay,
    speaker: speaker,
    galvanometer: galvanometer
  };

  var listeners = [];

  var skins = {
    list: [
      { id: 'classic', label: '教材符号' },
      { id: 'nb', label: '拟真元件' }
    ],
    current: function () {
      var id = SL.settings.get('skin');
      return id === 'nb' ? 'nb' : 'classic';
    },
    set: function (id) {
      if (!skins.list.some(function (s) { return s.id === id; })) return false;
      SL.settings.set('skin', id);
      listeners.forEach(function (fn) { fn(id); });
      return true;
    },
    onChange: function (fn) { listeners.push(fn); },
    /* 拟真皮肤的元件主体；classic 由 board.js 自行绘制 */
    body: function (comp, board) {
      var render = RENDER[comp.type];
      return render ? render(comp, board) : '';
    },
    /* 元件库缩略图（拟真皮肤使用） */
    thumb: function (type) {
      var def = SL.circuit.TYPES[type];
      if (!def) return SL.icon('settings', '', 22);
      if (skins.current() === 'classic') return '';
      var comp = { id: 'thumb-' + type, type: type, props: JSON.parse(JSON.stringify(def.props || {})) };
      var stub = { result: null, scene: { components: [], wires: [] } };
      var body = skins.body(comp, stub);
      return '<svg class="palette-thumb" viewBox="-72 -46 144 92" preserveAspectRatio="xMidYMid meet">' + body + '</svg>';
    }
  };

  SL.skins = skins;
})();
