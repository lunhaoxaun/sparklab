/* 首页：科目选择、实验大厅、我的记录、使用说明与致谢 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  function progressMap() {
    var data = SL.storage.get(SL.KEYS.progress, {});
    return data && typeof data === 'object' ? data : {};
  }

  function labProgress(lab) {
    var total = lab.steps ? lab.steps.length : 0;
    if (!total) return { done: 0, total: 0, free: true };
    var p = progressMap()[lab.id];
    if (!p) return { done: 0, total: total, free: false };
    return { done: Math.min(total, p.stepIndex || 0), total: total, free: false };
  }

  function card(lab) {
    var prog = labProgress(lab);
    var pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
    var count = SL.records.count(lab.id);
    var equipment = lab.equipment.map(function (item) {
      return '<span class="equip-chip">' + SL.icon(item.icon, '', 16) + item.label + '</span>';
    }).join('');
    var progressBlock = prog.free
      ? '<div class="lab-progress"><div class="progress-info"><span>自由搭建 · 元件数量不限</span>' +
        '<span class="record-count">' + SL.icon('chart-line', '', 14) + ' 记录 ' + count + ' 条</span></div></div>'
      : '<div class="lab-progress"><div class="progress-info"><span>引导进度 ' + prog.done + '/' + prog.total + '</span>' +
        '<span class="record-count">' + SL.icon('chart-line', '', 14) + ' 记录 ' + count + ' 条</span></div>' +
        '<div class="progress-track"><span style="width:' + pct + '%"></span></div></div>';
    var actions = prog.free
      ? '<button class="btn btn-primary" type="button" data-mode="free" data-lab="' + lab.id + '">' + SL.icon('player-play', '', 16) + '进入实验室</button>'
      : '<button class="btn btn-primary" type="button" data-mode="guided" data-lab="' + lab.id + '">' + SL.icon('player-play', '', 16) + '引导模式</button>' +
        '<button class="btn btn-ghost" type="button" data-mode="free" data-lab="' + lab.id + '">' + SL.icon('settings', '', 16) + '自由探究</button>';
    return '<article class="lab-card" data-lab="' + lab.id + '" style="--accent:' + lab.accent + '">' +
      '<div class="lab-card-top">' +
      '<span class="lab-icon">' + SL.icon(lab.equipment[0].icon, '', 26) + '</span>' +
      '<div class="lab-card-meta"><span class="lab-tag">' + lab.tag + '</span><span class="lab-time">' + SL.icon('player-play', '', 13) + lab.time + '</span></div>' +
      '</div>' +
      '<h3 class="lab-title">' + lab.name + '</h3>' +
      '<p class="lab-desc">' + lab.short + '</p>' +
      '<div class="equip-row">' + equipment + '</div>' +
      progressBlock +
      '<div class="lab-actions">' + actions + '</div></article>';
  }

  var current = { subject: 'electricity', handlers: null };

  var SUBJECT_INTRO = {
    electricity: '三个教材实验与全自由实验室共用同一套电路仿真引擎，接线、读数、记录都与真实实验一致。',
    mechanics: '用真实数值算力矩、机械效率与浮力：拖动钩码、下放物块，读数随参数实时变化。',
    thermal: '从同一热源给物质加热，实时画出温度–时间图像，观察熔点、沸点与比热容的差别。',
    optics: '在光具座上拖动光源与透镜，按反射、折射定律逐条追迹光线，成像规律一目了然。'
  };

  var home = {
    render: function (root, handlers) {
      current.handlers = handlers;
      if (!SL.data.subjectById[current.subject] || !SL.data.subjectById[current.subject].available) {
        current.subject = 'electricity';
      }
      draw(root);
    }
  };

  function draw(root) {
    var handlers = current.handlers;
    var subjects = SL.data.subjects.map(function (s) {
      var cls = 'subject-pill' + (s.available ? (s.id === current.subject ? ' active is-current' : ' active') : ' disabled');
      return '<button type="button" class="' + cls + '" data-subject="' + s.id + '" aria-pressed="' +
        (s.available && s.id === current.subject) + '">' +
        SL.icon(s.icon, '', 18) + '<span>' + s.name + '</span>' +
        (s.available ? '' : '<em>敬请期待</em>') + '</button>';
    }).join('');

    var subject = SL.data.subjectById[current.subject];
    var labs = SL.data.labs.filter(function (lab) { return lab.subject === current.subject; });

    root.innerHTML = '<section class="home">' +
      '<div class="hero">' +
      '<div class="hero-copy">' +
      '<span class="eyebrow">' + SL.icon('atom', '', 15) + '初中物理 · 虚拟实验</span>' +
      '<h1>在浏览器里，<br><span class="hero-highlight">动手做物理实验</span></h1>' +
      '<p class="hero-sub">电学搭电路、力学拖杠杆、热学看曲线、光学追光路——四个板块共用一套离线引擎，读数与真实实验一致。</p>' +
      '<div class="subject-row">' + subjects + '</div>' +
      '<div class="hero-note">' + SL.icon('check', '', 14) + '完全离线运行 · 数据保存在本机 · 支持电脑与平板</div>' +
      '</div>' +
      '<div class="hero-art" aria-hidden="true">' +
      '<div class="art-ring"></div>' +
      '<div class="art-card art-card-a">' + SL.icon('circuit-battery', '', 34) + '</div>' +
      '<div class="art-card art-card-b">' + SL.icon('seesaw', '', 34) + '</div>' +
      '<div class="art-card art-card-c">' + SL.icon('lens', '', 34) + '</div>' +
      '<div class="art-line"></div>' +
      '</div>' +
      '</div>' +

      '<div class="hall-head"><div><h2>' + subject.name + '实验</h2><p>' + (SUBJECT_INTRO[subject.id] || subject.desc) + '</p></div>' +
      '<button class="btn btn-soft" type="button" id="all-records">' + SL.icon('chart-line', '', 16) + '我的记录</button></div>' +
      '<div class="lab-grid-home">' + (labs.length ? labs.map(card).join('') : emptyHall()) + '</div>' +
      '<div class="home-foot"><span>' + SL.icon('settings', '', 14) + '所有计算在本地完成，无需联网</span>' +
      '<span class="foot-ver">v' + SL.VERSION + ' · ' + SL.VERSION_DATE + '</span>' +
      '<span class="foot-links">' +
      (SL.canDownloadOffline()
        ? '<a class="link-btn" href="' + SL.OFFLINE_ZIP + '" download="' + SL.BRAND + '-离线版-v' + SL.VERSION + '.zip">' + SL.icon('download', '', 14) + '下载离线版</a>'
        : '') +
      '<button type="button" class="link-btn" id="open-help">使用说明</button>' +
      '<button type="button" class="link-btn" id="open-about">关于与致谢</button></span></div>' +
      '</section>';

    SL.$$('[data-subject]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var subject = SL.data.subjectById[btn.getAttribute('data-subject')];
        if (!subject.available) {
          SL.toast(subject.name + '实验正在建设中，敬请期待', 'info');
          return;
        }
        if (current.subject === subject.id) return;
        current.subject = subject.id;
        SL.sound.play('click');
        draw(root);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    SL.$$('.lab-actions [data-mode]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        SL.sound.play('click');
        handlers.onOpenLab(btn.getAttribute('data-lab'), btn.getAttribute('data-mode'));
      });
    });

    var helpBtn = SL.$('#open-help', root);
    if (helpBtn) helpBtn.addEventListener('click', handlers.help);
    var aboutBtn = SL.$('#open-about', root);
    if (aboutBtn) aboutBtn.addEventListener('click', handlers.about);
    var allBtn = SL.$('#all-records', root);
    if (allBtn) allBtn.addEventListener('click', handlers.allRecords);
  }

  function emptyHall() {
    return '<div class="hall-empty">' + SL.icon('atom', '', 26) +
      '<p>这个板块的实验还在建设中<br><span class="muted">先去看看已经开放的物理 · 电学实验吧。</span></p></div>';
  }

  var extra = {
    help: function () {
      var body = '<div class="help-grid">' +
        '<section><h3>怎样接线</h3><ol class="help-list">' +
        '<li>从左侧元件库点击元件，它会被放到实验台上；也可以直接拖动。</li>' +
        '<li>点击一个接线柱（小圆点），再点击另一个接线柱，就完成一根导线。</li>' +
        '<li>点击元件可拖动位置；选中后按 <kbd>Delete</kbd> 删除，按 <kbd>R</kbd> 旋转 90°。</li>' +
        '<li>点击开关可以闭合或断开；拖动滑动变阻器上方的滑片可以改变阻值。</li>' +
        '<li>双击元件可以查看和修改它的参数。</li>' +
        '<li>线路乱了就点「一键美化」：单回路会自动排成矩形、导线沿边走；其他电路按连接顺序分列排布。点错了就点「撤回」或按 <kbd>Ctrl</kbd>+<kbd>Z</kbd> 退回上一步。</li></ol></section>' +
        '<section><h3>怎样读数与记录</h3><ol class="help-list" start="7">' +
        '<li>电表接入电路后，右侧会自动出现表盘和数字读数。</li>' +
        '<li>点击量程按钮可以切换 0–0.6A / 0–3A、0–3V / 0–15V。</li>' +
        '<li>读数稳定后点击「记录当前数据」，数据会写进记录单。</li>' +
        '<li>记录单可导出 CSV（Excel 打开）或打印。</li></ol></section>' +
        '</div>' +
        '<section class="help-tip"><h3>安全与提示</h3><p>电学实验会检测电源短路、断路、电表反接、超量程、灯泡烧坏和滑动变阻器错误接法，并在画布下方给出提示。出现短路时请先断开开关。力学、热学、光学实验没有危险操作，可以随意改变参数。</p></section>' +
        '<section class="help-tip"><h3>力学 / 热学 / 光学怎么玩</h3><p>左栏是实验参数：拖动滑块或点按钮，画面和右侧读数会立刻重算。画面里的物体大多可以直接拖动——杠杆上的钩码、滑轮组的钩码、烧杯里的物块都能用鼠标或手指拉，松开即生效。有「播放」按钮的实验可以自动演示一段过程（如匀速提升、持续加热）。</p></section>' +
        '<section class="help-tip"><h3>快捷键</h3><p><kbd>Ctrl</kbd>+<kbd>=</kbd> 放大　<kbd>Ctrl</kbd>+<kbd>-</kbd> 缩小　<kbd>Ctrl</kbd>+滚轮、双指捏合也可缩放　<kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤回　<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> 重做　<kbd>Esc</kbd> 取消连线　<kbd>Delete</kbd> 删除选中　<kbd>R</kbd> 旋转元件</p></section>' +
        (SL.canDownloadOffline()
          ? '<section class="help-tip help-offline"><h3>教室断网怎么办</h3>' +
            '<p>先在联网环境把这个离线包下载下来，解压到教室电脑，之后双击文件夹里的 <code>index.html</code> 就能用，全程不需要网络。</p>' +
            '<p><a class="btn btn-soft" href="' + SL.OFFLINE_ZIP + '" download="' + SL.BRAND + '-离线版-v' + SL.VERSION + '.zip">' +
            SL.icon('download', '', 16) + '下载离线版 v' + SL.VERSION + '</a>' +
            '<span class="muted">压缩包内含完整程序，解压即用。</span></p></section>'
          : '');
      SL.modal({ title: '使用说明', body: body, className: 'modal-help' });
    },

    about: function () {
      var body = '<p class="modal-text">' + SL.BRAND + '是一个面向初中物理教学的离线虚拟实验工具，覆盖电学、力学、热学、光学四大板块，全部计算与数据存储都在你的浏览器本地完成。</p>' +
        '<section class="about-block"><h3>版本</h3><p>当前版本 <strong>v' + SL.VERSION + '</strong>（' + SL.VERSION_DATE + '）</p>' +
        '<p class="muted">v1.0.0 首个完整版 · v1.1.0 一键美化 · v1.2.0 撤回/重做 · v1.3.0 画布缩放与变阻器接线校验 · v1.4.0 全自由实验室与变阻器电阻判断修复 · v1.5.0 补齐初中电学常用元件 · v1.6.0 双套元件外观可切换 · v1.7.0 新增发电机、继电器、扬声器、灵敏电流计 · v1.8.0 在线版增加离线包下载入口 · v2.1.0 引入仿真引擎、学科墙扩展到力学/热学/光学，新增杠杆平衡、滑轮组机械效率、浮力探究三个力学实验</p></section>' +
        '<section class="about-block"><h3>图标素材</h3><p>界面与元件图标来自 <strong>Tabler Icons</strong>（MIT License），已下载并内联到本项目，运行时不访问网络。</p>' +
        '<p class="muted">https://github.com/tabler/tabler-icons</p></section>' +
        '<section class="about-block"><h3>自绘素材</h3><p>滑动变阻器、单刀开关、导线与电流动画由本项目按教材标准画法自绘；力学、热学、光学实验的舞台图形（杠杆、滑轮、烧杯、测力计、光路等）同样为自绘。</p></section>' +
        '<section class="about-block"><h3>许可</h3><p>第三方图标许可全文随项目保存在 <code>assets/icons/LICENSE</code>。</p></section>';
      SL.modal({ title: '关于与致谢', body: body, className: 'modal-about' });
    },

    allRecords: function () {
      var host = SL.el('div', { class: 'all-records' });
      var any = false;
      SL.data.labs.forEach(function (lab) {
        var rows = SL.records.get(lab.id);
        if (!rows.length) return;
        any = true;
        var section = SL.el('section', { class: 'records-section' });
        section.innerHTML = '<div class="records-head"><h3>' + lab.name + '</h3>' +
          '<button type="button" class="btn btn-soft btn-sm" data-export="' + lab.id + '">' + SL.icon('download', '', 15) + '导出</button></div>' +
          '<div class="records-table-host"></div>';
        host.appendChild(section);
        SL.records.renderTable(SL.$('.records-table-host', section), lab, rows);
        SL.$('[data-export]', section).addEventListener('click', function () { SL.records.exportCSV(lab, rows); });
      });
      if (!any) host.innerHTML = '<div class="empty-note">' + SL.icon('chart-line', 'empty-icon', 24) + '<p>还没有任何实验记录<br><span class="muted">进入实验，接线读数后点击「记录当前数据」。</span></p></div>';
      SL.modal({ title: '我的实验记录', body: host, className: 'modal-records' });
    }
  };

  Object.keys(extra).forEach(function (key) { home[key] = extra[key]; });

  SL.home = home;
})();
