/* 仿真基础库：SVG 舞台、参数控件、实时曲线、动画时钟、读数面板
   供物理·力学 / 热学 / 光学实验共用（不依赖电路引擎） */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val == null) return;
        if (key === 'text') node.textContent = val;
        else node.setAttribute(key, val);
      });
    }
    return node;
  }

  /* ---------- 舞台：固定世界坐标系，随容器缩放 ---------- */
  function Stage(host, opts) {
    opts = opts || {};
    var W = opts.w || 900;
    var H = opts.h || 560;
    var svg = svgEl('svg', {
      class: 'sim-canvas ' + (opts.cls || ''),
      viewBox: '0 0 ' + W + ' ' + H,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': opts.label || '实验仿真画面'
    });
    var defs = svgEl('defs');
    defs.innerHTML =
      '<marker id="sim-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>' +
      '<marker id="sim-arrow-solid" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="#c0392b"/></marker>' +
      '<linearGradient id="sim-liquid" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#7fc4e8" stop-opacity=".55"/><stop offset="100%" stop-color="#3f8fbf" stop-opacity=".75"/></linearGradient>' +
      '<linearGradient id="sim-glass" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#dfeaf3" stop-opacity=".9"/><stop offset="45%" stop-color="#f4f9fd" stop-opacity=".55"/>' +
      '<stop offset="100%" stop-color="#cfdde9" stop-opacity=".9"/></linearGradient>' +
      '<radialGradient id="sim-glow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#ffd479" stop-opacity=".85"/><stop offset="100%" stop-color="#ffb020" stop-opacity="0"/></radialGradient>';
    svg.appendChild(defs);
    var layer = svgEl('g', { class: 'sim-layer' });
    svg.appendChild(layer);
    host.innerHTML = '';
    host.appendChild(svg);

    var api = {
      svg: svg,
      layer: layer,
      w: W,
      h: H,
      clear: function () {
        while (layer.firstChild) layer.removeChild(layer.firstChild);
        return api;
      },
      add: function (node) {
        layer.appendChild(node);
        return node;
      },
      g: function (cls, attrs) {
        var node = svgEl('g', attrs || {});
        if (cls) node.setAttribute('class', cls);
        layer.appendChild(node);
        return node;
      },
      rect: function (x, y, w, h, attrs) {
        var node = svgEl('rect', Object.assign({ x: x, y: y, width: w, height: h }, attrs || {}));
        layer.appendChild(node);
        return node;
      },
      circle: function (cx, cy, r, attrs) {
        var node = svgEl('circle', Object.assign({ cx: cx, cy: cy, r: r }, attrs || {}));
        layer.appendChild(node);
        return node;
      },
      line: function (x1, y1, x2, y2, attrs) {
        var node = svgEl('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2 }, attrs || {}));
        layer.appendChild(node);
        return node;
      },
      path: function (d, attrs) {
        var node = svgEl('path', Object.assign({ d: d }, attrs || {}));
        layer.appendChild(node);
        return node;
      },
      poly: function (points, attrs) {
        var node = svgEl('polygon', Object.assign({ points: points }, attrs || {}));
        layer.appendChild(node);
        return node;
      },
      text: function (x, y, str, attrs) {
        var node = svgEl('text', Object.assign({ x: x, y: y }, attrs || {}));
        node.textContent = str;
        layer.appendChild(node);
        return node;
      },
      /* 带箭头的矢量线 */
      arrow: function (x1, y1, x2, y2, attrs) {
        var conf = Object.assign({
          stroke: 'currentColor', 'stroke-width': 2, 'marker-end': 'url(#sim-arrow)'
        }, attrs || {});
        return api.line(x1, y1, x2, y2, conf);
      },
      /* 屏幕坐标 → 世界坐标 */
      toWorld: function (evt) {
        var ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        var pt = svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        var p = pt.matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
      }
    };
    return api;
  }

  /* ---------- 参数控件：schema 驱动 ---------- */
  function Controls(host, schema, values, onChange) {
    var api = {
      values: values,
      listeners: []
    };

    function emit(key, value) {
      values[key] = value;
      api.listeners.forEach(function (fn) { fn(key, value); });
      if (onChange) onChange(key, value);
    }

    function pretty(def, value) {
      if (typeof def.format === 'function') return def.format(value);
      if (def.type === 'select') {
        var hit = (def.options || []).filter(function (o) { return o.value === value; })[0];
        return hit ? hit.label : value;
      }
      var digits = def.digits == null ? 0 : def.digits;
      return SL.fmt(value, digits) + (def.unit ? ' ' + def.unit : '');
    }

    function render() {
      /* def.when(values) 为假时不渲染该控件：自由实验室用它按装置切换参数面板 */
      host.innerHTML = schema.filter(function (def) {
        return !def.when || def.when(values);
      }).map(function (def) {
        var value = values[def.key];
        if (def.type === 'select') {
          return '<label class="ctrl ctrl-select" data-key="' + def.key + '">' +
            '<span class="ctrl-label">' + def.label + '</span>' +
            '<select data-ctrl="' + def.key + '">' +
            (def.options || []).map(function (o) {
              return '<option value="' + o.value + '"' + (o.value === value ? ' selected' : '') + '>' + o.label + '</option>';
            }).join('') + '</select>' +
            (def.note ? '<em class="ctrl-note">' + def.note + '</em>' : '') + '</label>';
        }
        if (def.type === 'toggle') {
          return '<label class="ctrl ctrl-toggle" data-key="' + def.key + '">' +
            '<input type="checkbox" data-ctrl="' + def.key + '"' + (value ? ' checked' : '') + '>' +
            '<span class="ctrl-label">' + def.label + '</span></label>';
        }
        if (def.type === 'buttons') {
          return '<div class="ctrl ctrl-buttons" data-key="' + def.key + '">' +
            '<span class="ctrl-label">' + def.label + '</span>' +
            '<div class="ctrl-btn-row">' + (def.options || []).map(function (o) {
              return '<button type="button" data-ctrl-btn="' + def.key + '" data-value="' + o.value + '"' +
                (o.value === value ? ' class="active"' : '') + '>' + o.label + '</button>';
            }).join('') + '</div></div>';
        }
        var min = def.min == null ? 0 : def.min;
        var max = def.max == null ? 100 : def.max;
        var step = def.step == null ? 1 : def.step;
        return '<label class="ctrl ctrl-range" data-key="' + def.key + '">' +
          '<span class="ctrl-head"><span class="ctrl-label">' + def.label + '</span>' +
          '<output class="ctrl-value" data-out="' + def.key + '">' + pretty(def, value) + '</output></span>' +
          '<input type="range" data-ctrl="' + def.key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
          (def.note ? '<em class="ctrl-note">' + def.note + '</em>' : '') + '</label>';
      }).join('');

      SL.$$('[data-ctrl]', host).forEach(function (input) {
        var key = input.getAttribute('data-ctrl');
        var def = schema.filter(function (d) { return d.key === key; })[0];
        var evt = input.type === 'range' ? 'input' : 'change';
        input.addEventListener(evt, function () {
          var value = input.type === 'checkbox' ? input.checked
            : input.type === 'range' ? parseFloat(input.value) : input.value;
          var out = SL.$('[data-out="' + key + '"]', host);
          if (out && def) out.textContent = pretty(def, value);
          emit(key, value);
        });
      });

      SL.$$('[data-ctrl-btn]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-ctrl-btn');
          SL.$$('[data-ctrl-btn="' + key + '"]', host).forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          /* 取回 schema 里的原始值，避免数值型选项被读成字符串（连点两次后高亮/计算都会错） */
          var def = schema.filter(function (d) { return d.key === key; })[0];
          var raw = btn.getAttribute('data-value');
          var hit = def && (def.options || []).filter(function (o) { return String(o.value) === raw; })[0];
          emit(key, hit ? hit.value : raw);
        });
      });
    }

    api.refresh = function (next) {
      if (next) Object.keys(next).forEach(function (k) { values[k] = next[k]; });
      render();
    };
    api.get = function (key) { return values[key]; };
    api.set = function (key, value, silent) {
      values[key] = value;
      var input = SL.$('[data-ctrl="' + key + '"]', host);
      if (input) {
        if (input.type === 'checkbox') input.checked = !!value;
        else input.value = value;
      }
      var def = schema.filter(function (d) { return d.key === key; })[0];
      var out = SL.$('[data-out="' + key + '"]', host);
      if (out && def) out.textContent = pretty(def, value);
      if (!silent) emit(key, value);
    };
    api.on = function (fn) { api.listeners.push(fn); };
    render();
    return api;
  }

  /* ---------- 实时曲线 ---------- */
  function niceTicks(min, max, count) {
    var span = max - min;
    if (span <= 0) return [min];
    var raw = span / (count || 5);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    var ticks = [];
    for (var v = Math.ceil(min / step) * step; v <= max + step * 0.001; v += step) {
      ticks.push(Math.round(v / step) * step);
    }
    return ticks;
  }

  function Plot(host, opts) {
    opts = opts || {};
    var W = opts.w || 360;
    var H = opts.h || 210;
    var L = 46, R = 14, T = 16, B = 38;
    var state = { series: [], axes: null };

    function autoRange() {
      var xs = [], ys = [];
      state.series.forEach(function (s) {
        (s.points || []).forEach(function (p) { xs.push(p.x); ys.push(p.y); });
      });
      var xMin = opts.xMin != null ? opts.xMin : 0;
      var yMin = opts.yMin != null ? opts.yMin : 0;
      var xMax = opts.xMax != null ? opts.xMax : Math.max.apply(null, xs.concat([1]));
      var yMax = opts.yMax != null ? opts.yMax : Math.max.apply(null, ys.concat([1]));
      if (opts.yMin == null) {
        var lo = Math.min.apply(null, ys.concat([yMax]));
        yMin = lo < 0 ? lo * 1.05 : Math.min(0, lo);
        if (opts.padYMin != null) yMin = opts.padYMin;
      }
      if (opts.xMax == null) xMax = xMax * 1.02;
      if (opts.yMax == null) yMax = yMax === yMin ? yMin + 1 : yMin + (yMax - yMin) * 1.08;
      return { xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax };
    }

    function render() {
      var ax = state.axes || autoRange();
      var plotW = W - L - R;
      var plotH = H - T - B;
      function px(x) { return L + ((x - ax.xMin) / (ax.xMax - ax.xMin || 1)) * plotW; }
      function py(y) { return T + plotH - ((y - ax.yMin) / (ax.yMax - ax.yMin || 1)) * plotH; }

      var markup = '';
      niceTicks(ax.yMin, ax.yMax, 4).forEach(function (v) {
        var y = py(v);
        markup += '<line class="plot-grid" x1="' + L + '" y1="' + y + '" x2="' + (L + plotW) + '" y2="' + y + '"/>' +
          '<text class="plot-tick" x="' + (L - 7) + '" y="' + (y + 4) + '" text-anchor="end">' + SL.fmt(v, Math.abs(v) < 1 && v !== 0 ? 2 : 0) + '</text>';
      });
      niceTicks(ax.xMin, ax.xMax, 5).forEach(function (v) {
        var x = px(v);
        markup += '<line class="plot-grid" x1="' + x + '" y1="' + T + '" x2="' + x + '" y2="' + (T + plotH) + '"/>' +
          '<text class="plot-tick" x="' + x + '" y="' + (T + plotH + 15) + '" text-anchor="middle">' + SL.fmt(v, Math.abs(v) < 1 && v !== 0 ? 2 : 0) + '</text>';
      });

      state.series.forEach(function (s) {
        var pts = (s.points || []).filter(function (p) { return p && isFinite(p.x) && isFinite(p.y); });
        if (!pts.length) return;
        if (s.type === 'dots') {
          pts.forEach(function (p) {
            markup += '<circle class="plot-dot" cx="' + px(p.x) + '" cy="' + py(p.y) + '" r="3.6" style="fill:' + (s.color || '#1f6fb2') + '"/>';
          });
          return;
        }
        var d = pts.map(function (p, i) {
          return (i ? 'L' : 'M') + px(p.x).toFixed(1) + ' ' + py(p.y).toFixed(1);
        }).join(' ');
        if (s.dashed) {
          markup += '<path class="plot-line" d="' + d + '" style="stroke:' + (s.color || '#1f6fb2') + '" stroke-dasharray="5 4"/>';
        } else {
          markup += '<path class="plot-line" d="' + d + '" style="stroke:' + (s.color || '#1f6fb2') + '"/>';
        }
        var last = pts[pts.length - 1];
        markup += '<circle cx="' + px(last.x) + '" cy="' + py(last.y) + '" r="3.4" style="fill:' + (s.color || '#1f6fb2') + '"/>';
      });

      markup += '<line class="plot-axis" x1="' + L + '" y1="' + (T + plotH) + '" x2="' + (L + plotW) + '" y2="' + (T + plotH) + '"/>' +
        '<line class="plot-axis" x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + plotH) + '"/>' +
        '<text class="plot-label" x="' + (L + plotW / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + (opts.xLabel || '') + '</text>' +
        '<text class="plot-label" transform="translate(11 ' + (T + plotH / 2) + ') rotate(-90)" text-anchor="middle">' + (opts.yLabel || '') + '</text>';

      var legend = state.series.filter(function (s) { return s.name; }).map(function (s) {
        return '<span class="plot-legend-item"><i style="background:' + (s.color || '#1f6fb2') + '"></i>' + s.name + '</span>';
      }).join('');

      host.innerHTML = '<svg class="plot" viewBox="0 0 ' + W + ' ' + H + '">' + markup + '</svg>' +
        (legend ? '<div class="plot-legend">' + legend + '</div>' : '') +
        (opts.foot ? '<div class="plot-foot">' + opts.foot(state.series) + '</div>' : '');
    }

    render();
    return {
      setSeries: function (series) { state.series = series || []; render(); },
      setAxes: function (axes) { state.axes = axes; render(); },
      el: host
    };
  }

  /* ---------- 动画时钟：固定步长推进 ---------- */
  function Clock(opts) {
    opts = opts || {};
    var raf = null;
    var last = 0;
    var api = {
      playing: false,
      t: 0,
      speed: opts.speed == null ? 1 : opts.speed,
      step: opts.step || 1 / 60,
      start: function () {
        if (api.playing) return;
        api.playing = true;
        last = 0;
        raf = window.requestAnimationFrame(tick);
        if (opts.onState) opts.onState(true);
      },
      stop: function () {
        api.playing = false;
        if (raf) window.cancelAnimationFrame(raf);
        raf = null;
        if (opts.onState) opts.onState(false);
      },
      toggle: function () { if (api.playing) api.stop(); else api.start(); },
      reset: function () {
        api.stop();
        api.t = 0;
        if (opts.onTick) opts.onTick(0, api);
        if (opts.onState) opts.onState(false);
      }
    };
    function tick(ts) {
      if (!api.playing) return;
      if (!last) last = ts;
      var real = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      api.t += real * api.speed;
      if (opts.onTick) opts.onTick(real * api.speed, api);
      raf = window.requestAnimationFrame(tick);
    }
    return api;
  }

  /* ---------- 读数面板 ---------- */
  function Readouts(host, items) {
    host.innerHTML = (items || []).map(function (it) {
      var val = it.text != null ? it.text
        : (it.value == null || isNaN(it.value) ? '—' : SL.fmt(it.value, it.digits == null ? 2 : it.digits));
      return '<div class="readout' + (it.accent ? ' readout-accent' : '') + '">' +
        '<span class="readout-label">' + it.label + '</span>' +
        '<span class="readout-value">' + val + (it.unit ? '<em>' + it.unit + '</em>' : '') + '</span>' +
        (it.note ? '<span class="readout-note">' + it.note + '</span>' : '') + '</div>';
    }).join('');
  }

  /* ---------- 指针拖动（鼠标 / 触摸统一） ---------- */
  function drag(node, handlers) {
    var active = false;
    function down(evt) {
      active = true;
      node.setPointerCapture && evt.pointerId != null && node.setPointerCapture(evt.pointerId);
      if (handlers.onStart) handlers.onStart(evt);
      evt.preventDefault();
    }
    function move(evt) {
      if (!active) return;
      if (handlers.onMove) handlers.onMove(evt);
      evt.preventDefault();
    }
    function up(evt) {
      if (!active) return;
      active = false;
      if (handlers.onEnd) handlers.onEnd(evt);
    }
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    return function () {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
    };
  }

  SL.sim = {
    svgEl: svgEl,
    Stage: Stage,
    Controls: Controls,
    Plot: Plot,
    Clock: Clock,
    Readouts: Readouts,
    drag: drag,
    niceTicks: niceTicks
  };
})();
