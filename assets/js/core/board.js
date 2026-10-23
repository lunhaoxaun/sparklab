/* SVG 实验台画布：元件渲染、拖拽、端点连线、选择删除、旋转、吸附、电流动画 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});
  var NS = 'http://www.w3.org/2000/svg';
  var VIEW_W = 1200;
  var VIEW_H = 760;

  function svgEl(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function Board(host, options) {
    this.host = host;
    this.options = options || {};
    this.scene = { components: [], wires: [] };
    this.result = null;
    this.selected = null;
    this.pending = null;
    this.drag = null;
    this.sliderDrag = null;
    this.pointer = null;
    this.wireSeq = 0;
    this.raf = null;
    this.labels = {};
    this.history = [];
    this.future = [];
    this.lastSnapshot = null;
    this.view = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };
    this.pointers = {};
    this.pinch = null;
    this.mount();
  }

  Board.prototype.mount = function () {
    var self = this;
    var svg = svgEl('svg', {
      class: 'board-svg', viewBox: '0 0 ' + VIEW_W + ' ' + VIEW_H,
      preserveAspectRatio: 'xMidYMid meet', role: 'application',
      'aria-label': '电路实验台'
    });
    var defs = svgEl('defs');
    defs.innerHTML =
      '<radialGradient id="bulb-glow"><stop offset="0%" stop-color="#ffd76a" stop-opacity="0.95"/>' +
      '<stop offset="55%" stop-color="#ffc23d" stop-opacity="0.45"/>' +
      '<stop offset="100%" stop-color="#ffc23d" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="battery-body" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#eef3fa"/></linearGradient>';
    svg.appendChild(defs);
    this.svg = svg;

    this.gWires = svgEl('g', { class: 'layer-wires' });
    this.gComps = svgEl('g', { class: 'layer-comps' });
    this.gTerminals = svgEl('g', { class: 'layer-terminals' });
    this.gLabels = svgEl('g', { class: 'layer-labels' });
    this.gFlow = svgEl('g', { class: 'layer-flow' });
    this.gOverlay = svgEl('g', { class: 'layer-overlay' });
    svg.appendChild(this.gWires);
    svg.appendChild(this.gComps);
    svg.appendChild(this.gTerminals);
    svg.appendChild(this.gLabels);
    svg.appendChild(this.gFlow);
    svg.appendChild(this.gOverlay);

    svg.addEventListener('pointerdown', function (e) { self.onDown(e); });
    svg.addEventListener('pointermove', function (e) { self.onMove(e); });
    svg.addEventListener('pointerup', function (e) { self.onUp(e); });
    svg.addEventListener('pointercancel', function (e) { self.onUp(e); });
    svg.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var factor = Math.exp(-e.deltaY * 0.0015);
      factor = Math.max(0.7, Math.min(1.4, factor));
      self.zoomAtClient(e.clientX, e.clientY, factor);
    }, { passive: false });
    svg.addEventListener('dblclick', function (e) {
      var g = e.target.closest('[data-comp]');
      if (g && self.options.onInspect) self.options.onInspect(g.getAttribute('data-comp'));
    });
    window.addEventListener('resize', function () { self.schedule(); });

    this.host.innerHTML = '';
    this.host.appendChild(svg);
  };

  Board.prototype.getScene = function () { return this.scene; };

  /* ---------- 撤回 / 重做：每次改动前留一份场景快照 ---------- */
  Board.prototype.snapshot = function () {
    return JSON.stringify({ components: this.scene.components, wires: this.scene.wires });
  };

  Board.prototype.mark = function (prev) {
    var snap = this.snapshot();
    var before = prev == null ? this.lastSnapshot : prev;
    if (before == null) { this.lastSnapshot = snap; return; }
    if (before === snap) { this.lastSnapshot = snap; return; }
    this.history.push(before);
    if (this.history.length > 60) this.history.shift();
    this.future.length = 0;
    this.lastSnapshot = snap;
  };

  Board.prototype.canUndo = function () { return this.history.length > 0; };
  Board.prototype.canRedo = function () { return this.future.length > 0; };

  Board.prototype.applySnapshot = function (raw) {
    var data = JSON.parse(raw);
    this.scene = { components: data.components || [], wires: data.wires || [] };
    this.selected = null;
    this.pending = null;
    this.drag = null;
    this.sliderDrag = null;
    this.wireSeq = 0;
    (this.scene.wires || []).forEach(function (wire) {
      var m = /(\d+)$/.exec(wire.id || '');
      if (m) this.wireSeq = Math.max(this.wireSeq, parseInt(m[1], 10));
    }, this);
    if (SL.circuit.syncIds) SL.circuit.syncIds(this.scene);
    this.lastSnapshot = raw;
    this.schedule();
    if (this.options.onSelect) this.options.onSelect(null);
    if (this.options.onChange) this.options.onChange(this.scene);
  };

  Board.prototype.undo = function () {
    if (!this.history.length) return false;
    var current = this.snapshot();
    var prev = this.history.pop();
    this.future.push(current);
    if (this.future.length > 60) this.future.shift();
    this.applySnapshot(prev);
    return true;
  };

  Board.prototype.redo = function () {
    if (!this.future.length) return false;
    var current = this.snapshot();
    var next = this.future.pop();
    this.history.push(current);
    if (this.history.length > 60) this.history.shift();
    this.applySnapshot(next);
    return true;
  };

  Board.prototype.setScene = function (scene) {
    var prev = this.lastSnapshot;
    this.scene = scene || { components: [], wires: [] };
    this.selected = null;
    this.pending = null;
    this.wireSeq = 0;
    (this.scene.wires || []).forEach(function (wire) {
      var m = /(\d+)$/.exec(wire.id || '');
      if (m) this.wireSeq = Math.max(this.wireSeq, parseInt(m[1], 10));
    }, this);
    if (SL.circuit.syncIds) SL.circuit.syncIds(this.scene);
    this.mark(prev);
    this.schedule();
  };

  Board.prototype.setResult = function (result) {
    this.result = result;
    this.schedule();
  };

  Board.prototype.schedule = function () {
    var self = this;
    if (this.raf) return;
    this.raf = requestAnimationFrame(function () {
      self.raf = null;
      self.render();
    });
  };

  Board.prototype.findComp = function (id) {
    for (var i = 0; i < this.scene.components.length; i++) {
      if (this.scene.components[i].id === id) return this.scene.components[i];
    }
    return null;
  };

  Board.prototype.labelFor = function (comp) {
    var counts = { bulb: 0, resistor: 0, ammeter: 0, voltmeter: 0, battery: 0, switch: 0, rheostat: 0 };
    var label = '';
    for (var i = 0; i < this.scene.components.length; i++) {
      var c = this.scene.components[i];
      counts[c.type] = (counts[c.type] || 0) + 1;
      if (c.id === comp.id) {
        if (c.type === 'bulb') label = 'L' + counts.bulb;
        else if (c.type === 'resistor') label = (c.props.unknown ? 'Rx' : 'R' + counts.resistor);
        else if (c.type === 'ammeter') label = 'A';
        else if (c.type === 'voltmeter') label = 'V';
        else if (c.type === 'battery') label = '电池组';
        else if (c.type === 'switch') label = 'S';
        else if (c.type === 'rheostat') label = '变阻器';
      }
    }
    return label;
  };

  Board.prototype.terminalPos = function (comp, terminalId) {
    return SL.circuit.terminalPoint(comp, terminalId);
  };

  Board.prototype.terminalAbs = function (ref) {
    var comp = this.findComp(ref.compId);
    if (!comp) return null;
    return this.terminalPos(comp, ref.terminalId);
  };

  Board.prototype.wirePath = function (a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var c1, c2;
    if (Math.abs(dx) >= Math.abs(dy)) {
      c1 = { x: a.x + dx * 0.42, y: a.y };
      c2 = { x: b.x - dx * 0.42, y: b.y };
    } else {
      c1 = { x: a.x, y: a.y + dy * 0.42 };
      c2 = { x: b.x, y: b.y - dy * 0.42 };
    }
    return 'M ' + a.x + ' ' + a.y + ' C ' + c1.x + ' ' + c1.y + ', ' + c2.x + ' ' + c2.y + ', ' + b.x + ' ' + b.y;
  };

  Board.prototype.compMarkup = function (comp, label, selected) {
    var cls = 'comp comp-' + comp.type + (selected ? ' selected' : '');
    var x = comp.x, y = comp.y, rot = comp.rotation || 0;
    var body = '';
    var p = comp.props || {};
    if (comp.type === 'battery') {
      var cells = Math.max(1, Math.min(4, Math.round(p.cells || 2)));
      body =
        '<rect x="-40" y="-17" width="80" height="34" rx="8" class="comp-body"/>' +
        '<line x1="-22" y1="-10" x2="-22" y2="10" class="battery-plate short"/>' +
        '<line x1="-12" y1="-15" x2="-12" y2="15" class="battery-plate long"/>' +
        '<line x1="2" y1="-10" x2="2" y2="10" class="battery-plate short"/>' +
        '<line x1="12" y1="-15" x2="12" y2="15" class="battery-plate long"/>' +
        '<text x="30" y="4" class="comp-symbol-text">+</text>' +
        '<text x="22" y="4" class="comp-symbol-text">−</text>';
    } else if (comp.type === 'switch') {
      body =
        '<rect x="-38" y="-20" width="76" height="40" rx="10" class="comp-body"/>' +
        '<circle cx="-16" cy="4" r="4" class="contact"/>' +
        '<circle cx="16" cy="4" r="4" class="contact"/>' +
        (p.closed
          ? '<line x1="-16" y1="4" x2="16" y2="4" class="switch-lever"/>'
          : '<line x1="-16" y1="4" x2="14" y2="-12" class="switch-lever"/>');
    } else if (comp.type === 'bulb') {
      var ratio = 0;
      var bulb = this.result && this.result.bulbs ? this.result.bulbs[comp.id] : null;
      if (bulb) ratio = Math.max(0, Math.min(1.4, bulb.ratio || 0));
      body =
        (ratio > 0.05 ? '<circle cx="0" cy="0" r="48" fill="url(#bulb-glow)" opacity="' + Math.min(1, ratio).toFixed(2) + '"/>' : '') +
        '<circle cx="0" cy="0" r="26" class="bulb-glass' + (p.burned ? ' burned' : '') + '"/>' +
        '<line x1="-11" y1="-11" x2="11" y2="11" class="bulb-filament"/>' +
        '<line x1="-11" y1="11" x2="11" y2="-11" class="bulb-filament"/>';
    } else if (comp.type === 'resistor') {
      body =
        '<rect x="-38" y="-15" width="76" height="30" rx="6" class="comp-body"/>' +
        '<path d="M-30 0 L-24 -8 L-16 8 L-8 -8 L0 8 L8 -8 L16 8 L24 0" class="resistor-zigzag"/>' +
        '<text x="0" y="-22" class="comp-value">' + (p.unknown ? 'Rx' : (p.resistance || 10) + 'Ω') + '</text>';
    } else if (comp.type === 'rheostat') {
      var slider = Math.max(0, Math.min(1, p.slider == null ? 0.5 : p.slider));
      var knobX = -48 + slider * 96;
      body =
        '<rect x="-52" y="-16" width="104" height="32" rx="6" class="comp-body"/>' +
        '<path d="M-44 0 H44" class="rheostat-track"/>' +
        '<line x1="-66" y1="-24" x2="66" y2="-24" class="rheostat-rail"/>' +
        '<line x1="' + knobX + '" y1="-24" x2="' + knobX + '" y2="-16" class="rheostat-stem"/>' +
        '<circle cx="' + knobX + '" cy="-24" r="8" class="rheostat-knob" data-slider="' + comp.id + '"/>' +
        '<path d="M' + (knobX - 5) + ' -29 L' + knobX + ' -35 L' + (knobX + 5) + ' -29" class="rheostat-arrow"/>' +
        '<text x="0" y="34" class="comp-value">' + Math.round(slider * (p.max || 20)) + 'Ω</text>';
    } else if (comp.type === 'ammeter' || comp.type === 'voltmeter') {
      var isA = comp.type === 'ammeter';
      var m = this.result && this.result.meters ? this.result.meters[comp.id] : null;
      var val = m ? Math.abs(m.value) : 0;
      var over = m && m.overRange;
      body =
        '<circle cx="0" cy="0" r="26" class="meter-face' + (over ? ' over' : '') + '"/>' +
        '<text x="0" y="7" class="meter-letter">' + (isA ? 'A' : 'V') + '</text>' +
        '<text x="0" y="42" class="comp-value ' + (over ? 'danger' : '') + '">' + SL.fmt(val, isA ? 2 : 1) + (over ? ' ⚠' : '') + '</text>';
    }
    return '<g class="' + cls + '" data-comp="' + comp.id + '" transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')">' + body + '</g>';
  };

  Board.prototype.terminalMarkup = function (comp) {
    var self = this;
    var out = '';
    SL.circuit.TYPES[comp.type].terminals.forEach(function (t) {
      var pos = self.terminalPos(comp, t.id);
      var pol = t.polarity === '+' ? ' plus' : t.polarity === '-' ? ' minus' : '';
      out += '<g class="terminal' + pol + '" data-comp="' + comp.id + '" data-terminal="' + t.id + '" transform="translate(' + pos.x + ' ' + pos.y + ')">' +
        '<circle class="terminal-hit" r="13"/><circle class="terminal-dot" r="5.5"/>' +
        '</g>';
    });
    return out;
  };

  Board.prototype.render = function () {
    var self = this;
    var selected = this.selected;

    var wiresMarkup = '';
    this.scene.wires.forEach(function (wire) {
      var a = self.terminalAbs(wire.from);
      var b = self.terminalAbs(wire.to);
      if (!a || !b) return;
      var isSel = selected && selected.type === 'wire' && selected.id === wire.id;
      wiresMarkup += '<path class="wire' + (isSel ? ' selected' : '') + '" data-wire="' + wire.id + '" d="' + self.wirePath(a, b) + '"/>';
    });
    if (this.pending && this.pointer) {
      var start = this.terminalAbs(this.pending);
      if (start) {
        wiresMarkup += '<path class="wire pending" d="' + this.wirePath(start, this.pointer) + '"/>';
      }
    }
    this.gWires.innerHTML = wiresMarkup;

    var compsMarkup = '';
    var termsMarkup = '';
    var labelsMarkup = '';
    this.scene.components.forEach(function (comp) {
      var isSel = selected && selected.type === 'comp' && selected.id === comp.id;
      var label = self.labelFor(comp);
      compsMarkup += self.compMarkup(comp, label, isSel);
      termsMarkup += self.terminalMarkup(comp);
      var pos = self.terminalPos(comp, SL.circuit.TYPES[comp.type].terminals[0].id);
      var labelY = (comp.type === 'bulb' ? comp.y + 48 : comp.type === 'ammeter' || comp.type === 'voltmeter' ? comp.y + 58 : comp.y + 34);
      if (comp.type === 'rheostat') labelY = comp.y + 50;
      labelsMarkup += '<text class="comp-label" x="' + comp.x + '" y="' + labelY + '">' + label + '</text>';
    });
    this.gComps.innerHTML = compsMarkup;
    this.gTerminals.innerHTML = termsMarkup;
    this.gLabels.innerHTML = labelsMarkup;
    this.renderFlow();

    var overlay = '';
    if (this.pending) {
      overlay += '<text class="board-hint" x="24" y="' + (VIEW_H - 24) + '">点击另一个接线柱完成连接 · 按 Esc 取消</text>';
    }
    this.gOverlay.innerHTML = overlay;
  };

  Board.prototype.renderFlow = function () {
    if (!this.result) { this.gFlow.innerHTML = ''; return; }
    var self = this;
    var levels = this.result.nodeLevels || {};
    var terminalNode = this.result.terminalNode || {};
    var maxCurrent = 0;
    Object.keys(this.result.batteries || {}).forEach(function (id) {
      maxCurrent = Math.max(maxCurrent, Math.abs(self.result.batteries[id].current || 0));
    });
    if (maxCurrent < 0.004) { this.gFlow.innerHTML = ''; return; }
    var duration = Math.max(0.7, Math.min(4, 1.6 / Math.max(0.05, maxCurrent)));
    var markup = '';
    this.scene.wires.forEach(function (wire) {
      var a = self.terminalAbs(wire.from);
      var b = self.terminalAbs(wire.to);
      if (!a || !b) return;
      var na = terminalNode[wire.from.compId + ':' + wire.from.terminalId];
      var nb = terminalNode[wire.to.compId + ':' + wire.to.terminalId];
      var la = levels[na], lb = levels[nb];
      if (la == null || lb == null || la === lb) return;
      var reverse = la > lb;
      markup += '<path class="wire-flow' + (reverse ? ' reverse' : '') + '" d="' + self.wirePath(a, b) +
        '" style="animation-duration:' + duration.toFixed(2) + 's"/>';
    });
    this.gFlow.innerHTML = markup;
  };

  Board.prototype.svgPoint = function (evt) {
    var pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    var matrix = this.svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    return pt.matrixTransform(matrix.inverse());
  };

  /* ---------- 缩放：viewBox 变化，0.5×～4× ---------- */
  Board.prototype.applyView = function () {
    this.svg.setAttribute('viewBox',
      this.view.x + ' ' + this.view.y + ' ' + this.view.w + ' ' + this.view.h);
  };

  Board.prototype.setView = function (x, y, w, h) {
    this.view = { x: x, y: y, w: w, h: h };
    this.applyView();
  };

  /* 以屏幕上某点为锚点缩放，锚点下的内容保持不动 */
  Board.prototype.zoomAtClient = function (clientX, clientY, factor) {
    var scale = VIEW_W / this.view.w;
    var next = Math.max(0.5, Math.min(4, scale * factor));
    var nw = VIEW_W / next;
    var nh = VIEW_H / next;
    if (Math.abs(nw - this.view.w) < 0.3) return false;
    var anchor = this.svgPoint({ clientX: clientX, clientY: clientY });
    this.view.w = nw;
    this.view.h = nh;
    this.applyView();
    var after = this.svgPoint({ clientX: clientX, clientY: clientY });
    this.view.x -= after.x - anchor.x;
    this.view.y -= after.y - anchor.y;
    this.applyView();
    return true;
  };

  Board.prototype.zoomBy = function (factor) {
    var r = this.svg.getBoundingClientRect();
    return this.zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, factor);
  };

  /* 双指缩放开始：取消正在进行的拖动，避免手指一动就挪元件 */
  Board.prototype.startPinch = function () {
    var ids = Object.keys(this.pointers);
    var a = this.pointers[ids[0]];
    var b = this.pointers[ids[1]];
    if (!a || !b) return;
    if (this.drag) {
      var comp = this.findComp(this.drag.id);
      if (comp) { comp.x = this.drag.originX; comp.y = this.drag.originY; }
      this.drag = null;
      this.schedule();
    }
    this.sliderDrag = null;
    this.pointer = null;
    this.pinch = {
      dist: Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) || 1,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  };

  Board.prototype.onDown = function (evt) {
    var target = evt.target;
    var self = this;
    evt.preventDefault();
    this.svg.setPointerCapture && this.svg.setPointerCapture(evt.pointerId);
    this.pointers[evt.pointerId] = { x: evt.clientX, y: evt.clientY };
    if (Object.keys(this.pointers).length >= 2) { this.startPinch(); return; }

    var slider = target.closest('[data-slider]');
    if (slider) {
      this.sliderDrag = slider.getAttribute('data-slider');
      this.updateSlider(this.sliderDrag, this.svgPoint(evt));
      return;
    }

    var terminal = target.closest('[data-terminal]');
    if (terminal) {
      var ref = { compId: terminal.getAttribute('data-comp'), terminalId: terminal.getAttribute('data-terminal') };
      if (this.pending) {
        this.completeWire(ref);
      } else {
        this.pending = ref;
        this.pointer = this.svgPoint(evt);
        SL.sound.play('click');
        this.schedule();
      }
      return;
    }

    var wireEl = target.closest('[data-wire]');
    if (wireEl) {
      this.selected = { type: 'wire', id: wireEl.getAttribute('data-wire') };
      if (this.options.onSelect) this.options.onSelect(null);
      this.schedule();
      return;
    }

    var compEl = target.closest('[data-comp]');
    if (compEl) {
      var comp = this.findComp(compEl.getAttribute('data-comp'));
      if (!comp) return;
      this.selected = { type: 'comp', id: comp.id };
      var p = this.svgPoint(evt);
      this.drag = { id: comp.id, startX: p.x, startY: p.y, originX: comp.x, originY: comp.y, moved: false };
      if (this.options.onSelect) this.options.onSelect(comp);
      this.schedule();
      return;
    }

    if (this.pending) { this.pending = null; this.schedule(); return; }
    this.selected = null;
    if (this.options.onSelect) this.options.onSelect(null);
    this.schedule();
  };

  Board.prototype.onMove = function (evt) {
    if (this.pointers[evt.pointerId]) {
      this.pointers[evt.pointerId] = { x: evt.clientX, y: evt.clientY };
    }
    if (this.pinch) {
      var ids = Object.keys(this.pointers);
      if (ids.length >= 2) {
        var a = this.pointers[ids[0]];
        var b = this.pointers[ids[1]];
        var dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        var mx = (a.x + b.x) / 2;
        var my = (a.y + b.y) / 2;
        if (this.pinch.dist > 0 && dist > 0) this.zoomAtClient(mx, my, dist / this.pinch.dist);
        this.pinch.dist = dist;
        this.pinch.x = mx;
        this.pinch.y = my;
        return;
      }
    }
    var p = this.svgPoint(evt);
    this.pointer = p;
    if (this.sliderDrag) {
      this.updateSlider(this.sliderDrag, p);
      return;
    }
    if (this.drag) {
      var comp = this.findComp(this.drag.id);
      if (!comp) return;
      var dx = p.x - this.drag.startX;
      var dy = p.y - this.drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;
      comp.x = Math.round((this.drag.originX + dx) / 10) * 10;
      comp.y = Math.round((this.drag.originY + dy) / 10) * 10;
      this.schedule();
      return;
    }
    if (this.pending) this.schedule();
  };

  Board.prototype.onUp = function (evt) {
    var self = this;
    delete this.pointers[evt.pointerId];
    if (this.pinch) {
      if (Object.keys(this.pointers).length < 2) this.pinch = null;
      return;
    }
    if (this.sliderDrag) {
      this.sliderDrag = null;
      this.emitChange();
      return;
    }
    if (this.drag) {
      var comp = this.findComp(this.drag.id);
      var moved = this.drag.moved;
      this.drag = null;
      if (comp && comp.type === 'switch' && !moved) {
        comp.props.closed = !comp.props.closed;
        SL.sound.play('click');
        this.emitChange();
        return;
      }
      if (moved && comp) {
        comp.x = Math.max(50, Math.min(VIEW_W - 50, comp.x));
        comp.y = Math.max(50, Math.min(VIEW_H - 60, comp.y));
        this.emitChange();
      }
      this.schedule();
    }
    if (this.pointer && !this.pending) this.schedule();
  };

  Board.prototype.updateSlider = function (compId, point) {
    var comp = this.findComp(compId);
    if (!comp) return;
    var local = point;
    if (comp.rotation) {
      var rad = (-(comp.rotation) * Math.PI) / 180;
      var dx = point.x - comp.x;
      var dy = point.y - comp.y;
      local = { x: comp.x + dx * Math.cos(rad) - dy * Math.sin(rad), y: comp.y + dx * Math.sin(rad) + dy * Math.cos(rad) };
    }
    var slider = (local.x - (comp.x - 48)) / 96;
    comp.props.slider = Math.max(0, Math.min(1, slider));
    this.schedule();
    if (this.options.onSlider) this.options.onSlider(compId, comp.props.slider);
  };

  Board.prototype.completeWire = function (ref) {
    var pending = this.pending;
    this.pending = null;
    if (!pending) return;
    if (pending.compId === ref.compId && pending.terminalId === ref.terminalId) { this.schedule(); return; }
    var comp = this.findComp(pending.compId);
    if (pending.compId === ref.compId && comp && comp.type === 'rheostat') {
      SL.toast('滑动变阻器的接线柱不能接自己，请改接其他元件', 'warn');
      this.schedule();
      return;
    }
    var exists = this.scene.wires.some(function (w) {
      var same = w.from.compId === pending.compId && w.from.terminalId === pending.terminalId &&
        w.to.compId === ref.compId && w.to.terminalId === ref.terminalId;
      var rev = w.from.compId === ref.compId && w.from.terminalId === ref.terminalId &&
        w.to.compId === pending.compId && w.to.terminalId === pending.terminalId;
      return same || rev;
    });
    if (exists) {
      SL.toast('这两个接线柱已经连接了', 'warn');
      this.schedule();
      return;
    }
    this.wireSeq += 1;
    this.scene.wires.push({
      id: 'w-' + this.wireSeq,
      from: { compId: pending.compId, terminalId: pending.terminalId },
      to: { compId: ref.compId, terminalId: ref.terminalId }
    });
    SL.sound.play('connect');
    this.emitChange();
  };

  Board.prototype.emitChange = function () {
    this.mark();
    this.schedule();
    if (this.options.onChange) this.options.onChange(this.scene);
  };

  Board.prototype.addComponent = function (type, x, y, props) {
    var comp = SL.circuit.create(type, x, y, props);
    this.scene.components.push(comp);
    this.selected = { type: 'comp', id: comp.id };
    this.emitChange();
    return comp;
  };

  Board.prototype.removeSelected = function () {
    if (!this.selected) return false;
    var sel = this.selected;
    if (sel.type === 'comp') {
      this.scene.components = this.scene.components.filter(function (c) { return c.id !== sel.id; });
      this.scene.wires = this.scene.wires.filter(function (w) {
        return w.from.compId !== sel.id && w.to.compId !== sel.id;
      });
    } else {
      this.scene.wires = this.scene.wires.filter(function (w) { return w.id !== sel.id; });
    }
    this.selected = null;
    if (this.options.onSelect) this.options.onSelect(null);
    this.emitChange();
    return true;
  };

  Board.prototype.rotateSelected = function () {
    if (!this.selected || this.selected.type !== 'comp') return;
    var comp = this.findComp(this.selected.id);
    if (!comp) return;
    comp.rotation = ((comp.rotation || 0) + 90) % 360;
    SL.sound.play('click');
    this.emitChange();
  };

  Board.prototype.updateProps = function (compId, patch, silent) {
    var comp = this.findComp(compId);
    if (!comp) return;
    Object.assign(comp.props, patch);
    if (!silent) this.emitChange();
    else {
      this.mark();
      this.schedule();
    }
  };

  Board.prototype.select = function (compId) {
    this.selected = compId ? { type: 'comp', id: compId } : null;
    this.schedule();
  };

  Board.prototype.fit = function () {
    if (!this.scene.components.length) {
      this.setView(0, 0, VIEW_W, VIEW_H);
      return;
    }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.scene.components.forEach(function (c) {
      var def = SL.circuit.TYPES[c.type];
      var turned = (c.rotation || 0) % 180 !== 0;
      var w = turned ? def.h : def.w;
      var h = turned ? def.w : def.h;
      minX = Math.min(minX, c.x - w / 2 - 40);
      maxX = Math.max(maxX, c.x + w / 2 + 40);
      minY = Math.min(minY, c.y - h / 2 - 40);
      maxY = Math.max(maxY, c.y + h / 2 + 50);
    });
    var pad = 40;
    var w = Math.max(360, maxX - minX + pad * 2);
    var h = Math.max(260, maxY - minY + pad * 2);
    var ratio = Math.min(VIEW_W / w, VIEW_H / h, 2);
    var vw = VIEW_W / ratio;
    var vh = VIEW_H / ratio;
    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2;
    this.svg.setAttribute('viewBox', (cx - vw / 2) + ' ' + (cy - vh / 2) + ' ' + vw + ' ' + vh);
    this.view = { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };
  };

  /* ---------- 一键美化：把元件排到规整的回路或网格上，导线随之理清 ---------- */
  var RING = { w: 860, h: 360, x0: 170, y0: 150 };

  function terminalIds(comp) {
    return SL.circuit.TYPES[comp.type].terminals.map(function (t) { return t.id; });
  }

  /* 识别"单回路"：每个元件两个接线柱各接一根导线，顺着回路能走回起点。
     跨接在某个元件两端的电压表不参与回路，稍后单独摆在旁边。 */
  function ringOrder(scene, result) {
    var across = (result && result.meterInfo && result.meterInfo.voltmeterAcross) || {};
    var byId = {};
    var skipped = {};
    scene.components.forEach(function (c) {
      byId[c.id] = c;
      if (c.type === 'voltmeter' && across[c.id]) skipped[c.id] = true;
    });
    var ring = scene.components.filter(function (c) { return !skipped[c.id]; });
    if (ring.length < 3) return null;

    var map = {};
    scene.wires.forEach(function (w) {
      if (skipped[w.from.compId] || skipped[w.to.compId]) return;
      if (!byId[w.from.compId] || !byId[w.to.compId]) return;
      var a = w.from.compId + ':' + w.from.terminalId;
      var b = w.to.compId + ':' + w.to.terminalId;
      (map[a] = map[a] || []).push(w.to);
      (map[b] = map[b] || []).push(w.from);
    });

    var start = ring.filter(function (c) { return c.type === 'battery'; })[0] || ring[0];
    var order = [start];
    var seen = {};
    seen[start.id] = true;
    var cur = start;
    var enter = terminalIds(start)[0];
    for (var guard = 0; guard < 200; guard++) {
      /* 找出"继续往前走"的接线柱：除进门那根之外，恰好只接了一根导线（变阻器有 3 个接线柱） */
      var cands = terminalIds(cur).filter(function (id) { return id !== enter; });
      var exit = null;
      for (var ci = 0; ci < cands.length; ci++) {
        if ((map[cur.id + ':' + cands[ci]] || []).length === 1) { exit = cands[ci]; break; }
      }
      if (!exit) return null;
      var links = map[cur.id + ':' + exit] || [];
      if (links.length !== 1) return null;
      var next = byId[links[0].compId];
      if (!next || skipped[next.id]) return null;
      if (seen[next.id]) {
        return next.id === start.id && order.length === ring.length ? order : null;
      }
      if (order.length >= ring.length) return null;
      seen[next.id] = true;
      order.push(next);
      cur = next;
      enter = links[0].terminalId;
    }
    return null;
  }

  /* 沿矩形四周顺时针摆放：上下边元件横放，左右边元件竖放，导线自然沿边走向 */
  function ringPlan(order) {
    var x0 = RING.x0, y0 = RING.y0, x1 = x0 + RING.w, y1 = y0 + RING.h;
    var counts = [0, 0, 0, 0];
    order.forEach(function (c, i) { counts[i % 4] += 1; });
    var sides = [
      function (k, n) { return { x: x0 + RING.w * (k + 0.5) / n, y: y0, rotation: 0 }; },
      function (k, n) { return { x: x1, y: y0 + RING.h * (k + 0.5) / n, rotation: 90 }; },
      function (k, n) { return { x: x1 - RING.w * (k + 0.5) / n, y: y1, rotation: 0 }; },
      function (k, n) { return { x: x0, y: y1 - RING.h * (k + 0.5) / n, rotation: 90 }; }
    ];
    var plan = [];
    var idx = 0;
    for (var s = 0; s < 4; s++) {
      for (var k = 0; k < counts[s]; k++) {
        var comp = order[idx];
        if (!comp) break;
        var pos = sides[s](k, counts[s]);
        plan.push({ comp: comp, x: pos.x, y: pos.y, rotation: pos.rotation, side: s });
        idx += 1;
      }
    }
    return plan;
  }

  /* 电压表摆在被测元件外侧，避免两根引线穿过回路内部 */
  function placeVoltmeters(plan, scene, result) {
    var across = (result && result.meterInfo && result.meterInfo.voltmeterAcross) || {};
    var placed = {};
    plan.forEach(function (item) { placed[item.comp.id] = item; });
    var x0 = RING.x0, y0 = RING.y0, x1 = x0 + RING.w, y1 = y0 + RING.h;
    scene.components.forEach(function (comp) {
      if (comp.type !== 'voltmeter') return;
      var target = placed[across[comp.id]];
      if (!target) return;
      var off = 118;
      var x = target.x, y = target.y;
      if (Math.abs(y - y0) < 1) y -= off;
      else if (Math.abs(y - y1) < 1) y += off;
      else if (Math.abs(x - x0) < 1) x -= off;
      else if (Math.abs(x - x1) < 1) x += off;
      else y -= off;
      plan.push({
        comp: comp,
        x: Math.max(70, Math.min(VIEW_W - 70, x)),
        y: Math.max(80, Math.min(VIEW_H - 80, y)),
        rotation: target.rotation,
        side: target.side
      });
    });
  }

  function loosePlan(list, baseY) {
    var perRow = Math.max(1, Math.min(5, list.length));
    var rows = Math.ceil(list.length / perRow);
    return list.map(function (comp, i) {
      var r = Math.floor(i / perRow);
      var c = i % perRow;
      var count = Math.min(perRow, list.length - r * perRow);
      return {
        comp: comp,
        x: 600 + (c - (count - 1) / 2) * 170,
        y: baseY + (r - (rows - 1) / 2) * 140,
        rotation: 0,
        side: -1
      };
    });
  }

  /* 非单回路：按与电池的远近分列，从左到右流动 */
  function gridPlan(scene, result) {
    if (!scene.wires.length) return loosePlan(scene.components, 380);
    var adj = {};
    scene.components.forEach(function (c) { adj[c.id] = []; });
    scene.wires.forEach(function (w) {
      if (w.from.compId === w.to.compId) return;
      if (!adj[w.from.compId] || !adj[w.to.compId]) return;
      adj[w.from.compId].push(w.to.compId);
      adj[w.to.compId].push(w.from.compId);
    });
    var start = scene.components.filter(function (c) { return c.type === 'battery'; })[0] || scene.components[0];
    var level = {};
    level[start.id] = 0;
    var queue = [start.id];
    while (queue.length) {
      var id = queue.shift();
      adj[id].forEach(function (nb) {
        if (level[nb] == null) { level[nb] = level[id] + 1; queue.push(nb); }
      });
    }
    var maxLevel = 0;
    scene.components.forEach(function (c) {
      if (level[c.id] == null) level[c.id] = -1;
      maxLevel = Math.max(maxLevel, level[c.id]);
    });
    var groups = [];
    for (var i = 0; i <= maxLevel; i++) groups.push([]);
    var stray = [];
    scene.components.forEach(function (c) {
      if (level[c.id] < 0) stray.push(c);
      else groups[level[c.id]].push(c);
    });
    var plan = [];
    var colGap = Math.min(230, 980 / Math.max(1, groups.length));
    var left = 600 - (colGap * (groups.length - 1)) / 2;
    groups.forEach(function (list, ci) {
      var rowGap = 150;
      var top = 360 - (rowGap * (list.length - 1)) / 2;
      list.forEach(function (comp, ri) {
        plan.push({
          comp: comp,
          x: Math.max(90, Math.min(VIEW_W - 90, left + ci * colGap)),
          y: Math.max(100, Math.min(VIEW_H - 120, top + ri * rowGap)),
          rotation: 0,
          side: -1
        });
      });
    });
    if (stray.length) plan = plan.concat(loosePlan(stray, 690));
    return plan;
  }

  Board.prototype.beautify = function () {
    var scene = this.scene;
    if (!scene.components.length) return false;

    var plan = null;
    var order = ringOrder(scene, this.result);
    if (order) {
      plan = ringPlan(order);
      placeVoltmeters(plan, scene, this.result);
      var done = {};
      plan.forEach(function (item) { done[item.comp.id] = true; });
      var rest = scene.components.filter(function (c) { return !done[c.id]; });
      if (rest.length) plan = plan.concat(loosePlan(rest, 690));
    } else {
      plan = gridPlan(scene, this.result);
    }

    plan.forEach(function (item) {
      item.comp.x = Math.round(item.x / 5) * 5;
      item.comp.y = Math.round(item.y / 5) * 5;
      item.comp.rotation = item.rotation;
    });

    this.selected = null;
    this.pending = null;
    if (this.options.onSelect) this.options.onSelect(null);
    this.setView(0, 0, VIEW_W, VIEW_H);
    this.emitChange();
    this.fit();
    return true;
  };

  SL.Board = Board;
})();
