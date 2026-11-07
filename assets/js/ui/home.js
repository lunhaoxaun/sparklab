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
      return '<span class="equip-chip">' + SL.apparatus(item.icon, 16) + item.label + '</span>';
    }).join('');
    var progressBlock = prog.free
      ? '<div class="lab-progress"><div class="progress-info"><span>' + (lab.freeNote || '自由探究 · 参数不限') + '</span>' +
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
      '<span class="lab-icon">' + SL.apparatus(lab.equipment[0].icon, 26) + '</span>' +
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
    mechanics: '用真实数值算力矩、机械效率与浮力：拖动钩码、下放物块，读数随参数实时变化；末尾的自由实验室可以把三套装置放在一起随意试。',
    thermal: '从同一热源给物质加热，实时画出温度–时间图像，观察沸点、比热容与晶体熔化的差别；热学自由实验室可随时切换三套装置。',
    optics: '转动光屏测量入射角与反射角，或在光具座上改变物距追迹凸透镜的三条特殊光线，成像规律一目了然。',
    physics: '电、力、热、光四科物理装置集中在一个实验台，切换装置就换整套参数与读数；电学一键跳转到全自由电学实验室。',
    chemistry: '氧气制取、燃烧条件、电解水、酸碱中和四个必做实验，加上一个能任选试剂混合的自由实验室；现象、颜色、方程式都实时给出。',
    biology: '显微镜调焦观察、细胞结构辨认、光合作用与酶活性探究，操作步骤与教材一致，现象用图像直接呈现。'
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
      '<span class="eyebrow">' + SL.icon('atom', '', 15) + '初中理化生 · 虚拟实验</span>' +
      '<h1>在浏览器里，<br><span class="hero-highlight">动手做实验</span></h1>' +
      '<p class="hero-sub">电学搭电路、力学拖杠杆、热学看曲线、光学追光线、化学配试剂、生物调显微镜——各科共用一套离线引擎，读数与真实实验一致。</p>' +
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
        '<li>左侧器材库按「电源 / 开关·调节 / 用电器 / 仪表」分组。把卡片<strong>拖到实验台</strong>的任意位置就能放下；单击一下则由程序自动摆放。</li>' +
        '<li>点击一个接线柱（小圆点），再点击另一个接线柱，就完成一根导线。</li>' +
        '<li>拖动元件可以挪位置：与其他元件对齐时会浮出橙色虚线，松手自动吸附对齐。方向键可微调，按住 <kbd>Shift</kbd> 更精细。</li>' +
        '<li>空白处按住拖动可以平移画布（中键或 <kbd>Alt</kbd>+拖动也行），<kbd>Ctrl</kbd>+滚轮、双指捏合缩放；右上角工具条上的「＋ / − / 适应」同样可用。</li>' +
        '<li>点击元件选中后按 <kbd>Delete</kbd> 删除、<kbd>R</kbd> 旋转 90°、<kbd>Ctrl</kbd>+<kbd>D</kbd> 复制一份。</li>' +
        '<li>点击开关可以闭合或断开；拖动滑动变阻器上方的滑片可以改变阻值。</li>' +
        '<li>双击元件可以查看和修改它的参数。</li>' +
        '<li>线路乱了就点「一键美化」：单回路会自动排成矩形、导线沿边走；其他电路按连接顺序分列排布。点错了就点「撤回」或按 <kbd>Ctrl</kbd>+<kbd>Z</kbd> 退回上一步。</li></ol></section>' +
        '<section><h3>怎样读数与记录</h3><ol class="help-list" start="9">' +
        '<li>电表接入电路后，右侧会自动出现表盘和数字读数。</li>' +
        '<li>点击量程按钮可以切换 0–0.6A / 0–3A、0–3V / 0–15V。</li>' +
        '<li>读数稳定后点击「记录当前数据」，数据会写进记录单，最新一行会闪一下。</li>' +
        '<li>记录单每行右侧的 × 可以删掉录错的那一条，其余数据不受影响。</li>' +
        '<li>记录单上方是公式栏，可以像 Excel 一样算平均值、求和、极差等；结果可导出 CSV 或打印。</li></ol></section>' +
        '</div>' +
        '<section class="help-tip"><h3>一键互换正负极（电池 / 学生电源 / 发电机 / 三种电表）</h3>' +
        '<p>点选这类元件后，画布上方的属性面板里有一个 <strong>正负极互换</strong> 按钮：接线柱位置不动，只把 <strong>+ / −</strong> 对调，红蓝标记会跟着换到另一端。</p>' +
        '<p>电池、学生电源、发电机换向后<strong>电动势反向</strong>，电路里的电流方向整个反过来，电表指针随之反偏——正好用来演示「电源反接会怎样」。电流表、电压表、灵敏电流计换向后<strong>读数符号取反</strong>，原本反偏的指针会回正。再点一次「还原」即可恢复。</p></section>' +
        '<section class="help-tip"><h3>化学实验怎么看现象（制氧 / 燃烧 / 电解 / 中和）</h3>' +
        '<p>化学板块的实验都在<strong>仿真工作区</strong>里：左栏是实验参数，中间是装置，右侧是实时读数。参数一改，画面、颜色和读数立刻重算，不需要点「运行」；带气泡或液面变化的实验要先点左栏的 <strong>播放</strong>。</p>' +
        '<p>氧气的制取要先把「反应条件」调对（高锰酸钾、氯酸钾需要加热，过氧化氢需要二氧化锰），集气瓶集满 250 mL 后才能做带火星木条或燃烧的硫的检验；电解水时电压低于 1.5 V 几乎不产气，收集到 20 mL 以上再比较两支刻度管的体积比。</p>' +
        '<p>化学自由实验室从八种试剂里任选两种混合，还能再加石蕊或酚酞，现象、颜色、化学方程式和反应类型都会实时给出，用来做对比探究最方便。</p></section>' +
        '<section class="help-tip"><h3>生物实验怎么看（显微镜 / 细胞 / 光合 / 酶）</h3>' +
        '<p>显微镜实验要按顺序来：先把光圈调大 <strong>对光</strong>，再转动<strong>粗准焦螺旋</strong>（先让镜筒下降靠近玻片，再慢慢升高）找到物像，最后用<strong>细准焦螺旋</strong>调清楚。换成 40× 高倍镜后只能用细准焦。</p>' +
        '<p>细胞结构实验可以直接用鼠标<strong>点画面里的结构</strong>（细胞壁、细胞膜、细胞核、液泡、叶绿体、线粒体），选中的结构会高亮并在下方显示功能；切换植物 / 动物细胞就能看出哪些结构是植物特有的。</p>' +
        '<p>光合作用与酶实验都是「对照组」实验：改变光照、二氧化碳或水浴温度，看碘液的颜色变化就能判断淀粉有没有生成或被分解。酶活性图会同时画出理论曲线和你记录的数据点。</p></section>' +
        '<section class="help-tip"><h3>实验台右上角的工具条</h3><p>「网格」显示或隐藏参考网格，「数值 / 标注」显示或隐藏画布上的读数与文字标注，「矢量」开关力的箭头（力学实验），「0.5× / 1× / 2×」调整自动演示速度，「全屏」把实验台放大到整个屏幕，适合投影上课。这些开关会被记住，下次打开实验仍是上次的设置。</p></section>' +
        '<section class="help-tip"><h3>记录单里的公式（像 Excel 一样）</h3>' +
        '<p>表格上方的 <strong>ƒx</strong> 公式栏支持单元格引用和常用函数。列用字母表示（A、B、C…，表头左侧的小标签就是），行号从第 1 条记录算起，所以 <code>=C1/C2</code> 指的是「C 列第 1 行 ÷ C 列第 2 行」。</p>' +
        '<p><strong>汇总行</strong>：对整个区域算一个值，例如 <code>=AVERAGE(C1:C5)</code>、<code>=SUM(D1:D5)</code>、<code>=MAX(A1:A5)-MIN(A1:A5)</code>，结果显示在所选列的下方。<strong>计算列</strong>：给每条记录各算一个值，例如 <code>=ROUND(B1/C1,1)</code>，会按行自动填充成新的一列。</p>' +
        '<p>可用函数：SUM、AVERAGE（AVG）、MAX、MIN、COUNT、COUNTA、MEDIAN、STDEV、ROUND、ROUNDUP、ROUNDDOWN、ABS、SQRT、POWER、MOD、INT、IF、IFERROR、COUNTIF、SUMIF、AND、OR、NOT、PI；支持 + − × ÷ ^ % 与 &gt; &lt; = 比较。点「平均 / 求和 / 最大 / 最小 / 极差 / 计数 / 标准差」这些按钮可以一键填好公式；点表格里的公式行可以改，× 可以删。</p></section>' +
        '<section class="help-tip"><h3>把器材拖进实验台 · 移动视野</h3>' +
        '<p>左栏器材可以直接<strong>拖</strong>到实验台，松手就落在鼠标位置；也可以单击，元件会自动出现在当前视野里最空的地方——放大或平移过画布也不用担心它跑到屏幕外。按住画布<strong>空白处拖动</strong>可以平移视野（中键、<kbd>Alt</kbd>+拖动同样可以），双指操作是缩放 + 平移。拖元件时靠近其他元件会出现橙色虚线，自动对齐。</p></section>' +
        '<section class="help-tip"><h3>安全与提示</h3><p>电学实验会检测电源短路、断路、电表反接、超量程、灯泡烧坏和滑动变阻器错误接法，并在画布下方给出提示。出现短路时请先断开开关。力学、热学、光学实验没有危险操作，可以随意改变参数。</p></section>' +
        '<section class="help-tip"><h3>力学 / 热学 / 光学怎么玩</h3><p>左栏是实验参数：拖动滑块或点按钮，画面和右侧读数会立刻重算。画面里的物体大多可以直接拖动——杠杆上的钩码、滑轮组的钩码、烧杯里的物块都能用鼠标或手指拉，松开即生效。有「播放」按钮的实验可以自动演示一段过程（如匀速提升、持续加热）。每个板块末尾还有一个<strong>自由实验室</strong>：几套装置放在一起，参数全部开放、没有步骤，适合开放探究或考前自己验证想法。</p></section>' +
        '<section class="help-tip"><h3>快捷键</h3><p><kbd>Ctrl</kbd>+<kbd>=</kbd> 放大　<kbd>Ctrl</kbd>+<kbd>-</kbd> 缩小　<kbd>Ctrl</kbd>+滚轮、双指捏合也可缩放　<kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤回　<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> 重做　<kbd>Ctrl</kbd>+<kbd>D</kbd> 复制元件　<kbd>Esc</kbd> 取消连线　<kbd>Delete</kbd> 删除选中　<kbd>R</kbd> 旋转元件　<kbd>Shift</kbd>+方向键 精细移动</p></section>' +
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
      var body = '<p class="modal-text">' + SL.BRAND + '是一个面向初中理化生教学的离线虚拟实验工具，覆盖物理电学、力学、热学、光学与化学、生物等板块，全部计算与数据存储都在你的浏览器本地完成。</p>' +
        '<section class="about-block"><h3>版本</h3><p>当前版本 <strong>v' + SL.VERSION + '</strong>（' + SL.VERSION_DATE + '）</p>' +
        '<p class="muted">v1.0.0 首个完整版 · v1.1.0 一键美化 · v1.2.0 撤回/重做 · v1.3.0 画布缩放与变阻器接线校验 · v1.4.0 全自由实验室与变阻器电阻判断修复 · v1.5.0 补齐初中电学常用元件 · v1.6.0 双套元件外观可切换 · v1.7.0 新增发电机、继电器、扬声器、灵敏电流计 · v1.8.0 在线版增加离线包下载入口 · v2.1.0 引入仿真引擎、学科墙扩展到力学/热学/光学，新增杠杆平衡、滑轮组机械效率、浮力探究三个力学实验 · v2.2.0 新增力学自由实验室：三套装置合一、参数全开 · v2.3.0 参考真实实验台重做交互：器材库分组缩略图与拖拽放置、对齐吸附辅助线、画布平移与元件复制、实验台浮动工具条（网格/标注/矢量/倍速/全屏）、记录单可删单行 · v2.4.0 记录单支持 Excel 公式（汇总行 / 计算列）、界面改为液态玻璃与工具站式排布、导线上的电流流动动画 · v2.4.1 电表/电源一键互换正负极、表针改为平滑连续转动（拖动滑片时读数跟手）、修复滑轮组「提升高度 h」滑片无效、电流流动动画恢复显示</p><p class="muted">v2.5.0 新增化学板块：氧气的实验室制取与性质、探究燃烧的条件、电解水、酸碱中和反应与指示剂，以及化学自由实验室（八种试剂任意混合，实时给出颜色/气泡/沉淀与方程式）；产品更名为「星火理化生实验室」</p><p class="muted">v2.6.0 新增生物板块：练习使用显微镜（对光/放片/调焦/换高倍镜）、观察动、植物细胞的结构（可点选结构看功能）、探究光合作用需要光和二氧化碳、探究唾液淀粉酶对淀粉的消化作用，以及生物自由实验室（六种玻片 × 三种目镜 × 三种物镜自由观察）</p>' +
        '<p class="muted">v2.7.0 新增热学板块：探究水沸腾时温度变化的特点、比较不同物质的吸热能力，以及热学自由实验室（沸腾 / 比热容 / 晶体熔化三套装置合一）</p>' +
        '<p class="muted">v2.8.0 新增光学板块：探究光的反射规律、探究凸透镜成像的规律，以及光学自由实验室；同时新增「物理 · 综合」板块的物理自由实验室（力、热、光九套装置合一，电学一键跳转全自由电学实验室）</p>' +
        '<p class="muted">v2.9.0 新增「力学 · 自由刚体沙盒」：内置 Matter.js 刚体引擎（离线内置、按固定步长求解），托盘天平、可叠放的小天平、物块、砝码、斜面与挡板都能自由摆放，真实碰撞、堆叠、铰接倾斜；天平给出一左一右的力矩读数并按两端力矩判断平衡，可以试「天平上再放一台天平」</p>' +
        '<p class="muted">v2.9.1 视觉重做：实验台上的器材按真实器材的样子重画（铸铁机座、钢横梁与刀口、分度盘与指针、铝托盘与吊线、木纹物块、黄铜砝码），图标改为一套手绘器材线稿，实验台改为暖白色台面</p></section>' +
        '<section class="about-block"><h3>图标素材</h3><p>界面与元件图标来自 <strong>Tabler Icons</strong>（MIT License），已下载并内联到本项目，运行时不访问网络。</p>' +
        '<p class="muted">https://github.com/tabler/tabler-icons</p></section>' +
        '<section class="about-block"><h3>自绘素材</h3><p>滑动变阻器、单刀开关、导线与电流动画由本项目按教材标准画法自绘；力学、化学、生物实验的舞台图形（杠杆、滑轮、烧杯、锥形瓶、刻度管、显微镜视野等）同样为自绘。</p></section>' +
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
