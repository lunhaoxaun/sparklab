/* 生物计算与数据：显微镜光学、玻片与细胞结构、光合作用、酶活性
   纯函数 + 数据表，不依赖 DOM，供 labs/lab-bio-*.js 调用 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function round(v, n) {
    var p = Math.pow(10, n == null ? 2 : n);
    return Math.round(v * p) / p;
  }

  /* ================= 一、显微镜 ================= */
  var EYEPIECE = 10;

  /* 物镜：倍数、视野直径（mm）、需要的最佳粗准焦位置、亮度系数 */
  var OBJECTIVES = {
    4: { mag: 4, field: 4.5, focus: 34, bright: 1.0, cells: 12, label: '4×' },
    10: { mag: 10, field: 1.8, focus: 56, bright: 0.72, cells: 6, label: '10×' },
    40: { mag: 40, field: 0.45, focus: 76, bright: 0.38, cells: 3, label: '40×' }
  };

  var SLIDES = {
    onion: {
      label: '洋葱鳞片叶内表皮',
      stain: '碘液',
      color: '#efe4f0',
      edge: '#c9b3cf',
      nucleus: '#8d6a9a',
      shape: 'rect',
      structures: ['细胞壁', '细胞膜', '细胞质', '细胞核', '液泡'],
      note: '细胞排列紧密、近似长方形，碘液把细胞核染成深色'
    },
    cheek: {
      label: '人的口腔上皮细胞',
      stain: '稀碘液',
      color: '#f6e7e3',
      edge: '#dcbdb4',
      nucleus: '#b0705f',
      shape: 'blob',
      structures: ['细胞膜', '细胞质', '细胞核'],
      note: '细胞扁平、边缘不规则，没有细胞壁和液泡'
    },
    leaf: {
      label: '蚕豆叶下表皮（含叶绿体）',
      stain: '不染色',
      color: '#e3f2df',
      edge: '#a9c9a0',
      nucleus: '#6f9a63',
      shape: 'rect',
      structures: ['细胞壁', '细胞质', '细胞核', '叶绿体', '气孔'],
      note: '能看到绿色的叶绿体和成对的保卫细胞围成的气孔'
    },
    blood: {
      label: '人血涂片',
      stain: '瑞氏染液',
      color: '#f3dede',
      edge: '#d8b4b4',
      nucleus: '#7d5fa8',
      shape: 'round',
      structures: ['红细胞', '白细胞', '血小板'],
      note: '红细胞数量最多、呈圆饼状且没有细胞核，白细胞较少且体积大'
    },
    root: {
      label: '洋葱根尖分生区细胞',
      stain: '醋酸洋红',
      color: '#f0e6f5',
      edge: '#ccb6d6',
      nucleus: '#8a4f9c',
      shape: 'rect',
      structures: ['细胞壁', '细胞质', '细胞核'],
      note: '细胞近似正方形、排列紧密，正在分裂的细胞能看得很清楚'
    },
    pollen: {
      label: '花粉粒',
      stain: '不染色',
      color: '#fbf0d8',
      edge: '#ddc592',
      nucleus: '#b58b3e',
      shape: 'round',
      structures: ['细胞壁', '细胞质', '细胞核'],
      note: '表面有花纹的单个细胞，常用来观察细胞壁'
    }
  };

  function microscope(values) {
    var obj = OBJECTIVES[values.objective] || OBJECTIVES[10];
    var slide = SLIDES[values.slide] || SLIDES.onion;
    var coarse = values.coarse == null ? 0 : values.coarse;
    var fine = values.fine == null ? 50 : values.fine;
    var aperture = values.aperture === 'large' ? 1 : 0;

    /* 粗准焦偏离最佳位置越多越模糊；细准焦只在接近时起作用 */
    var diff = Math.abs(coarse - obj.focus);
    var sharp = clamp(1 - diff / 26, 0, 1);
    var fineOffset = Math.abs(fine - 50);
    if (diff > 14) sharp *= clamp(1 - fineOffset / 90, 0.3, 1);
    else sharp = clamp(sharp + (1 - fineOffset / 60) * 0.25, 0, 1);

    var brightness = clamp(obj.bright * (aperture ? 1.55 : 0.85), 0.15, 2);
    var eye = values.eyepiece || EYEPIECE;
    var mag = eye * obj.mag;
    /* 视野里能看到的细胞数：倍数越高越少 */
    var cells = obj.cells;

    return {
      objective: obj,
      slide: slide,
      eyepiece: eye,
      mag: mag,
      field: obj.field,
      brightness: brightness,
      sharp: sharp,
      blur: round((1 - sharp) * 5.5, 1),
      cells: cells,
      focus: coarse,
      fine: fine,
      aperture: aperture,
      clear: sharp > 0.82
    };
  }

  /* ================= 二、细胞结构 ================= */
  var STRUCTURES = {
    wall: { name: '细胞壁', plant: true, animal: false, func: '位于细胞最外层，起支持和保护作用，使植物细胞有比较固定的形状' },
    membrane: { name: '细胞膜', plant: true, animal: true, func: '紧贴细胞壁内侧，控制物质进出细胞，同时保护细胞内部' },
    cytoplasm: { name: '细胞质', plant: true, animal: true, func: '细胞膜以内、细胞核以外的部分，是细胞进行生命活动的主要场所，能缓慢流动' },
    nucleus: { name: '细胞核', plant: true, animal: true, func: '内含遗传物质，是细胞的控制中心，控制着生物的发育和遗传' },
    vacuole: { name: '液泡', plant: true, animal: false, func: '内含细胞液，溶解着糖分、色素等物质，西瓜的甜味就来自这里' },
    chloroplast: { name: '叶绿体', plant: true, animal: false, func: '含有叶绿素，是进行光合作用的场所，把光能转变成化学能' },
    mito: { name: '线粒体', plant: true, animal: true, func: '进行呼吸作用的主要场所，把有机物中的化学能释放出来供细胞利用' }
  };

  function cellInfo(values) {
    var type = values.type === 'animal' ? 'animal' : 'plant';
    var list = Object.keys(STRUCTURES).filter(function (k) {
      return type === 'plant' ? STRUCTURES[k].plant : STRUCTURES[k].animal;
    });
    var picked = STRUCTURES[values.picked] ? values.picked : 'nucleus';
    var info = STRUCTURES[picked];
    var available = type === 'plant' ? info.plant : info.animal;
    return {
      type: type,
      typeLabel: type === 'plant' ? '植物细胞' : '动物细胞',
      list: list,
      picked: picked,
      pickedName: info.name,
      pickedFunc: info.func,
      available: available,
      note: available ? '' : info.name + '只出现在' + (info.plant ? '植物' : '动物') + '细胞中，这个细胞里没有它',
      plantOnly: list.filter(function (k) { return STRUCTURES[k].plant && !STRUCTURES[k].animal; })
    };
  }

  /* ================= 三、光合作用 ================= */
  function photosynthesis(values) {
    var light = values.light !== false;
    var co2 = values.co2 !== false;
    var hours = values.hours == null ? 4 : values.hours;
    var cover = values.cover !== false;      /* 叶片的左半部分被黑纸遮光 */

    var rate = light && co2 ? 1 : 0;
    /* 光照时间越长，积累的淀粉越多，碘液显色越深（4 小时左右达到最深） */
    var starch = rate ? clamp(hours / 4, 0, 1) : 0;
    var covered = 0;

    function iodine(s) {
      if (s <= 0.02) return { color: '#c99a5f', text: '不变蓝（棕黄色）' };
      if (s < 0.35) return { color: '#8a6f9c', text: '略显蓝紫色' };
      if (s < 0.7) return { color: '#4a3f8f', text: '变蓝' };
      return { color: '#241f5c', text: '变成深蓝色' };
    }

    var exposed = iodine(starch);
    var masked = iodine(covered);

    var reason = '';
    if (!light) reason = '没有光照，绿叶不能进行光合作用，制造不出淀粉';
    else if (!co2) reason = '二氧化碳被氢氧化钠溶液吸收，缺少原料，同样制造不出淀粉';
    else if (hours < 1) reason = '光照时间太短，积累的淀粉还很少';

    return {
      light: light,
      co2: co2,
      hours: hours,
      cover: cover,
      starch: round(starch, 2),
      rate: rate,
      exposed: exposed,
      masked: masked,
      reason: reason,
      conclusion: rate && starch > 0.5 ? '见光部分变蓝，说明光合作用制造了淀粉' : '叶片不变蓝，说明光合作用没有进行'
    };
  }

  /* ================= 四、酶活性 ================= */
  /* 唾液淀粉酶最适温度约 37 ℃，超过 60 ℃ 变性失活 */
  function enzymeActivity(temp) {
    if (temp >= 62) return 0;
    var k = (temp - 37) / 13;
    return clamp(Math.exp(-k * k), 0, 1);
  }

  var TUBES = [
    { id: 'saliva', label: '唾液 + 淀粉液', enzyme: true, denatured: false },
    { id: 'boiled', label: '煮沸后冷却的唾液 + 淀粉液', enzyme: true, denatured: true },
    { id: 'water', label: '清水 + 淀粉液', enzyme: false, denatured: false }
  ];

  function enzyme(values) {
    var temp = values.temp == null ? 37 : values.temp;
    var minutes = values.minutes == null ? 10 : values.minutes;
    var activity = enzymeActivity(temp);

    var tubes = TUBES.map(function (t) {
      /* 只有含活性酶的试管才能分解淀粉；时间越长分解越彻底 */
      var act = t.denatured ? 0 : (t.enzyme ? activity : 0);
      var digested = clamp(act * minutes / 10, 0, 1);
      var starch = 1 - digested;
      var iodine;
      if (starch > 0.55) iodine = { color: '#241f5c', text: '深蓝色（淀粉还在）' };
      else if (starch > 0.2) iodine = { color: '#5b4a94', text: '浅蓝色' };
      else if (starch > 0.05) iodine = { color: '#9b7aa8', text: '很浅的紫色' };
      else iodine = { color: '#c99a5f', text: '不变蓝（淀粉已分解）' };
      return {
        id: t.id,
        label: t.label,
        activity: act,
        digested: round(digested, 2),
        starch: round(starch, 2),
        iodine: iodine,
        cleared: starch <= 0.05
      };
    });

    return {
      temp: temp,
      minutes: minutes,
      activity: round(activity, 2),
      tubes: tubes,
      digestedCount: tubes.filter(function (t) { return t.cleared; }).length,
      denatured: temp >= 62,
      optimal: Math.abs(temp - 37) <= 3
    };
  }

  SL.bio = {
    clamp: clamp,
    round: round,
    EYEPIECE: EYEPIECE,
    OBJECTIVES: OBJECTIVES,
    SLIDES: SLIDES,
    STRUCTURES: STRUCTURES,
    TUBES: TUBES,
    microscope: microscope,
    cellInfo: cellInfo,
    photosynthesis: photosynthesis,
    enzymeActivity: enzymeActivity,
    enzyme: enzyme
  };
})();
