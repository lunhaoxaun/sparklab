/* 仪表区：电流表 / 电压表表盘、指针、量程切换、超量程与反接提示
   指针用 CSS transform 旋转并带过渡，结构只在「表计组合变化」时重建，
   之后每次求解只更新指针角度与数字——拖动滑片时读数才能跟手。 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  var RANGE_OPTIONS = {
    ammeter: [0.6, 3],
    voltmeter: [3, 15]
  };
  var UNIT = { ammeter: 'A', voltmeter: 'V' };

  /* 表盘静态部分（刻度、弧线）只生成一次 */
  var TICKS = (function () {
    var out = '';
    for (var i = 0; i <= 10; i++) {
      var deg = 180 - i * 18;
      var rad = (deg * Math.PI) / 180;
      var rOut = 78;
      var rIn = i % 5 === 0 ? 68 : 72;
      out += '<line class="dial-tick' + (i % 5 === 0 ? ' major' : '') + '"' +
        ' x1="' + (100 + rIn * Math.cos(rad)).toFixed(1) + '" y1="' + (100 - rIn * Math.sin(rad)).toFixed(1) + '"' +
        ' x2="' + (100 + rOut * Math.cos(rad)).toFixed(1) + '" y2="' + (100 - rOut * Math.sin(rad)).toFixed(1) + '"/>';
    }
    return out;
  })();

  function meterLabel(comp) {
    return comp.type === 'ammeter' ? '电流表' : '电压表';
  }

  function signature(meters) {
    return meters.map(function (c) {
      var def = RANGE_OPTIONS[c.type] || [];
      var range = Number((c.props || {}).range) || def[0];
      return c.id + ':' + c.type + ':' + range;
    }).join('|');
  }

  function cardHtml(comp) {
    var kind = comp.type;
    var unit = UNIT[kind];
    var ranges = RANGE_OPTIONS[kind];
    var range = Number((comp.props || {}).range) || ranges[0];
    var title = meterLabel(comp);
    var icon = kind === 'ammeter' ? 'circuit-ammeter' : 'circuit-voltmeter';
    var pills = ranges.map(function (r) {
      return '<button type="button" class="range-pill' + (r === range ? ' active' : '') +
        '" data-range="' + r + '" data-meter="' + comp.id + '">0–' + r + unit + '</button>';
    }).join('');
    return '<div class="meter-card" data-card="' + comp.id + '">' +
      '<div class="meter-head"><span class="meter-title">' + SL.icon(icon, '', 18) + title +
      '<em class="meter-flip" data-flip="' + comp.id + '" hidden>已换向</em></span>' +
      '<div class="range-group">' + pills + '</div></div>' +
      '<svg class="dial" viewBox="0 0 200 118" aria-hidden="true">' +
      '<path class="dial-arc" d="M 14 100 A 86 86 0 0 1 186 100"/>' +
      '<path class="dial-arc-inner" d="M 24 100 A 76 76 0 0 1 176 100"/>' +
      TICKS +
      /* 指针竖直向上为 0°，靠 rotate 摆到读数角度，才能吃到 CSS 过渡 */
      '<line class="dial-needle" data-needle="' + comp.id + '" x1="100" y1="100" x2="100" y2="34"/>' +
      '<circle class="dial-hub" cx="100" cy="100" r="6"/>' +
      '<text class="dial-min" x="18" y="114">0</text>' +
      '<text class="dial-max" x="182" y="114" text-anchor="end">' + range + '</text>' +
      '</svg>' +
      '<div class="meter-readout" aria-live="polite">' +
      '<span class="meter-value" data-value="' + comp.id + '">—</span>' +
      '<span class="meter-unit">' + unit + '</span>' +
      '<span class="meter-range">量程 0–' + range + unit + '</span></div>' +
      '<div class="meter-warn" data-warn-over="' + comp.id + '" hidden>' + SL.icon('alert-triangle', '', 15) + '超出量程，请换用大量程</div>' +
      '<div class="meter-warn warn-soft" data-warn-rev="' + comp.id + '" hidden>' + SL.icon('alert-triangle', '', 15) + '指针反偏：正负接线柱接反了</div>' +
      '</div>';
  }

  function build(host, meters, onRange) {
    host.innerHTML = meters.map(cardHtml).join('');
    SL.$$('[data-range]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-meter');
        var next = Number(btn.getAttribute('data-range'));
        SL.sound.play('click');
        if (onRange) onRange(id, next);
      });
    });
  }

  function update(host, comp, m) {
    var kind = comp.type;
    var ranges = RANGE_OPTIONS[kind];
    var range = Number((comp.props || {}).range) || ranges[0];
    var value = m ? Math.abs(m.value) : 0;
    var ratio = range > 0 ? value / range : 0;
    ratio = Math.max(-0.06, Math.min(1.06, ratio));
    /* 指针竖直向上是 0°，刻度 0 在左边：读数 0 → -90°，满量程 → +90° */
    var deg = -90 + ratio * 180;

    var needle = SL.$('[data-needle="' + comp.id + '"]', host);
    if (needle) needle.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)';

    var valueEl = SL.$('[data-value="' + comp.id + '"]', host);
    if (valueEl) {
      var over = !!(m && m.overRange);
      valueEl.textContent = m ? SL.fmt(value, kind === 'ammeter' ? 2 : 1) : '—';
      valueEl.classList.toggle('danger', over);
    }

    var card = SL.$('[data-card="' + comp.id + '"]', host);
    if (card) card.classList.toggle('is-over', !!(m && m.overRange));

    var overRow = SL.$('[data-warn-over="' + comp.id + '"]', host);
    if (overRow) overRow.hidden = !(m && m.overRange);
    var revRow = SL.$('[data-warn-rev="' + comp.id + '"]', host);
    if (revRow) revRow.hidden = !(m && m.reversed);

    var flipTag = SL.$('[data-flip="' + comp.id + '"]', host);
    if (flipTag) flipTag.hidden = !(m && m.flipped);
  }

  SL.meters = {
    /* 渲染仪表卡片；onRange(compId, nextRange)
       结构复用：表计集合或量程没变时只更新指针与数字，避免整块重排 */
    render: function (host, scene, result, onRange) {
      var meters = scene.components.filter(function (c) {
        return c.type === 'ammeter' || c.type === 'voltmeter';
      });
      if (!meters.length) {
        host.innerHTML = '<div class="empty-note">' + SL.icon('circuit-ammeter', 'empty-icon', 22) +
          '<p>还没有接入电表<br><span class="muted">从元件库添加电流表或电压表，并把它们接入电路。</span></p></div>';
        this._sig = '';
        return;
      }
      var sig = signature(meters);
      if (sig !== this._sig || host !== this._host || !host.querySelector('[data-needle]')) {
        build(host, meters, onRange);
        this._sig = sig;
        this._host = host;
      }
      meters.forEach(function (comp) {
        var m = result && result.meters ? result.meters[comp.id] : null;
        update(host, comp, m);
      });
    }
  };
})();
