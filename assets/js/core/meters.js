/* 仪表区：电流表 / 电压表表盘、指针、量程切换、超量程与反接提示 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  var RANGE_OPTIONS = {
    ammeter: [0.6, 3],
    voltmeter: [3, 15]
  };
  var UNIT = { ammeter: 'A', voltmeter: 'V' };

  function polar(cx, cy, r, deg) {
    var rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  function dial(value, range, kind, reversed, overRange) {
    var ratio = range > 0 ? value / range : 0;
    var angle = 180 - Math.max(-0.06, Math.min(1.06, ratio)) * 180;
    var color = overRange ? 'var(--danger)' : kind === 'ammeter' ? 'var(--primary)' : 'var(--primary-2)';
    var ticks = '';
    for (var i = 0; i <= 10; i++) {
      var deg = 180 - i * 18;
      var outer = polar(100, 100, 78, deg);
      var inner = polar(100, 100, i % 5 === 0 ? 68 : 72, deg);
      ticks += '<line x1="' + inner.x.toFixed(1) + '" y1="' + inner.y.toFixed(1) + '" x2="' + outer.x.toFixed(1) + '" y2="' + outer.y.toFixed(1) + '" class="dial-tick' + (i % 5 === 0 ? ' major' : '') + '"/>';
    }
    var needle = polar(100, 100, 64, angle);
    var left = polar(100, 100, 86, 180);
    var right = polar(100, 100, 86, 0);
    return '<svg class="dial" viewBox="0 0 200 118" aria-hidden="true">' +
      '<path class="dial-arc" d="M ' + left.x.toFixed(1) + ' ' + left.y.toFixed(1) + ' A 86 86 0 0 1 ' + right.x.toFixed(1) + ' ' + right.y.toFixed(1) + '"/>' +
      '<path class="dial-arc-inner" d="M 24 100 A 76 76 0 0 1 176 100"/>' +
      ticks +
      '<line class="dial-needle" x1="100" y1="100" x2="' + needle.x.toFixed(1) + '" y2="' + needle.y.toFixed(1) + '" style="--needle-color:' + color + '"/>' +
      '<circle class="dial-hub" cx="100" cy="100" r="6"/>' +
      '<text class="dial-min" x="18" y="114">0</text>' +
      '<text class="dial-max" x="182" y="114" text-anchor="end">' + range + '</text>' +
      (reversed ? '<text class="dial-flag" x="100" y="26" text-anchor="middle">反接</text>' : '') +
      '</svg>';
  }

  SL.meters = {
    /* 渲染仪表卡片；onRange(compId, nextRange) */
    render: function (host, scene, result, onRange) {
      var meters = scene.components.filter(function (c) {
        return c.type === 'ammeter' || c.type === 'voltmeter';
      });
      if (!meters.length) {
        host.innerHTML = '<div class="empty-note">' + SL.icon('circuit-ammeter', 'empty-icon', 22) +
          '<p>还没有接入电表<br><span class="muted">从元件库添加电流表或电压表，并把它们接入电路。</span></p></div>';
        return;
      }
      var self = this;
      host.innerHTML = meters.map(function (comp) {
        var kind = comp.type;
        var unit = UNIT[kind];
        var range = (comp.props && comp.props.range) || RANGE_OPTIONS[kind][0];
        var m = result && result.meters ? result.meters[comp.id] : null;
        var value = m ? Math.abs(m.value) : 0;
        var reversed = m ? m.reversed : false;
        var over = m ? m.overRange : false;
        var display = m ? SL.fmt(value, kind === 'ammeter' ? 2 : 1) : '—';
        var title = kind === 'ammeter' ? '电流表' : '电压表';
        var ranges = RANGE_OPTIONS[kind].map(function (r) {
          return '<button type="button" class="range-pill' + (r === range ? ' active' : '') +
            '" data-range="' + r + '" data-meter="' + comp.id + '">0–' + r + unit + '</button>';
        }).join('');
        return '<div class="meter-card' + (over ? ' is-over' : '') + '">' +
          '<div class="meter-head"><span class="meter-title">' + SL.icon(kind === 'ammeter' ? 'circuit-ammeter' : 'circuit-voltmeter', '', 18) + title +
          '</span><div class="range-group">' + ranges + '</div></div>' +
          dial(value, range, kind, reversed, over) +
          '<div class="meter-readout" aria-live="polite">' +
          '<span class="meter-value' + (over ? ' danger' : '') + '">' + display + '</span>' +
          '<span class="meter-unit">' + unit + '</span>' +
          '<span class="meter-range">量程 0–' + range + unit + '</span></div>' +
          (over ? '<div class="meter-warn">' + SL.icon('alert-triangle', '', 15) + '超出量程，请换用大量程</div>' : '') +
          (reversed ? '<div class="meter-warn warn-soft">' + SL.icon('alert-triangle', '', 15) + '指针反偏：正负接线柱接反了</div>' : '') +
          '</div>';
      }).join('');

      SL.$$('[data-range]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-meter');
          var next = Number(btn.getAttribute('data-range'));
          SL.sound.play('click');
          if (onRange) onRange(id, next);
        });
      });
    }
  };
})();
