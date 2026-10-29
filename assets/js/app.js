/* 应用装配：视图切换、实验台框架、引导判定、记录与持久化 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  var app = {
    view: 'home',
    lab: null,
    mode: 'guided',
    board: null,
    result: null,
    rows: [],
    guideIndex: 0,
    answers: {},
    submitted: false,
    allAnswered: false,
    point: 'A',
    flags: {},
    hints: {},
    selectedComp: null,
    skin: 'classic',
    syncTimer: null,
    keyHandler: null
  };

  function root() { return SL.$('#view-root'); }

  function ctx() {
    return {
      scene: app.board ? app.board.getScene() : { components: [], wires: [] },
      result: app.result,
      rows: app.rows,
      state: app,
      mode: app.mode
    };
  }

  /* ---------- 顶栏 ---------- */
  function renderTopbar() {
    var bar = SL.$('#topbar');
    bar.innerHTML = '<button type="button" class="brand" id="brand-btn" aria-label="返回实验大厅">' +
      '<span class="brand-mark">' + SL.icon('circuit-battery', '', 22) + '</span>' +
      '<span class="brand-text"><strong>星火电学实验室</strong><em>SparkLab · 初中电学</em></span>' +
      '<span class="brand-ver" title="当前版本 ' + SL.VERSION_DATE + '">v' + SL.VERSION + '</span>' +
      '</button>' +
      '<div class="top-actions">' +
      (SL.canDownloadOffline()
        ? '<a class="btn btn-icon btn-ghost" id="download-btn" href="' + SL.OFFLINE_ZIP + '" download="星火电学实验室-离线版-v' + SL.VERSION + '.zip" title="下载离线版（断网可用）" aria-label="下载离线版">' + SL.icon('download', '', 20) + '</a>'
        : '') +
      '<button type="button" class="btn btn-icon btn-ghost" id="help-btn" title="使用说明" aria-label="使用说明">' + SL.icon('help-circle', '', 20) + '</button>' +
      '<button type="button" class="btn btn-icon btn-ghost" id="sound-btn" title="音效开关" aria-label="音效开关"></button>' +
      '</div>';

    SL.$('#brand-btn').addEventListener('click', function () {
      if (app.view === 'lab') leaveLab();
    });
    SL.$('#help-btn').addEventListener('click', SL.home.help);
    SL.$('#sound-btn').addEventListener('click', function () {
      var enabled = !SL.settings.get('sound');
      SL.settings.set('sound', enabled);
      if (enabled) SL.sound.play('click');
      updateSoundBtn();
    });
    updateSoundBtn();
  }

  function updateSoundBtn() {
    var enabled = SL.settings.get('sound');
    var btn = SL.$('#sound-btn');
    if (!btn) return;
    btn.innerHTML = SL.icon(enabled ? 'volume' : 'volume-off', '', 20);
    btn.classList.toggle('is-off', !enabled);
    btn.title = enabled ? '音效已开启' : '音效已关闭';
  }

  /* ---------- 首页 ---------- */
  function showHome() {
    app.view = 'home';
    app.lab = null;
    app.board = null;
    if (app.keyHandler) {
      document.removeEventListener('keydown', app.keyHandler);
      app.keyHandler = null;
    }
    document.title = '星火电学实验室 · 初中物理虚拟实验';
    SL.home.render(root(), {
      onOpenLab: openLab,
      help: SL.home.help,
      about: SL.home.about,
      allRecords: SL.home.allRecords
    });
    window.scrollTo(0, 0);
  }

  /* ---------- 进度存取 ---------- */
  function loadProgress(labId) {
    var all = SL.storage.get(SL.KEYS.progress, {});
    var p = all && all[labId];
    return p && typeof p === 'object' ? p : null;
  }

  function saveProgress() {
    if (!app.lab) return;
    var all = SL.storage.get(SL.KEYS.progress, {});
    if (!all || typeof all !== 'object') all = {};
    all[app.lab.id] = {
      stepIndex: app.guideIndex,
      answers: app.answers,
      submitted: app.submitted,
      allAnswered: app.allAnswered,
      mode: app.mode,
      point: app.point,
      scene: app.board ? app.board.getScene() : null,
      updated: Date.now()
    };
    SL.storage.set(SL.KEYS.progress, all);
  }

  /* ---------- 打开实验 ---------- */
  function openLab(labId, mode) {
    var lab = SL.labs[labId];
    if (!lab) { SL.toast('实验不存在', 'warn'); return; }
    app.lab = lab;
    app.mode = lab.meta.free || mode === 'free' ? 'free' : 'guided';
    app.rows = SL.records.get(labId);
    app.result = null;
    app.flags = {};
    app.hints = {};
    app.submitted = false;
    app.allAnswered = false;
    app.selectedComp = null;

    var saved = loadProgress(labId);
    app.guideIndex = 0;
    app.answers = {};
    app.point = (lab.meta.pointOptions && lab.meta.pointOptions[0].value) || 'A';
    if (saved) {
      app.guideIndex = Math.min(lab.meta.steps.length, saved.stepIndex || 0);
      app.answers = saved.answers || {};
      app.submitted = !!saved.submitted;
      app.allAnswered = !!saved.allAnswered;
      app.point = saved.point || app.point;
    }
    if (saved && saved.scene && saved.scene.components && saved.scene.components.length) {
      app.mode = lab.meta.free ? 'free' : mode || saved.mode || 'guided';
    }

    app.view = 'lab';
    document.title = lab.meta.name + ' · 星火电学实验室';
    renderLab();
    window.scrollTo(0, 0);

    if (app.keyHandler) document.removeEventListener('keydown', app.keyHandler);
    app.keyHandler = onKeydown;
    document.addEventListener('keydown', app.keyHandler);
  }

  function renderLab() {
    var lab = app.lab;
    var meta = lab.meta;
    app.skin = SL.skins ? SL.skins.current() : 'classic';
    var skinHtml = SL.skins ? '<div class="mode-switch skin-switch" role="group" aria-label="元件样式">' +
      SL.skins.list.map(function (s) {
        return '<button type="button" data-skin-btn="' + s.id + '" class="' + (app.skin === s.id ? 'active' : '') + '" title="' + s.label + '">' + s.label + '</button>';
      }).join('') + '</div>' : '';
    var paletteHtml = lab.palette.map(function (type) {
      var def = SL.circuit.TYPES[type];
      return '<button type="button" class="palette-item" data-type="' + type + '">' +
        '<span class="palette-icon">' + paletteIcon(type) + '</span>' +
        '<span class="palette-label">' + def.label + '</span>' +
        '<span class="palette-plus">' + SL.icon('plus', '', 14) + '</span></button>';
    }).join('');

    var pointHtml = '';
    if (meta.pointOptions) {
      pointHtml = '<label class="point-pick"><span>测量位置</span><select id="point-select">' +
        meta.pointOptions.map(function (o) {
          return '<option value="' + o.value + '"' + (o.value === app.point ? ' selected' : '') + '>' + o.label + '</option>';
        }).join('') + '</select></label>';
    }

    root().innerHTML = '<div class="lab-view" style="--accent:' + meta.accent + '">' +
      '<div class="lab-topbar">' +
      '<button type="button" class="btn btn-ghost" id="lab-back">' + SL.icon('arrow-left', '', 17) + '返回大厅</button>' +
      '<div class="lab-heading"><span class="lab-tag">' + meta.tag + '</span><h1>' + meta.name + '</h1></div>' +
      '<div class="lab-top-actions">' +
      (meta.free ? '' :
        '<div class="mode-switch" role="group" aria-label="教学模式">' +
        '<button type="button" data-mode-btn="guided" class="' + (app.mode === 'guided' ? 'active' : '') + '">引导模式</button>' +
        '<button type="button" data-mode-btn="free" class="' + (app.mode === 'free' ? 'active' : '') + '">自由探究</button>' +
        '</div>') +
      skinHtml +
      '<button type="button" class="btn btn-icon btn-ghost" id="lab-undo" title="撤回（Ctrl+Z）" aria-label="撤回">' + SL.icon('arrow-left', '', 18) + '</button>' +
      '<button type="button" class="btn btn-icon btn-ghost" id="lab-redo" title="重做（Ctrl+Shift+Z）" aria-label="重做">' + SL.icon('arrow-left', 'icon-flip', 18) + '</button>' +
      '<button type="button" class="btn btn-soft" id="lab-beautify" title="自动整理元件位置，并理清重叠的导线">' + beautifyIcon() + '一键美化</button>' +
      '<button type="button" class="btn btn-soft" id="lab-example">' + SL.icon('settings', '', 16) + '示例电路</button>' +
      '<button type="button" class="btn btn-ghost" id="lab-reset">重置</button>' +
      '</div></div>' +

      '<div class="lab-body">' +
      '<aside class="palette"><h2 class="palette-title">元件库</h2><div class="palette-list">' + paletteHtml + '</div>' +
      '<div class="palette-tools">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="tool-rotate" title="旋转选中元件（R）">' + SL.icon('rotate-clockwise', '', 16) + '旋转</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="tool-delete" title="删除选中">' + SL.icon('trash', '', 16) + '删除</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="tool-fit" title="适应窗口">' + SL.icon('zoom-in', '', 16) + '适应</button>' +
      '</div><p class="palette-tip">点击元件添加到实验台<br>点击两个接线柱完成连线</p></aside>' +

      '<section class="stage">' +
      '<div class="inspector" id="inspector" hidden></div>' +
      '<div class="board-host" id="board-host"></div>' +
      '<div class="stage-bar"><div class="warnings" id="stage-warnings"></div>' +
      '<div class="stage-actions">' + pointHtml +
      '<button type="button" class="btn btn-primary" id="record-btn">' + SL.icon('chart-line', '', 17) + '记录当前数据</button>' +
      '</div></div></section>' +

      '<aside class="side">' +
      '<section class="panel"><div class="panel-head"><h2>仪表读数</h2></div><div class="meters-host" id="meters-host"></div></section>' +
      '<section class="panel panel-extra" id="extra-panel"' + (lab.renderExtra ? '' : ' hidden') + '><div class="panel-head"><h2>图像</h2></div><div id="extra-host"></div></section>' +
      '<section class="panel panel-guide" id="guide-panel"></section>' +
      '<section class="panel panel-records"><div class="panel-head"><h2>实验记录单</h2><span class="panel-badge" id="record-count"></span></div>' +
      '<div id="records-host"></div>' +
      '<div class="record-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="export-btn">' + SL.icon('download', '', 15) + '导出 CSV</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="print-btn">' + SL.icon('printer', '', 15) + '打印</button>' +
      '<button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" id="clear-btn">' + SL.icon('trash', '', 15) + '清空</button>' +
      '</div></section>' +
      '</aside></div></div>';

    app.board = new SL.Board(SL.$('#board-host'), {
      onChange: function () { app.selectedComp = null; renderInspector(); sync(); updateHistoryButtons(); },
      onSelect: function (comp) { app.selectedComp = comp ? comp.id : null; renderInspector(); },
      onInspect: function (compId) { app.selectedComp = compId; renderInspector(); },
      onSlider: function () { scheduleSync(40); }
    });
    if (SL.skins) app.board.setSkin(SL.skins.current());

    if (savedScene()) {
      app.board.setScene(savedScene());
    } else {
      app.board.setScene(lab.initial(app.mode));
    }

    bindLabEvents();
    renderGuide();
    renderRecords();
    renderInspector();
    sync();
    updateHistoryButtons();
    if (app.mode === 'guided' && app.guideIndex > 0 && !meta.free && meta.steps.length) {
      SL.toast('已恢复上次进度：第 ' + Math.min(app.guideIndex + 1, meta.steps.length) + ' 步', 'info');
    }
  }

  function savedScene() {
    var saved = loadProgress(app.lab.id);
    return saved && saved.scene && saved.scene.components ? saved.scene : null;
  }

  function beautifyIcon() {
    return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 3l1.3 3.4L14.7 7.7 11.3 9 10 12.4 8.7 9 5.3 7.7 8.7 6.4z"/>' +
      '<path d="M17.5 12.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z"/>' +
      '<path d="M6.5 15l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7L4.1 18l1.7-.7z"/></svg>';
  }

  function paletteIcon(type) {
    var thumb = SL.skins ? SL.skins.thumb(type) : '';
    if (thumb) return thumb;
    if (type === 'switch') {
      return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
        '<circle cx="6" cy="17" r="1.6"/><circle cx="18" cy="17" r="1.6"/><line x1="7" y1="16" x2="17" y2="8"/></svg>';
    }
    if (type === 'rheostat') {
      return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
        '<rect x="3" y="9" width="18" height="7" rx="1.5"/><line x1="4" y1="6" x2="20" y2="6"/>' +
        '<line x1="12" y1="6" x2="12" y2="9"/><circle cx="12" cy="6" r="1.6"/></svg>';
    }
    return SL.icon(SL.circuit.TYPES[type].icon, '', 22);
  }

  /* 切换皮肤后同步元件库图标（拟真皮肤使用缩略图） */
  function refreshPaletteIcons() {
    SL.$$('.palette-item').forEach(function (btn) {
      var host = btn.querySelector('.palette-icon');
      if (host) host.innerHTML = paletteIcon(btn.getAttribute('data-type'));
    });
  }

  function updateHistoryButtons() {
    var undo = SL.$('#lab-undo');
    var redo = SL.$('#lab-redo');
    if (!undo || !redo || !app.board) return;
    undo.disabled = !app.board.canUndo();
    redo.disabled = !app.board.canRedo();
  }

  function bindLabEvents() {
    SL.$('#lab-back').addEventListener('click', leaveLab);
    SL.$('#lab-undo').addEventListener('click', function () {
      if (!app.board.undo()) {
        SL.toast('没有可撤回的操作', 'warn');
        return;
      }
      app.flags = {};
      updateHistoryButtons();
      SL.sound.play('click');
    });
    SL.$('#lab-redo').addEventListener('click', function () {
      if (!app.board.redo()) {
        SL.toast('没有可重做的操作', 'warn');
        return;
      }
      app.flags = {};
      updateHistoryButtons();
      SL.sound.play('click');
    });
    SL.$('#lab-beautify').addEventListener('click', function () {
      if (!app.board.beautify()) {
        SL.toast('实验台上还没有元件，先从左边的元件库添加吧', 'warn');
        return;
      }
      SL.sound.play('success');
      SL.toast('已整理元件位置并理顺导线', 'ok');
    });
    SL.$('#lab-example').addEventListener('click', function () {
      SL.confirm('载入示例电路会替换当前实验台上的连线，确定吗？', function () {
        app.board.setScene(app.lab.example());
        app.flags = {};
        sync();
        SL.toast('已载入示例电路，可直接观察或继续修改', 'ok');
      }, { okText: '载入示例' });
    });
    SL.$('#lab-reset').addEventListener('click', function () {
      SL.confirm('重置会清空当前实验台上的元件、连线和引导进度（记录单不受影响），确定吗？', function () {
        app.board.setScene(app.lab.initial(app.mode));
        app.guideIndex = 0;
        app.answers = {};
        app.submitted = false;
        app.allAnswered = false;
        app.flags = {};
        app.selectedComp = null;
        renderInspector();
        renderGuide();
        sync();
        SL.toast('已重置实验台', 'ok');
      }, { okText: '重置' });
    });

    SL.$$('[data-mode-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode-btn');
        if (mode === app.mode) return;
        app.mode = mode;
        SL.$$('[data-mode-btn]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-mode-btn') === mode); });
        renderGuide();
        saveProgress();
        SL.toast(mode === 'guided' ? '引导模式：按步骤完成探究' : '自由探究模式：任意搭建电路', 'info');
      });
    });

    SL.$$('[data-skin-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-skin-btn');
        if (id === app.skin) return;
        app.skin = id;
        if (SL.skins) SL.skins.set(id);
        if (app.board) app.board.setSkin(id);
        SL.$$('[data-skin-btn]').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-skin-btn') === id);
        });
        refreshPaletteIcons();
        SL.sound.play('click');
        SL.toast(id === 'nb' ? '已切换为拟真元件外观' : '已切换为教材电路符号', 'info');
      });
    });

    SL.$$('.palette-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addFromPalette(btn.getAttribute('data-type'));
      });
    });

    SL.$('#tool-rotate').addEventListener('click', function () { app.board.rotateSelected(); });
    SL.$('#tool-delete').addEventListener('click', function () { app.board.removeSelected(); renderInspector(); });
    SL.$('#tool-fit').addEventListener('click', function () { app.board.fit(); });

    SL.$('#record-btn').addEventListener('click', recordNow);
    SL.$('#export-btn').addEventListener('click', function () {
      SL.records.exportCSV(app.lab.meta, app.rows);
    });
    SL.$('#print-btn').addEventListener('click', function () {
      SL.records.print(app.lab.meta, app.rows, app.answers);
    });
    SL.$('#clear-btn').addEventListener('click', function () {
      SL.confirm('确定清空本实验的全部记录数据？此操作不可撤销。', function () {
        SL.records.clear(app.lab.id);
        app.rows = [];
        renderRecords();
        evaluateChecks();
        SL.toast('记录已清空', 'ok');
      }, { okText: '清空记录' });
    });

    var pointSelect = SL.$('#point-select');
    if (pointSelect) {
      pointSelect.addEventListener('change', function () {
        app.point = pointSelect.value;
        saveProgress();
      });
    }
  }

  function freeSpot() {
    var scene = app.board.getScene();
    var candidates = [];
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 4; col++) {
        candidates.push({ x: 220 + col * 260, y: 200 + row * 180 });
      }
    }
    candidates.push({ x: 600, y: 380 });
    for (var i = 0; i < candidates.length; i++) {
      var p = candidates[i];
      var clear = scene.components.every(function (c) {
        return Math.abs(c.x - p.x) > 120 || Math.abs(c.y - p.y) > 110;
      });
      if (clear) return p;
    }
    return { x: 300 + Math.round(Math.random() * 600), y: 160 + Math.round(Math.random() * 400) };
  }

  function addFromPalette(type) {
    var spot = freeSpot();
    var props = {};
    if (type === 'battery') props.cells = 2;
    if (type === 'resistor') {
      props.resistance = 10;
      props.unknown = app.lab.id === 'ohm-r';
    }
    if (type === 'rheostat') { props.slider = 0.5; props.max = 20; }
    if (type === 'ammeter') props.range = 0.6;
    if (type === 'voltmeter') props.range = 3;
    var comp = app.board.addComponent(type, spot.x, spot.y, props);
    app.selectedComp = comp.id;
    renderInspector();
    sync();
    SL.sound.play('connect');
  }

  function scheduleSync(delay) {
    if (app.syncTimer) clearTimeout(app.syncTimer);
    app.syncTimer = setTimeout(function () {
      app.syncTimer = null;
      sync();
    }, delay || 60);
  }

  /* ---------- 求解与刷新 ---------- */
  function sync() {
    if (!app.board || !app.lab) return;
    var scene = app.board.getScene();
    var result = SL.circuit.solve(scene);

    var burned = false;
    Object.keys(result.bulbs || {}).forEach(function (id) {
      var info = result.bulbs[id];
      var comp = SL.circuit.getComp(scene, id);
      if (comp && !comp.props.burned && info.ratio > 1.5) {
        comp.props.burned = true;
        burned = true;
      }
    });
    if (burned) {
      result = SL.circuit.solve(scene);
      SL.toast('灯泡实际功率过大，灯丝烧断了。点击「重置」可重新实验', 'warn', 4200);
    }

    app.result = result;
    app.board.setResult(result);
    SL.meters.render(SL.$('#meters-host'), scene, result, function (id, range) {
      app.board.updateProps(id, { range: range });
    });
    renderWarnings(result);
    if (app.lab.tick) app.lab.tick(ctx());
    evaluateChecks();
    if (app.lab.renderExtra) app.lab.renderExtra(SL.$('#extra-host'), app.rows);
    saveProgress();
  }

  function renderWarnings(result) {
    var host = SL.$('#stage-warnings');
    if (!host) return;
    var seen = {};
    var items = [];
    (result.warnings || []).forEach(function (w) {
      var key = w.type + (w.compId || '');
      if (seen[key]) return;
      seen[key] = true;
      items.push(w);
    });
    if (!items.length) {
      host.innerHTML = '<span class="warn-ok">' + SL.icon('check', '', 14) + '接线正常，可读数记录</span>';
      return;
    }
    host.innerHTML = items.slice(0, 3).map(function (w) {
      return '<span class="warn-chip warn-' + w.type + '">' + SL.icon('alert-triangle', '', 14) + SL.escape(w.message) + '</span>';
    }).join('');
  }

  /* ---------- 引导模式 ---------- */
  function evaluateChecks() {
    if (app.mode !== 'guided' || !app.result || !app.lab) return;
    var steps = app.lab.meta.steps;
    var advanced = 0;
    var guard = 0;
    while (app.guideIndex < steps.length && guard < steps.length) {
      var step = steps[app.guideIndex];
      var ok = false;
      try { ok = !!step.check(ctx()); } catch (e) { ok = false; }
      if (!ok) break;
      app.guideIndex += 1;
      advanced += 1;
      guard += 1;
    }
    if (advanced) {
      SL.sound.play('success');
      var current = steps[Math.min(app.guideIndex, steps.length) - 1];
      SL.toast('已完成：' + current.title, 'ok');
      renderGuide();
      saveProgress();
    }
  }

  function normalizeAnswer(value) {
    return String(value || '').replace(/\s+/g, '').replace(/[，。；：、,;:]/g, '').replace(/＝/g, '=').toLowerCase();
  }

  function checkAnswer(q, value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return false;
    if (q.type === 'number') {
      var num = parseFloat(raw.replace(/[^\d.\-]/g, ''));
      if (isNaN(num)) return false;
      return Math.abs(num - q.answer) <= (q.tolerance || 0);
    }
    var normalized = q.normalize ? normalizeAnswer(raw) : raw.toLowerCase();
    return (q.keywords || []).some(function (k) {
      var needle = q.normalize ? normalizeAnswer(k) : k.toLowerCase();
      return normalized.indexOf(needle) !== -1;
    });
  }

  function renderGuide() {
    var host = SL.$('#guide-panel');
    if (!host) return;
    var meta = app.lab.meta;
    if (app.mode === 'free') {
      var isSandbox = !!meta.free;
      host.innerHTML = '<div class="panel-head"><h2>' + (isSandbox ? '全自由实验室' : '自由探究') + '</h2></div>' +
        '<div class="free-guide"><p>' + (isSandbox
          ? '空白画布，元件数量与参数都不限。随便搭、随便接，右侧仪表会实时显示读数。'
          : '自由搭建任意电路，右侧仪表会实时显示读数。可以随时点击「示例电路」查看标准接法。') + '</p>' +
        '<ul class="free-list"><li>改变电池节数、电阻阻值或滑片位置，观察读数变化</li>' +
        '<li>故意断开一根导线或短接电源，看看会出现什么提示</li>' +
        '<li>记录多组数据后导出 CSV，比较规律</li></ul>' +
        '<button type="button" class="btn btn-soft btn-sm" id="free-help">' + SL.icon('help-circle', '', 15) + '查看使用说明</button></div>';
      var btn = SL.$('#free-help', host);
      if (btn) btn.addEventListener('click', SL.home.help);
      return;
    }

    var steps = meta.steps;
    var done = Math.min(app.guideIndex, steps.length);
    var pct = Math.round((done / steps.length) * 100);
    var stepsHtml = steps.map(function (step, index) {
      var state = index < done ? 'done' : index === done ? 'current' : 'todo';
      var hintOpen = !!app.hints[index];
      return '<li class="step step-' + state + '">' +
        '<span class="step-num">' + (index < done ? '✓' : index + 1) + '</span>' +
        '<div class="step-content"><h3>' + step.title + '</h3>' +
        (state === 'current' ? '<p class="step-instruction">' + step.instruction + '</p>' +
          '<button type="button" class="hint-toggle" data-hint="' + index + '">' + (hintOpen ? '收起提示' : '需要提示？') + '</button>' +
          (hintOpen ? '<p class="step-hint">' + SL.icon('help-circle', '', 14) + step.hint + '</p>' : '') : '') +
        '</div></li>';
    }).join('');

    var conclusionsHtml = '';
    if (meta.conclusions && meta.conclusions.length) {
      conclusionsHtml = '<div class="conclusions"><div class="conclusions-head"><h3>实验结论</h3>' +
        (app.submitted ? '<button type="button" class="link-btn" id="retry-btn">重新作答</button>' : '') + '</div>' +
        meta.conclusions.map(function (q) {
          var val = app.answers[q.id] || '';
          var correct = app.submitted && checkAnswer(q, val);
          var cls = app.submitted ? (correct ? ' is-correct' : ' is-wrong') : '';
          return '<div class="conclusion-item' + cls + '" data-q="' + q.id + '">' +
            '<label><span class="q-label">' + q.label + '</span>' +
            '<input type="text" inputmode="' + (q.type === 'number' ? 'decimal' : 'text') + '" data-answer="' + q.id + '" value="' + SL.escape(val) + '"' +
            (app.submitted ? ' disabled' : '') + ' placeholder="填写答案">' +
            '<span class="q-suffix">' + q.suffix + '</span></label>' +
            (app.submitted ? '<p class="q-feedback">' + (correct ? '✓ 正确' : '✗ 再想一想') + '</p>' +
              '<p class="q-reference">参考答案：' + q.reference + '</p>' : '') +
            '</div>';
        }).join('') +
        '<button type="button" class="btn btn-primary btn-block" id="submit-answers"' + (app.submitted ? ' disabled' : '') + '>' +
        (app.submitted ? (app.allAnswered ? '全部正确' : '已提交') : '提交结论') + '</button></div>';
    }

    var allDone = done >= steps.length;
    host.innerHTML = '<div class="panel-head"><h2>实验步骤</h2><span class="panel-badge">' + done + ' / ' + steps.length + '</span></div>' +
      '<div class="step-progress"><span style="width:' + pct + '%"></span></div>' +
      (allDone ? '<div class="done-banner">' + SL.icon('check', '', 18) + '<div><strong>实验步骤已完成</strong><span>继续填写下方结论，或切换到自由模式继续探究。</span></div></div>' : '') +
      '<ol class="step-list">' + stepsHtml + '</ol>' + conclusionsHtml;

    SL.$$('[data-hint]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = btn.getAttribute('data-hint');
        app.hints[idx] = !app.hints[idx];
        renderGuide();
      });
    });

    SL.$$('[data-answer]', host).forEach(function (input) {
      input.addEventListener('input', function () {
        app.answers[input.getAttribute('data-answer')] = input.value;
        saveProgress();
      });
    });

    var submit = SL.$('#submit-answers', host);
    if (submit) submit.addEventListener('click', submitAnswers);
    var retry = SL.$('#retry-btn', host);
    if (retry) {
      retry.addEventListener('click', function () {
        app.submitted = false;
        app.allAnswered = false;
        renderGuide();
        saveProgress();
      });
    }
  }

  function submitAnswers() {
    var meta = app.lab.meta;
    app.submitted = true;
    var allCorrect = true;
    (meta.conclusions || []).forEach(function (q) {
      if (!checkAnswer(q, app.answers[q.id])) allCorrect = false;
    });
    app.allAnswered = allCorrect;
    renderGuide();
    saveProgress();
    evaluateChecks();
    if (allCorrect) {
      SL.sound.play('success');
      SL.toast('全部结论正确，实验完成！', 'ok', 3200);
    } else {
      SL.toast('已提交，看看反馈再修改答案', 'info');
    }
  }

  /* ---------- 记录 ---------- */
  function recordNow() {
    var row = app.lab.measure(ctx());
    if (!row) return;
    SL.records.add(app.lab.id, row);
    app.rows = SL.records.get(app.lab.id);
    renderRecords();
    evaluateChecks();
    SL.sound.play('record');
    SL.toast('已记录一组数据', 'ok');
    if (app.lab.renderExtra) app.lab.renderExtra(SL.$('#extra-host'), app.rows);
  }

  function renderRecords() {
    var host = SL.$('#records-host');
    if (!host) return;
    SL.records.renderTable(host, app.lab.meta, app.rows);
    var badge = SL.$('#record-count');
    if (badge) badge.textContent = app.rows.length + ' 条';
  }

  /* ---------- 元件属性 ---------- */
  function rheostatNoteText(info) {
    if (info.wiring === 'incomplete') return '未接入电路，请“一上一下”连接';
    var activeText = info.active < 0.05 ? '≈0' : String(Math.round(info.active * 10) / 10);
    return '接入电阻 ' + activeText + ' Ω / ' + info.max + ' Ω';
  }

  function renderInspector() {
    var host = SL.$('#inspector');
    if (!host) return;
    var comp = app.selectedComp ? SL.circuit.getComp(app.board.getScene(), app.selectedComp) : null;
    if (!comp) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;
    var html = '<span class="inspector-title">' + SL.circuit.TYPES[comp.type].label + '</span>';
    if (comp.type === 'resistor') {
      if (comp.props.unknown) {
        html += '<span class="inspector-note">未知电阻 Rx（真实阻值不显示）</span>';
      } else if (app.lab.meta.free) {
        html += '<span class="inspector-label">阻值</span><input type="number" min="0.1" max="1000" step="0.1" value="' + Number(comp.props.resistance || 10) + '" id="resistance-input" class="slider-input">' +
          '<span class="inspector-note">Ω（0.1–1000）</span>';
      } else {
        html += '<span class="inspector-label">阻值</span><div class="chip-group">' +
          [5, 10, 15, 20].map(function (r) {
            return '<button type="button" class="chip' + (Number(comp.props.resistance) === r ? ' active' : '') + '" data-res="' + r + '">' + r + 'Ω</button>';
          }).join('') + '</div>';
      }
    } else if (comp.type === 'battery') {
      html += '<span class="inspector-label">节数</span><div class="chip-group">' +
        [1, 2, 3, 4].map(function (n) {
          return '<button type="button" class="chip' + (Number(comp.props.cells) === n ? ' active' : '') + '" data-cells="' + n + '">' + n + ' 节</button>';
        }).join('') + '</div><span class="inspector-note">' + SL.fmt((comp.props.cells || 2) * 1.5, 1) + ' V</span>';
    } else if (comp.type === 'rheostat') {
      var slider = comp.props.slider == null ? 0.5 : comp.props.slider;
      var rinfo = SL.circuit.rheostatInfo(comp, app.board.getScene());
      html += '<span class="inspector-label">滑片</span><input type="range" min="0" max="1" step="0.01" value="' + slider + '" id="slider-input" class="slider-input">' +
        '<span class="inspector-note" id="rheostat-note">' + rheostatNoteText(rinfo) + '</span>' +
        (rinfo.wiring === 'valid' ? '<span class="inspector-note">滑片移到' + (rinfo.maxAtSlider === 1 ? '最右端' : '最左端') + '时接入电阻最大</span>' : '');
      if (app.lab.meta.free) {
        html += '<span class="inspector-label">最大阻值</span><input type="number" min="1" max="500" step="1" value="' + Number(comp.props.max || 20) + '" id="rheostat-max-input" class="slider-input">' +
          '<span class="inspector-note">Ω（1–500）</span>';
      }
    } else if (comp.type === 'switch') {
      html += '<button type="button" class="btn btn-soft btn-sm" id="toggle-switch">' + (comp.props.closed ? '断开开关' : '闭合开关') + '</button>';
    } else if (comp.type === 'dcsupply') {
      html += '<span class="inspector-label">电压</span><input type="number" min="1.5" max="12" step="1.5" value="' + Number(comp.props.voltage || 3) + '" id="supply-voltage-input" class="slider-input">' +
        '<span class="inspector-note">V（1.5–12，步进 1.5）</span>';
    } else if (comp.type === 'switch-spdt') {
      var spdtTo = comp.props.to === 'c' ? 'c' : 'b';
      html += '<span class="inspector-label">触点</span><div class="chip-group">' +
        ['b', 'c'].map(function (to) {
          return '<button type="button" class="chip' + (spdtTo === to ? ' active' : '') + '" data-spdt="' + to + '">接 ' + to + '</button>';
        }).join('') + '</div><span class="inspector-note">a 与所选触点接通，另一个触点断开</span>';
    } else if (comp.type === 'resistance-box') {
      var boxDigits = Array.isArray(comp.props.digits) ? comp.props.digits : [0, 0, 1, 0];
      html += '<span class="inspector-label">旋钮</span>' +
        boxDigits.map(function (d, i) {
          return '<input type="number" min="0" max="9" step="1" value="' + Math.max(0, Math.min(9, Math.round(Number(d) || 0))) + '" data-digit="' + i + '" class="slider-input" style="width:46px">';
        }).join('') +
        '<span class="inspector-note">Ω（×1000 / ×100 / ×10 / ×1）</span>';
    } else if (comp.type === 'fuse') {
      var fuseRating = Number(comp.props.rating || 0.5);
      html += '<span class="inspector-label">额定电流</span><div class="chip-group">' +
        [0.3, 0.5, 1, 2].map(function (r) {
          return '<button type="button" class="chip' + (fuseRating === r ? ' active' : '') + '" data-fuse-rating="' + r + '">' + r + 'A</button>';
        }).join('') + '</div>' +
        (comp.props.blown
          ? '<span class="inspector-note" style="color:var(--danger)">已熔断</span><button type="button" class="btn btn-soft btn-sm" id="fuse-reset">更换保险丝</button>'
          : '<span class="inspector-note">正常</span>');
    } else if (comp.type === 'led') {
      var ledInfo = app.result && app.result.leds ? app.result.leds[comp.id] : null;
      html += '<span class="inspector-note">' + (ledInfo && ledInfo.on ? '发光（正向导通）' : '不发光（反向或电压不足）') + '</span>' +
        (ledInfo ? '<span class="inspector-note">I = ' + SL.fmt(Math.abs(ledInfo.current), 3) + ' A</span>' : '');
    } else if (comp.type === 'motor') {
      var motorInfo = app.result && app.result.motors ? app.result.motors[comp.id] : null;
      html += '<span class="inspector-note">' + (motorInfo && motorInfo.spinning ? '转动中' : '停转') + '</span>' +
        (motorInfo ? '<span class="inspector-note">I = ' + SL.fmt(Math.abs(motorInfo.current), 3) + ' A · P = ' + SL.fmt(Math.abs(motorInfo.power), 2) + ' W</span>' : '');
    } else if (comp.type === 'bell') {
      var bellInfo = app.result && app.result.bells ? app.result.bells[comp.id] : null;
      html += '<span class="inspector-note">' + (bellInfo && bellInfo.ringing ? '响铃中' : '静音') + '</span>' +
        (bellInfo ? '<span class="inspector-note">I = ' + SL.fmt(Math.abs(bellInfo.current), 3) + ' A</span>' : '');
    } else if (comp.type === 'electromagnet') {
      var magInfo = app.result && app.result.electromagnets ? app.result.electromagnets[comp.id] : null;
      html += '<span class="inspector-note">' + (magInfo && magInfo.on
        ? '已通电，' + (magInfo.poleN === 'left' ? '左端为 N 极' : '右端为 N 极')
        : '未通电') + '</span>' +
        (magInfo ? '<span class="inspector-note">I = ' + SL.fmt(Math.abs(magInfo.current), 3) + ' A</span>' : '');
    } else if (comp.type === 'generator') {
      var genRunning = comp.props.running !== false;
      var genVoltage = Math.max(1.5, Math.min(12, Number(comp.props.voltage) || 3));
      var genInfo = app.result && app.result.generators ? app.result.generators[comp.id] : null;
      html += '<span class="inspector-label">电压</span><input type="range" min="1.5" max="12" step="0.5" value="' + genVoltage + '" id="generator-voltage-input" class="slider-input">' +
        '<span class="inspector-note" id="generator-voltage-note">' + SL.fmt(genVoltage, 1) + ' V（1.5–12）</span>' +
        '<button type="button" class="btn btn-soft btn-sm" id="generator-toggle">' + (genRunning ? '停止' : '摇动') + '</button>' +
        '<span class="inspector-note">' + (genRunning ? '摇动中，发电电压 ' + SL.fmt(genInfo ? genInfo.emf : genVoltage, 1) + ' V' : '已停止，输出 0 V') + '</span>' +
        (genInfo ? '<span class="inspector-note">I = ' + SL.fmt(Math.abs(genInfo.current), 3) + ' A</span>' : '');
    } else if (comp.type === 'relay') {
      var relayInfo = app.result && app.result.relays ? app.result.relays[comp.id] : null;
      html += '<span class="inspector-note">' + (relayInfo && relayInfo.energized ? '已吸合：com–no 导通' : '已释放：com–nc 导通') + '</span>' +
        (relayInfo ? '<span class="inspector-note">线圈电流 I = ' + SL.fmt(Math.abs(relayInfo.coilCurrent), 3) + ' A</span>' : '');
    } else if (comp.type === 'speaker') {
      var speakerInfo = app.result && app.result.speakers ? app.result.speakers[comp.id] : null;
      html += '<span class="inspector-note">' + (speakerInfo && speakerInfo.active ? '发声（纸盆振动中）' : '无声') + '</span>' +
        (speakerInfo ? '<span class="inspector-note">I = ' + SL.fmt(Math.abs(speakerInfo.current), 3) + ' A · P = ' + SL.fmt(Math.abs(speakerInfo.power), 2) + ' W</span>' : '') +
        '<span class="inspector-note">音圈电阻 8 Ω</span>';
    } else if (comp.type === 'galvanometer') {
      var galInfo = app.result && app.result.meters ? app.result.meters[comp.id] : null;
      var galRange = Number(comp.props.range) || 0.1;
      var galText = galInfo
        ? (galInfo.value > 1e-9 ? '+' : galInfo.value < -1e-9 ? '−' : '') + SL.fmt(Math.abs(galInfo.value), 3)
        : '—';
      html += '<span class="inspector-note' + (galInfo && galInfo.overRange ? ' danger' : '') + '">读数 ' + galText + ' A（量程 ±' + galRange + ' A）</span>' +
        '<span class="inspector-note">电流从 + 接线柱流入时读数为正</span>' +
        (galInfo && galInfo.overRange ? '<span class="inspector-note" style="color:var(--danger)">已超量程</span>' : '');
    } else if (comp.type === 'ammeter' || comp.type === 'voltmeter') {
      var opts = comp.type === 'ammeter' ? [0.6, 3] : [3, 15];
      html += '<span class="inspector-label">量程</span><div class="chip-group">' +
        opts.map(function (r) {
          return '<button type="button" class="chip' + (Number(comp.props.range) === r ? ' active' : '') + '" data-range-chip="' + r + '">0–' + r + '</button>';
        }).join('') + '</div>';
    }
    html += '<span class="inspector-spacer"></span><button type="button" class="btn btn-ghost btn-sm" id="insp-rotate">' + SL.icon('rotate-clockwise', '', 15) + '旋转</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="insp-delete">' + SL.icon('trash', '', 15) + '删除</button>';
    host.innerHTML = html;

    SL.$$('[data-res]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.board.updateProps(comp.id, { resistance: Number(btn.getAttribute('data-res')) }, true);
        app.flags = {};
        sync();
        renderInspector();
      });
    });
    SL.$$('[data-cells]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.board.updateProps(comp.id, { cells: Number(btn.getAttribute('data-cells')) }, true);
        sync();
        renderInspector();
      });
    });
    SL.$$('[data-range-chip]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.board.updateProps(comp.id, { range: Number(btn.getAttribute('data-range-chip')) }, true);
        sync();
        renderInspector();
      });
    });
    var sliderInput = SL.$('#slider-input', host);
    if (sliderInput) {
      sliderInput.addEventListener('input', function () {
        app.board.updateProps(comp.id, { slider: Number(sliderInput.value) }, true);
        var note = SL.$('#rheostat-note', host);
        if (note) note.textContent = rheostatNoteText(SL.circuit.rheostatInfo(comp, app.board.getScene()));
        scheduleSync(40);
      });
    }
    var resistanceInput = SL.$('#resistance-input', host);
    if (resistanceInput) {
      resistanceInput.addEventListener('change', function () {
        var value = Math.max(0.1, Math.min(1000, Number(resistanceInput.value) || 10));
        app.board.updateProps(comp.id, { resistance: value }, true);
        sync();
        renderInspector();
      });
    }
    var maxInput = SL.$('#rheostat-max-input', host);
    if (maxInput) {
      maxInput.addEventListener('change', function () {
        var value = Math.max(1, Math.min(500, Number(maxInput.value) || 20));
        app.board.updateProps(comp.id, { max: value }, true);
        sync();
        renderInspector();
      });
    }
    var toggle = SL.$('#toggle-switch', host);
    if (toggle) {
      toggle.addEventListener('click', function () {
        app.board.updateProps(comp.id, { closed: !comp.props.closed }, true);
        sync();
        renderInspector();
      });
    }
    var supplyInput = SL.$('#supply-voltage-input', host);
    if (supplyInput) {
      supplyInput.addEventListener('change', function () {
        var value = Math.max(1.5, Math.min(12, Number(supplyInput.value) || 3));
        app.board.updateProps(comp.id, { voltage: value }, true);
        sync();
        renderInspector();
      });
    }
    var genVoltageInput = SL.$('#generator-voltage-input', host);
    if (genVoltageInput) {
      genVoltageInput.addEventListener('input', function () {
        var value = Math.max(1.5, Math.min(12, Number(genVoltageInput.value) || 3));
        app.board.updateProps(comp.id, { voltage: value }, true);
        var note = SL.$('#generator-voltage-note', host);
        if (note) note.textContent = SL.fmt(value, 1) + ' V（1.5–12）';
        scheduleSync(40);
      });
      genVoltageInput.addEventListener('change', function () {
        sync();
        renderInspector();
      });
    }
    var genToggle = SL.$('#generator-toggle', host);
    if (genToggle) {
      genToggle.addEventListener('click', function () {
        app.board.updateProps(comp.id, { running: comp.props.running === false }, true);
        sync();
        renderInspector();
      });
    }
    SL.$$('[data-spdt]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.board.updateProps(comp.id, { to: btn.getAttribute('data-spdt') }, true);
        sync();
        renderInspector();
      });
    });
    SL.$$('[data-digit]', host).forEach(function (input) {
      input.addEventListener('change', function () {
        var next = (Array.isArray(comp.props.digits) ? comp.props.digits : [0, 0, 1, 0]).slice();
        SL.$$('[data-digit]', host).forEach(function (el) {
          var i = Number(el.getAttribute('data-digit'));
          next[i] = Math.max(0, Math.min(9, Math.round(Number(el.value) || 0)));
        });
        app.board.updateProps(comp.id, { digits: next }, true);
        sync();
        renderInspector();
      });
    });
    SL.$$('[data-fuse-rating]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.board.updateProps(comp.id, { rating: Number(btn.getAttribute('data-fuse-rating')) }, true);
        sync();
        renderInspector();
      });
    });
    var fuseReset = SL.$('#fuse-reset', host);
    if (fuseReset) {
      fuseReset.addEventListener('click', function () {
        app.board.updateProps(comp.id, { blown: false }, true);
        sync();
        renderInspector();
        SL.toast('已更换保险丝', 'ok');
      });
    }
    SL.$('#insp-rotate', host).addEventListener('click', function () { app.board.rotateSelected(); });
    SL.$('#insp-delete', host).addEventListener('click', function () {
      app.board.removeSelected();
      renderInspector();
    });
  }

  /* ---------- 键盘 ---------- */
  function onKeydown(e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (!app.board) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.code === 'Equal')) {
      e.preventDefault();
      app.board.zoomBy(1.25);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_' || e.code === 'Minus')) {
      e.preventDefault();
      app.board.zoomBy(1 / 1.25);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey ? app.board.redo() : app.board.undo()) {
        app.flags = {};
        updateHistoryButtons();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      if (app.board.redo()) {
        app.flags = {};
        updateHistoryButtons();
      }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (app.board.removeSelected()) {
        e.preventDefault();
        renderInspector();
      }
    } else if (e.key === 'Escape') {
      app.board.pending = null;
      app.board.schedule();
    } else if (e.key === 'r' || e.key === 'R') {
      app.board.rotateSelected();
    }
  }

  function leaveLab() {
    saveProgress();
    app.board = null;
    app.lab = null;
    showHome();
  }

  function init() {
    renderTopbar();
    showHome();
  }

  SL.app = { init: init, openLab: openLab, showHome: showHome, state: app };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
