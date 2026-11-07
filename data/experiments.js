/* 实验元数据：科目、实验卡片、引导步骤文案、记录表头、结论题 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  SL.data = {
    subjects: [
      {
        id: 'electricity',
        name: '物理 · 电学',
        icon: 'circuit-battery',
        available: true,
        desc: '电路、电流、电压、电阻'
      },
      {
        id: 'mechanics',
        name: '物理 · 力学',
        icon: 'weight',
        available: true,
        desc: '杠杆、滑轮、浮力、压强'
      },
      {
        id: 'thermal',
        name: '物理 · 热学',
        icon: 'thermometer',
        available: true,
        desc: '物态变化、比热容'
      },
      {
        id: 'optics',
        name: '物理 · 光学',
        icon: 'lens',
        available: true,
        desc: '反射、凸透镜成像'
      },
      {
        id: 'physics',
        name: '物理 · 综合',
        icon: 'atom',
        available: true,
        desc: '电、力、热、光自由切换'
      },
      {
        id: 'chemistry',
        name: '化学',
        icon: 'flask',
        available: true,
        desc: '气体制取、燃烧、电解、中和'
      },
      {
        id: 'biology',
        name: '生物',
        icon: 'dna',
        available: true,
        desc: '显微镜、细胞、光合、酶'
      },
      {
        id: 'math',
        name: '数学',
        icon: 'chart-line',
        available: true,
        desc: '函数图像、几何构造与判断脚本'
      }
    ],

    labs: [
      {
        id: 'series',
        subject: 'electricity',
        name: '串并联电路中电流、电压的规律',
        short: '用两只小灯泡分别搭建串联与并联电路，测量不同位置的电流和各部分电压，自己归纳规律。',
        tag: '九年级 · 电学',
        time: '约 20 分钟',
        accent: '#1f6fb2',
        equipment: [
          { icon: 'circuit-battery', label: '电池组' },
          { icon: 'circuit-bulb', label: '小灯泡 ×2' },
          { icon: 'circuit-ammeter', label: '电流表' },
          { icon: 'circuit-voltmeter', label: '电压表' }
        ],
        palette: ['battery', 'switch', 'bulb', 'ammeter', 'voltmeter'],
        columns: [
          { key: 'scene', label: '电路' },
          { key: 'point', label: '测量位置' },
          { key: 'current', label: '电流 I/A', digits: 2 },
          { key: 'voltage', label: '电压 U/V', digits: 2 }
        ],
        pointOptions: [
          { value: 'A', label: 'A 点（电源正极附近）' },
          { value: 'B', label: 'B 点（两灯之间）' },
          { value: 'C', label: 'C 点（电源负极附近）' },
          { value: 'L1', label: 'L1 两端' },
          { value: 'L2', label: 'L2 两端' },
          { value: 'SRC', label: '电源两端' }
        ],
        steps: [
          {
            title: '连接串联电路',
            instruction: '从左侧元件库拖入电池组、开关和两只小灯泡，用导线把它们连成一个串联回路。',
            hint: '串联就是所有元件首尾依次相连，只有一条电流路径。'
          },
          {
            title: '闭合开关，观察亮度',
            instruction: '点击开关使其闭合，观察两只小灯泡的亮度是否相同。',
            hint: '串联电路中电流处处相等，两只相同灯泡的亮度应该一样。'
          },
          {
            title: '测量串联电路的电流',
            instruction: '把电流表串联接入电路，分别在 A、B、C 三个位置测量电流，点击「记录当前数据」至少记录两组。',
            hint: '电流表要串联在电路中，电流从「+」接线柱流入、「−」接线柱流出。'
          },
          {
            title: '测量串联电路的电压',
            instruction: '用电压表分别测量 L1 两端、L2 两端和电源两端的电压，在右侧「测量位置」中选择对应位置并记录。',
            hint: '电压表要并联在被测元件两端。'
          },
          {
            title: '改接成并联电路',
            instruction: '把两只小灯泡改接成并联：两灯各自组成一条支路，然后并列接到电源两端。',
            hint: '并联电路中，两只灯泡的两端分别连在一起。'
          },
          {
            title: '测量并联电路的电流',
            instruction: '分别测量干路电流和两条支路电流，记录至少三组数据。',
            hint: '干路电流等于各支路电流之和。'
          },
          {
            title: '测量并联电路的电压',
            instruction: '用电压表测量并联时 L1、L2 两端的电压，记录两组数据。',
            hint: '并联电路各支路两端电压相等，且等于电源电压。'
          },
          {
            title: '填写实验结论',
            instruction: '根据记录的数据，在下方填写结论，归纳串、并联电路中电流和电压的规律。',
            hint: '对照记录单中的数值关系再作答。'
          }
        ],
        conclusions: [
          {
            id: 's1',
            label: '串联电路中各处的电流大小',
            suffix: '（填“相等”或“不相等”）。',
            type: 'keyword',
            keywords: ['相等'],
            reference: '相等。串联电路只有一条电流路径，电流处处相等。'
          },
          {
            id: 's2',
            label: '串联电路两端的总电压等于各部分电压之',
            suffix: '。',
            type: 'keyword',
            keywords: ['和'],
            reference: '和。即 U = U1 + U2。'
          },
          {
            id: 's3',
            label: '并联电路中干路电流等于各支路电流之',
            suffix: '。',
            type: 'keyword',
            keywords: ['和'],
            reference: '和。即 I = I1 + I2。'
          },
          {
            id: 's4',
            label: '并联电路各支路两端的电压',
            suffix: '（填“相等”或“不相等”）。',
            type: 'keyword',
            keywords: ['相等'],
            reference: '相等，且都等于电源电压。'
          }
        ]
      },

      {
        id: 'ohm-r',
        subject: 'electricity',
        name: '伏安法测电阻',
        short: '用电压表和电流表测量未知电阻 Rx：连接电路、移动滑片、记录三组数据，求平均值。',
        tag: '九年级 · 电学',
        time: '约 18 分钟',
        accent: '#16a3a3',
        equipment: [
          { icon: 'circuit-battery', label: '电池组 4.5V' },
          { icon: 'circuit-resistor', label: '未知电阻 Rx' },
          { icon: 'circuit-ammeter', label: '电流表' },
          { icon: 'circuit-voltmeter', label: '电压表' }
        ],
        palette: ['battery', 'switch', 'resistor', 'rheostat', 'ammeter', 'voltmeter'],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'voltage', label: '电压 U/V', digits: 2 },
          { key: 'current', label: '电流 I/A', digits: 3 },
          { key: 'resistance', label: '电阻 R/Ω', digits: 1 }
        ],
        averageField: 'resistance',
        fixedResistance: 10,
        steps: [
          {
            title: '连接实验电路',
            instruction: '把未知电阻 Rx 与滑动变阻器串联，电流表串联在干路中，电压表并联在 Rx 两端，开关控制整个电路。',
            hint: '电流表串联、电压表并联；滑动变阻器要“一上一下”接线。'
          },
          {
            title: '滑片移到阻值最大端',
            instruction: '闭合开关之前，先把滑动变阻器的滑片移到接入阻值最大的一端，以保护电路。',
            hint: '接 A 柱时把滑片移到最右端，接 B 柱时移到最左端，此时接入电阻最大。'
          },
          {
            title: '测量三组数据',
            instruction: '闭合开关，缓慢移动滑片，改变 Rx 两端的电压，记录三组不同的 U、I 数据。',
            hint: '每组数据都要等示数稳定后再点击「记录当前数据」。'
          },
          {
            title: '计算电阻并填写结论',
            instruction: '根据三组数据计算每次的 R，求出平均值，并回答下方问题。',
            hint: 'R = U / I，多次测量取平均值可以减小误差。'
          }
        ],
        conclusions: [
          {
            id: 'r1',
            label: '测得 Rx 的平均阻值为',
            suffix: 'Ω（保留一位小数）。',
            type: 'number',
            answer: 10,
            tolerance: 0.8,
            reference: '10.0 Ω（多次测量取平均值可减小误差）。'
          },
          {
            id: 'r2',
            label: '滑动变阻器在本实验中的作用是',
            suffix: '（写出一点即可）。',
            type: 'keyword',
            keywords: ['保护', '改变', '调节', '分压'],
            reference: '① 保护电路；② 改变 Rx 两端的电压，便于多次测量。'
          },
          {
            id: 'r3',
            label: '如果误把电流表并联在 Rx 两端，可能出现的现象是',
            suffix: '。',
            type: 'keyword',
            keywords: ['短路', '烧坏', '无示数', '几乎为零', '电流过大'],
            reference: '电流表内阻很小，会把 Rx 短路，电路中电流过大，可能烧坏电流表。'
          }
        ]
      },

      {
        id: 'ohm-law',
        subject: 'electricity',
        name: '探究电流与电压、电阻的关系',
        short: '控制变量法：保持电阻不变改变电压，再保持电压不变更换电阻，用图像归纳欧姆定律。',
        tag: '九年级 · 电学',
        time: '约 22 分钟',
        accent: '#f2994a',
        equipment: [
          { icon: 'circuit-battery', label: '电池组 3V' },
          { icon: 'circuit-resistor', label: '定值电阻 5–20Ω' },
          { icon: 'circuit-ammeter', label: '电流表' },
          { icon: 'circuit-voltmeter', label: '电压表' }
        ],
        palette: ['battery', 'switch', 'resistor', 'rheostat', 'ammeter', 'voltmeter'],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'resistance', label: '电阻 R/Ω', digits: 0 },
          { key: 'voltage', label: '电压 U/V', digits: 2 },
          { key: 'current', label: '电流 I/A', digits: 3 },
          { key: 'ratio', label: 'U/I (Ω)', digits: 1 }
        ],
        chart: true,
        fixedResistanceOptions: [5, 10, 15, 20],
        steps: [
          {
            title: '连接实验电路',
            instruction: '将定值电阻（先选 10Ω）与滑动变阻器串联，电流表串联，电压表并联在定值电阻两端。',
            hint: '滑动变阻器“一上一下”接线，电压表并联在定值电阻两端。'
          },
          {
            title: '保持电阻不变，改变电压',
            instruction: '保持 R=10Ω 不变，移动滑片改变定值电阻两端的电压，记录四组不同的 U、I 数据。',
            hint: '每次改变滑片位置后稍等，待示数稳定再记录。'
          },
          {
            title: '观察 I–U 图像',
            instruction: '查看下方 I–U 图像：这些点是否大致在同一条过原点的直线上？',
            hint: '图像是过原点的直线，说明电流与电压成正比。'
          },
          {
            title: '保持电压不变，更换电阻',
            instruction: '在元件属性中依次把定值电阻换成 5Ω、10Ω、15Ω、20Ω，每次调节滑片使电阻两端电压保持 2.0V，各记录一组数据。',
            hint: '换电阻后要重新调节滑片，让电压表的示数回到 2.0V 再记录。'
          },
          {
            title: '归纳欧姆定律',
            instruction: '结合 I–U 图像和 I–R 数据，填写下方结论，写出欧姆定律的表达式。',
            hint: 'I 与 U 成正比、与 R 成反比，合起来就是 I = U/R。'
          }
        ],
        conclusions: [
          {
            id: 'o1',
            label: '电阻一定时，通过导体的电流与导体两端的电压成',
            suffix: '（填“正比”或“反比”）。',
            type: 'keyword',
            keywords: ['正比'],
            reference: '正比。'
          },
          {
            id: 'o2',
            label: '电压一定时，通过导体的电流与导体的电阻成',
            suffix: '（填“正比”或“反比”）。',
            type: 'keyword',
            keywords: ['反比'],
            reference: '反比。'
          },
          {
            id: 'o3',
            label: '欧姆定律的表达式是 I =',
            suffix: '。',
            type: 'keyword',
            keywords: ['U/R', 'U÷R'],
            normalize: true,
            reference: 'I = U/R。'
          },
          {
            id: 'o4',
            label: '本实验中滑动变阻器的作用是',
            suffix: '（写出一点即可）。',
            type: 'keyword',
            keywords: ['控制', '保持', '改变', '调节', '保护'],
            reference: '① 保护电路；② 改变定值电阻两端电压（或保持电压不变）。'
          }
        ]
      },

      {
        id: 'sandbox',
        subject: 'electricity',
        name: '全自由电学实验室',
        short: '空白实验台：元件数量不限、参数可自由设定、任意接线，实时读数与真实计算。',
        tag: '自由实验 · 不限步骤',
        time: '不限时',
        accent: '#7c5cff',
        free: true,
        freeNote: '自由搭建 · 元件数量不限',
        equipment: [
          { icon: 'circuit-battery', label: '电池组 / 学生电源' },
          { icon: 'circuit-bulb', label: '小灯泡 / 发光二极管' },
          { icon: 'circuit-resistor', label: '定值电阻 / 电阻箱' },
          { icon: 'settings', label: '滑动变阻器 / 单刀双掷开关' },
          { icon: 'player-play', label: '电动机' },
          { icon: 'atom', label: '电磁铁 / 电铃 / 保险丝' }
        ],
        palette: ['battery', 'dcsupply', 'switch', 'switch-spdt', 'bulb', 'led', 'resistor', 'resistance-box', 'rheostat', 'ammeter', 'voltmeter', 'motor', 'generator', 'relay', 'speaker', 'galvanometer', 'bell', 'fuse', 'electromagnet'],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'voltage', label: '电压 U/V', digits: 2 },
          { key: 'current', label: '电流 I/A', digits: 3 },
          { key: 'resistance', label: '电阻 R/Ω', digits: 1 }
        ],
        steps: [],
        conclusions: []
      },

      /* ================= 物理 · 力学 ================= */
      {
        id: 'lever',
        subject: 'mechanics',
        kind: 'sim',
        name: '探究杠杆的平衡条件',
        short: '在杠杆两侧挂不同数量的钩码，移动悬挂位置，找出使杠杆水平平衡的条件，归纳出力矩关系。',
        tag: '八年级 · 力学',
        time: '约 15 分钟',
        accent: '#c2731a',
        equipment: [
          { icon: 'seesaw', label: '杠杆与支架' },
          { icon: 'weight', label: '钩码 ×4' },
          { icon: 'ruler', label: '刻度尺' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'leftCount', label: '左侧钩码/个' },
          { key: 'leftArm', label: '左力臂/cm' },
          { key: 'leftTorque', label: 'F₁L₁ /N·cm', digits: 1 },
          { key: 'rightCount', label: '右侧钩码/个' },
          { key: 'rightArm', label: '右力臂/cm' },
          { key: 'rightTorque', label: 'F₂L₂ /N·cm', digits: 1 },
          { key: 'state', label: '状态' }
        ],
        steps: [
          {
            title: '让杠杆水平平衡',
            instruction: '先用左侧 2 个钩码、右侧 2 个钩码，拖动钩码改变悬挂位置，使杠杆回到水平位置。',
            hint: '每个钩码重 0.5 N，每格 5 cm。让左右两侧「钩码个数 × 格数」相等即可。'
          },
          {
            title: '换一组数据再做一次',
            instruction: '改变左右钩码的个数与位置，重新调平，并在右侧读数面板核对 F₁L₁ 与 F₂L₂ 是否相等。',
            hint: '只要满足「左边个数 × 左边格数 = 右边个数 × 右边格数」，杠杆就会平衡。'
          },
          {
            title: '记录三组平衡数据',
            instruction: '把杠杆调平后点击「记录当前数据」，至少记录 3 组不同的平衡组合。',
            hint: '每组数据都要先让杠杆稳定在水平位置再记录。'
          },
          {
            title: '填写实验结论',
            instruction: '根据记录的数据，回答下方问题，归纳杠杆的平衡条件。',
            hint: '比较每组数据中 F₁L₁ 与 F₂L₂ 的数值。'
          }
        ],
        conclusions: [
          {
            id: 'lv1',
            label: '杠杆平衡时，动力 × 动力臂与阻力 × 阻力臂的大小',
            suffix: '（填“相等”或“不相等”）。',
            type: 'keyword',
            keywords: ['相等'],
            reference: '相等，即 F₁L₁ = F₂L₂，这就是杠杆的平衡条件。'
          },
          {
            id: 'lv2',
            label: '保持左侧钩码个数和位置不变，把右侧钩码向远离支点方向移动，右侧力矩会',
            suffix: '（填“变大”“变小”或“不变”）。',
            type: 'keyword',
            keywords: ['变大'],
            reference: '变大。力臂变长，力矩 F₂L₂ 增大。'
          },
          {
            id: 'lv3',
            label: '若 F₁ = 1.0 N、L₁ = 15 cm，要使杠杆平衡，当 L₂ = 10 cm 时 F₂ =',
            suffix: 'N。',
            type: 'number',
            answer: 1.5,
            tolerance: 0.05,
            reference: 'F₂ = F₁L₁ / L₂ = 1.0 × 15 / 10 = 1.5 N。'
          }
        ]
      },

      {
        id: 'pulley',
        subject: 'mechanics',
        kind: 'sim',
        name: '测量滑轮组的机械效率',
        short: '改变绕法、物重和提升高度，测出绳端拉力与移动距离，计算有用功、总功和机械效率。',
        tag: '八年级 · 力学',
        time: '约 18 分钟',
        accent: '#0e7490',
        equipment: [
          { icon: 'pulley', label: '滑轮组' },
          { icon: 'weight', label: '钩码若干' },
          { icon: 'ruler', label: '刻度尺' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'segments', label: '绳段数 n' },
          { key: 'load', label: '物重 G/N', digits: 1 },
          { key: 'h', label: '高度 h/m', digits: 2 },
          { key: 'force', label: '拉力 F/N', digits: 2 },
          { key: 's', label: '绳移动 s/m', digits: 2 },
          { key: 'wUse', label: 'W有 /J', digits: 2 },
          { key: 'wTotal', label: 'W总 /J', digits: 2 },
          { key: 'eta', label: 'η/%', digits: 1 }
        ],
        steps: [
          {
            title: '认识滑轮组：n 段绳承担物重',
            instruction: '先选择 n = 2 的绕法，观察有几段绳子吊着动滑轮，读出绳端拉力 F 与物重 G 的关系。',
            hint: '动滑轮和重物由 n 段绳子共同承担，理想情况下 F = (G + G动) / n。'
          },
          {
            title: '提升钩码并记录',
            instruction: '拖动左栏「提升高度 h」滑片（也可以直接拖动画布里的钩码），把钩码提到设定高度，然后记录一组数据。',
            hint: 'h 变了，绳端移动距离 s = n·h、有用功和总功都要按新的 h 重算；想一想机械效率会不会跟着变。'
          },
          {
            title: '改变物重再测一次',
            instruction: '把钩码总重加大到 4 N 以上，重新提升并记录，比较两次的机械效率。',
            hint: '物重越大，有用功占总功的比例越高，机械效率越大。'
          },
          {
            title: '改变绕法再测一次',
            instruction: '切换到 n = 3 的绕法，提升同一重物并记录，比较不同绕法的机械效率。',
            hint: '同一重物时，绕法不同拉力不同，但机械效率主要由物重和动滑轮重决定。'
          },
          {
            title: '填写实验结论',
            instruction: '根据记录单中的数据，回答下方问题，归纳影响机械效率的因素。',
            hint: '看看 η 与物重 G、动滑轮重 G动 的关系。'
          }
        ],
        conclusions: [
          {
            id: 'pl1',
            label: '同一滑轮组，提升的物重越大，机械效率',
            suffix: '（填“越高”“越低”或“不变”）。',
            type: 'keyword',
            keywords: ['越高', '变大', '增大', '提高'],
            reference: '越高。因为额外功（克服动滑轮重和摩擦）基本不变，有用功增大，η = W有/W总 增大。'
          },
          {
            id: 'pl2',
            label: '使用同一滑轮组提升同一重物，动滑轮越重，机械效率',
            suffix: '（填“越高”“越低”或“不变”）。',
            type: 'keyword',
            keywords: ['越低', '变小', '减小', '降低'],
            reference: '越低。动滑轮越重，额外功越多，机械效率越低。'
          },
          {
            id: 'pl3',
            label: '物重 4 N、动滑轮重 1 N、n = 2，忽略摩擦时机械效率 η =',
            suffix: '%。',
            type: 'number',
            answer: 80,
            tolerance: 2,
            reference: 'F = (4 + 1)/2 = 2.5 N，η = Gh/(Fs) = 4/(2.5×2) = 80%。'
          }
        ]
      },

      {
        id: 'buoyancy',
        subject: 'mechanics',
        kind: 'sim',
        name: '探究浮力的大小（阿基米德原理）',
        short: '把物体逐渐浸入液体，读出测力计示数变化，比较浮力与排开液体所受的重力。',
        tag: '八年级 · 力学',
        time: '约 16 分钟',
        accent: '#0d7a68',
        equipment: [
          { icon: 'beaker', label: '烧杯与液体' },
          { icon: 'gauge', label: '弹簧测力计' },
          { icon: 'waves', label: '水 / 盐水 / 酒精' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'liquid', label: '液体' },
          { key: 'solid', label: '物体' },
          { key: 'vDisplaced', label: 'V排/cm³', digits: 0 },
          { key: 'fBuoy', label: 'F浮/N', digits: 2 },
          { key: 'gDisplaced', label: 'G排/N', digits: 2 },
          { key: 'reading', label: '示数/N', digits: 2 }
        ],
        steps: [
          {
            title: '让物体部分浸入液体',
            instruction: '把物体缓缓浸入水中，观察弹簧测力计的示数变化，并注意物体受到的浮力大小。',
            hint: '示数变小说明液体给物体一个向上的托力，这就是浮力，F浮 = G − F示。'
          },
          {
            title: '把物体完全浸没',
            instruction: '继续下移，使物体完全浸没在水中，记录此时的数据。',
            hint: '完全浸没后再下沉，排开液体的体积不再变化，浮力也不再变化。'
          },
          {
            title: '换用盐水再测一次',
            instruction: '保持物体完全浸没，把液体换成盐水，比较浮力是否变化。',
            hint: '盐水密度比水大，同一物体浸没时排开液体体积相同，浮力更大。'
          },
          {
            title: '填写实验结论',
            instruction: '根据记录的数据，比较 F浮 与 G排，回答下方问题。',
            hint: '每组数据里 F浮 与 G排 的数值应该几乎相同。'
          }
        ],
        conclusions: [
          {
            id: 'by1',
            label: '浸在液体中的物体受到的浮力，等于它排开的液体所受的',
            suffix: '（这一规律叫阿基米德原理）。',
            type: 'keyword',
            keywords: ['重力'],
            reference: '重力，即 F浮 = G排 = ρ液 g V排。'
          },
          {
            id: 'by2',
            label: '同种液体中，物体排开液体的体积越大，受到的浮力',
            suffix: '（填“越大”或“越小”）。',
            type: 'keyword',
            keywords: ['越大'],
            reference: '越大。F浮 = ρ液 g V排，与排开液体的体积成正比。'
          },
          {
            id: 'by3',
            label: '体积 100 cm³ 的物体完全浸没在水中，受到的浮力 F浮 =',
            suffix: 'N。',
            type: 'number',
            answer: 1,
            tolerance: 0.1,
            reference: 'V排 = 100 cm³ = 1×10⁻⁴ m³，F浮 = ρ水 g V排 = 1.0×10³ × 10 × 1×10⁻⁴ = 1 N。'
          }
        ]
      },

      {
        id: 'mech-free',
        subject: 'mechanics',
        kind: 'sim',
        name: '力学自由实验室',
        short: '杠杆、滑轮组、浮力三套装置随时切换，钩码质量、绕法、摩擦、液体、材料全部开放，无步骤、不限组数。',
        tag: '自由实验 · 不限步骤',
        time: '不限时',
        accent: '#7c5cff',
        free: true,
        freeNote: '三套装置随意切换 · 参数不限',
        equipment: [
          { icon: 'seesaw', label: '杠杆与支架' },
          { icon: 'pulley', label: '滑轮组' },
          { icon: 'beaker', label: '烧杯与液体' },
          { icon: 'gauge', label: '弹簧测力计' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'device', label: '装置' },
          { key: 'summary', label: '实验条件' },
          { key: 'result', label: '主要读数' }
        ],
        steps: [],
        conclusions: []
      },

      {
        id: 'mech-sandbox',
        subject: 'mechanics',
        kind: 'rigid',
        name: '自由刚体沙盒',
        short: '把天平、物块、斜面自由摆成装置，物体会真实地碰撞、堆叠、倾斜；天平上还能再放一台天平。',
        tag: '自由实验 · 刚体沙盒',
        time: '不限时',
        accent: '#2f6b78',
        free: true,
        freeNote: '自由组装装置 · 真实碰撞与堆叠',
        equipment: [
          { icon: 'dep-balance', label: '托盘天平 ×2' },
          { icon: 'dep-block', label: '物块若干' },
          { icon: 'dep-ramp', label: '斜面与挡板' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'device', label: '装置' },
          { key: 'summary', label: '运动状态' },
          { key: 'result', label: '主要读数' }
        ],
        steps: [],
        conclusions: []
      },

      /* ==================== 热学 ==================== */
      {
        id: 'thermo-boiling',
        subject: 'thermal',
        kind: 'sim',
        name: '探究水沸腾时温度变化的特点',
        short: '用相同的热源给水加热，观察沸腾前后温度的变化，找出水的沸点与沸腾的条件。',
        tag: '八年级 · 热学',
        time: '约 16 分钟',
        accent: '#c2410c',
        equipment: [
          { icon: 'thermometer', label: '温度计' },
          { icon: 'flame', label: '电热器' },
          { icon: 'beaker', label: '烧杯与水' },
          { icon: 'ruler', label: '计时器' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'power', label: '功率 P/W' },
          { key: 'mass', label: '水的质量/g' },
          { key: 'time', label: '加热时间/s' },
          { key: 'temp', label: '温度/℃', digits: 1 },
          { key: 'state', label: '状态' }
        ],
        steps: [
          {
            title: '开始加热，观察升温',
            instruction: '把加热功率调到 500 W 左右，点击左栏「播放」，观察水的温度怎样随时间升高。',
            hint: '水在沸腾前，温度会一直升高。'
          },
          {
            title: '加热到 100 ℃',
            instruction: '继续加热，直到温度计的示数接近 100 ℃，观察水中开始出现大量气泡。',
            hint: '标准气压下水的沸点是 100 ℃。'
          },
          {
            title: '沸腾时继续加热',
            instruction: '水沸腾后不要停止加热，观察温度计的示数是否继续升高。',
            hint: '沸腾时继续吸热，但温度保持不变。'
          },
          {
            title: '记录数据并归纳',
            instruction: '至少记录两组不同时刻的数据，然后回答下方问题，归纳沸腾的特点与条件。',
            hint: '比较沸腾前后温度的变化，再看温度—时间图像上的平台。'
          }
        ],
        conclusions: [
          {
            id: 'tb1',
            label: '水沸腾时继续吸热，温度',
            suffix: '（填“升高”“降低”或“不变”）。',
            type: 'keyword',
            keywords: ['不变'],
            reference: '不变。沸腾是剧烈的汽化现象，继续吸热但温度保持在沸点。'
          },
          {
            id: 'tb2',
            label: '标准气压下，水的沸点是',
            suffix: '℃。',
            type: 'number',
            answer: 100,
            tolerance: 2,
            reference: '100 ℃。液体的沸点与气压有关，气压越低沸点越低。'
          },
          {
            id: 'tb3',
            label: '液体沸腾的条件是：温度达到沸点，并且继续',
            suffix: '（填“吸热”或“放热”）。',
            type: 'keyword',
            keywords: ['吸热'],
            reference: '吸热。达到沸点后若停止吸热，沸腾就会停止。'
          }
        ]
      },

      {
        id: 'thermo-heatcap',
        subject: 'thermal',
        kind: 'sim',
        name: '比较不同物质的吸热能力',
        short: '用相同的热源给相同质量的水和食用油加热，比较它们升高的温度，认识比热容。',
        tag: '八年级 · 热学',
        time: '约 15 分钟',
        accent: '#b45309',
        equipment: [
          { icon: 'beaker', label: '相同烧杯 ×2' },
          { icon: 'flame', label: '相同热源' },
          { icon: 'thermometer', label: '温度计 ×2' },
          { icon: 'ruler', label: '天平' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'materialA', label: '物质 A' },
          { key: 'materialB', label: '物质 B' },
          { key: 'mass', label: '质量/g' },
          { key: 'power', label: '功率/W' },
          { key: 'time', label: '加热时间/s' },
          { key: 'dTA', label: 'ΔtA /℃', digits: 1 },
          { key: 'dTB', label: 'ΔtB /℃', digits: 1 },
          { key: 'ratio', label: 'ΔtB/ΔtA', digits: 2 }
        ],
        steps: [
          {
            title: '设置相同的实验条件',
            instruction: '两只烧杯装相同质量的水和食用油（默认 100 g），用相同的热源加热。',
            hint: '只有质量与热源相同，升高的温度才能直接比较。'
          },
          {
            title: '开始加热，比较升温快慢',
            instruction: '点击「播放」，观察两支温度计的示数，哪一支升得更快？',
            hint: '食用油的温度升得比水快。'
          },
          {
            title: '记录相同时刻的温度',
            instruction: '至少记录两组数据，比较相同加热时间内水和食用油升高的温度。',
            hint: '相同时间内，食用油升高的温度约为水的 2 倍。'
          },
          {
            title: '计算并归纳比热容',
            instruction: '根据记录的数据回答下方问题，理解比热容的物理意义。',
            hint: 'Q = cmΔt，水的比热容是 4.2×10³ J/(kg·℃)。'
          }
        ],
        conclusions: [
          {
            id: 'hc1',
            label: '相同质量的水和食用油升高相同的温度，水吸收的热量比食用油',
            suffix: '（填“多”或“少”）。',
            type: 'keyword',
            keywords: ['多'],
            reference: '多。水的比热容比食用油大，升高相同温度需要吸收更多热量。'
          },
          {
            id: 'hc2',
            label: '水的比热容约为 c水 =',
            suffix: '×10³ J/(kg·℃)。',
            type: 'number',
            answer: 4.2,
            tolerance: 0.1,
            reference: '4.2×10³ J/(kg·℃)，表示 1 kg 水温度升高 1 ℃ 吸收 4.2×10³ J 的热量。'
          },
          {
            id: 'hc3',
            label: '比热容是物质的一种',
            suffix: '（填“特性”或“状态”）。',
            type: 'keyword',
            keywords: ['特性', '属性'],
            reference: '特性。不同物质的比热容一般不同，它反映物质吸热或放热的本领。'
          }
        ]
      },

      {
        id: 'thermo-free',
        subject: 'thermal',
        kind: 'sim',
        name: '热学自由实验室',
        short: '水沸腾、比热容、晶体熔化三套装置随时切换，功率、质量、材料全部开放，无步骤、不限组数。',
        tag: '自由实验 · 不限步骤',
        time: '不限时',
        accent: '#7c5cff',
        free: true,
        freeNote: '沸腾 / 比热容 / 熔化 随意切换 · 参数不限',
        equipment: [
          { icon: 'thermometer', label: '温度计' },
          { icon: 'flame', label: '热源' },
          { icon: 'beaker', label: '烧杯与试管' },
          { icon: 'ruler', label: '计时器' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'device', label: '装置' },
          { key: 'summary', label: '实验条件' },
          { key: 'result', label: '主要读数' }
        ],
        steps: [],
        conclusions: []
      },

      /* ==================== 光学 ==================== */
      {
        id: 'optics-reflection',
        subject: 'optics',
        kind: 'sim',
        name: '探究光的反射规律',
        short: '转动光屏改变入射角，测量入射角与反射角，再翻折光屏验证三线共面与光路可逆。',
        tag: '八年级 · 光学',
        time: '约 14 分钟',
        accent: '#2563eb',
        equipment: [
          { icon: 'lens', label: '平面镜' },
          { icon: 'ruler', label: '量角器与光屏' },
          { icon: 'atom', label: '激光笔' },
          { icon: 'settings', label: '可翻折光屏' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'incidence', label: '入射角 i/°' },
          { key: 'reflection', label: '反射角 r/°' },
          { key: 'deviation', label: 'i 与 r 夹角/°' },
          { key: 'relation', label: '关系' }
        ],
        steps: [
          {
            title: '改变入射角',
            instruction: '拖动「入射角」滑块，让激光从不同角度射到平面镜上的 O 点，观察反射光线的方向。',
            hint: '入射角是入射光线与法线的夹角，不是与镜面的夹角。'
          },
          {
            title: '读出入射角与反射角',
            instruction: '读出每次的入射角 i 与反射角 r，点击「记录当前数据」，至少记录 3 组。',
            hint: '量角器的零刻度线要对准法线。'
          },
          {
            title: '翻折光屏验证三线共面',
            instruction: '把光屏右半面向后翻折，观察反射光线是否还能出现在光屏上。',
            hint: '翻折后看不到反射光线，说明三线在同一平面内。'
          },
          {
            title: '归纳反射规律',
            instruction: '根据记录的数据回答下方问题，归纳光的反射定律。',
            hint: '比较每一组 i 与 r 的大小。'
          }
        ],
        conclusions: [
          {
            id: 'or1',
            label: '光反射时，反射角',
            suffix: '（填“等于”“大于”或“小于”）入射角。',
            type: 'keyword',
            keywords: ['等于', '相等'],
            reference: '等于。反射角等于入射角，即 r = i。'
          },
          {
            id: 'or2',
            label: '入射光线、反射光线和法线',
            suffix: '（填“在”或“不在”）同一平面内。',
            type: 'keyword',
            keywords: ['在', '同一平面', '共面'],
            reference: '在。翻折光屏后反射光线消失，证明三线共面。'
          },
          {
            id: 'or3',
            label: '让光线沿原反射光线方向射向镜面，反射光线会沿原入射光线方向射出，这说明光路是',
            suffix: '（填“可逆”或“不可逆”）的。',
            type: 'keyword',
            keywords: ['可逆'],
            reference: '可逆。反射时光路是可逆的。'
          }
        ]
      },

      {
        id: 'optics-lens',
        subject: 'optics',
        kind: 'sim',
        name: '探究凸透镜成像的规律',
        short: '在光具座上改变物距，观察凸透镜成实像、虚像的条件，归纳 u 与 f 的关系。',
        tag: '八年级 · 光学',
        time: '约 18 分钟',
        accent: '#0f766e',
        equipment: [
          { icon: 'lens', label: '凸透镜' },
          { icon: 'ruler', label: '光具座' },
          { icon: 'atom', label: '蜡烛 / LED 光源' },
          { icon: 'settings', label: '光屏' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'focal', label: '焦距 f/cm' },
          { key: 'u', label: '物距 u/cm' },
          { key: 'v', label: '像距 v/cm', digits: 1 },
          { key: 'magnification', label: '放大率', digits: 2 },
          { key: 'imageNature', label: '像的性质' }
        ],
        steps: [
          {
            title: 'u > 2f：观察缩小的实像',
            instruction: '保持焦距 f = 10 cm，把物距调到 30 cm（u > 2f），观察像的位置、大小和正倒。',
            hint: 'u > 2f 时，像在 f 与 2f 之间，是倒立、缩小的实像。'
          },
          {
            title: 'f < u < 2f：观察放大的实像',
            instruction: '把物距调到 15 cm（f < u < 2f），观察像的位置、大小和正倒。',
            hint: 'f < u < 2f 时，像在 2f 以外，是倒立、放大的实像。'
          },
          {
            title: 'u < f：观察正立的虚像',
            instruction: '把物距调到 6 cm（u < f），从透镜另一侧观察像，注意光屏上是否能看到像。',
            hint: 'u < f 时成正立、放大的虚像，虚像不能用光屏承接。'
          },
          {
            title: '记录数据并归纳',
            instruction: '把三种情况分别记录，回答下方问题，归纳凸透镜成像规律。',
            hint: '比较物距与 f、2f 的关系，再看像的性质。'
          }
        ],
        conclusions: [
          {
            id: 'ol1',
            label: '当 u > 2f 时，凸透镜成倒立、',
            suffix: '（填“放大”“缩小”或“等大”）的实像。',
            type: 'keyword',
            keywords: ['缩小'],
            reference: '缩小。照相机就是根据这一原理工作的。'
          },
          {
            id: 'ol2',
            label: '当 f < u < 2f 时，凸透镜成倒立、',
            suffix: '（填“放大”或“缩小”）的实像。',
            type: 'keyword',
            keywords: ['放大'],
            reference: '放大。投影仪、幻灯机根据这一原理工作。'
          },
          {
            id: 'ol3',
            label: '当 u < f 时，凸透镜成',
            suffix: '（填“正立”或“倒立”）的虚像。',
            type: 'keyword',
            keywords: ['正立'],
            reference: '正立、放大的虚像，放大镜就是根据这一原理工作的。'
          }
        ]
      },

      {
        id: 'optics-free',
        subject: 'optics',
        kind: 'sim',
        name: '光学自由实验室',
        short: '光的反射、平面镜成像、凸透镜成像三套装置随时切换，入射角、物距、焦距全部开放。',
        tag: '自由实验 · 不限步骤',
        time: '不限时',
        accent: '#7c5cff',
        free: true,
        freeNote: '反射 / 平面镜成像 / 凸透镜 随意切换',
        equipment: [
          { icon: 'lens', label: '透镜与平面镜' },
          { icon: 'ruler', label: '光具座' },
          { icon: 'atom', label: '光源' },
          { icon: 'settings', label: '光屏' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'device', label: '装置' },
          { key: 'summary', label: '实验条件' },
          { key: 'result', label: '主要读数' }
        ],
        steps: [],
        conclusions: []
      },

      /* ==================== 物理 · 综合 ==================== */
      {
        id: 'physics-free',
        subject: 'physics',
        kind: 'sim',
        name: '物理自由实验室',
        short: '电、力、热、光四科物理装置集中在一个实验台：杠杆、滑轮、浮力、沸腾、比热容、熔化、反射、平面镜、凸透镜逐台切换，电学一键跳转；想几台装置同屏并排，用「物理综合实验台」。',
        tag: '自由实验 · 不限步骤',
        time: '不限时',
        accent: '#7c5cff',
        free: true,
        freeNote: '电、力、热、光 装置合一 · 参数不限',
        equipment: [
          { icon: 'seesaw', label: '力学装置' },
          { icon: 'thermometer', label: '热学装置' },
          { icon: 'lens', label: '光学装置' },
          { icon: 'circuit-battery', label: '电学入口' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'device', label: '装置' },
          { key: 'summary', label: '实验条件' },
          { key: 'result', label: '主要读数' }
        ],
        steps: [],
        conclusions: []
      },

      {
        id: 'physics-bench',
        subject: 'physics',
        kind: 'combo',
        name: '物理综合实验台',
        short: '力学、热学、光学九套装置同屏摆放：一边调杠杆，一边看水沸腾，一边看凸透镜成像，读数各算各的、互不干扰。',
        tag: '自由实验 · 多装置同屏',
        time: '不限时',
        accent: '#0f766e',
        free: true,
        freeNote: '九套装置同屏 · 各调各的参数',
        equipment: [
          { icon: 'seesaw', label: '杠杆 / 滑轮 / 浮力' },
          { icon: 'flame', label: '沸腾 / 比热容 / 熔化' },
          { icon: 'dep-lens', label: '反射 / 平面镜 / 透镜' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'device', label: '装置' },
          { key: 'summary', label: '实验条件' },
          { key: 'result', label: '主要读数' }
        ],
        steps: [],
        conclusions: []
      },

      /* ==================== 化学 ==================== */
      {
        id: 'chem-oxygen',
        subject: 'chemistry',
        kind: 'sim',
        name: '氧气的实验室制取与性质',
        short: '比较三种药品的制取装置与产气速率，用排水法收集氧气，再用带火星的木条和燃烧的硫检验它的性质。',
        tag: '九年级 · 化学',
        time: '约 18 分钟',
        accent: '#0d8f6f',
        equipment: [
          { icon: 'flask', label: '锥形瓶 / 大试管' },
          { icon: 'beaker', label: '水槽与集气瓶' },
          { icon: 'flame', label: '酒精灯' },
          { icon: 'atom', label: '过氧化氢、高锰酸钾、氯酸钾' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'reagent', label: '药品' },
          { key: 'speed', label: '速率/(mL·s⁻¹)', digits: 1 },
          { key: 'vol', label: 'V(O₂)/mL', digits: 0 },
          { key: 'purity', label: '纯度/%', digits: 0 },
          { key: 'full', label: '集满' },
          { key: 'phenomenon', label: '检验现象' }
        ],
        steps: [
          {
            title: '让药品开始反应',
            instruction: '选择一种制取药品，把反应条件调好（需要加热的药品要点燃酒精灯，过氧化氢要加二氧化锰），直到读数面板里出现稳定的产气速率。',
            hint: '高锰酸钾和氯酸钾必须加热；过氧化氢不加二氧化锰时每分钟只产生几个气泡。'
          },
          {
            title: '用排水法收集一瓶氧气',
            instruction: '点击画面上的「播放」，观察气泡进入倒扣的集气瓶，瓶内水面慢慢下降。集到 60 mL 以上就可以做检验了。',
            hint: '集气瓶里水面下降的体积，就是收集到的氧气体积。'
          },
          {
            title: '把集气瓶集满',
            instruction: '继续收集，直到集气瓶内水全部排出（集满 250 mL）。',
            hint: '排水法收集到的是纯净的氧气，纯度可达 95% 以上。'
          },
          {
            title: '检验氧气的性质',
            instruction: '把「性质检验」切换到带火星的木条或燃烧的硫，观察现象并记录。',
            hint: '氧气能支持燃烧：带火星的木条复燃，硫在氧气中燃烧发出明亮的蓝紫色火焰。'
          },
          {
            title: '填写实验结论',
            instruction: '结合记录的数据，回答下方问题。',
            hint: '催化剂只改变反应速率，不会增加生成氧气的总量。'
          }
        ],
        conclusions: [
          {
            id: 'ox1',
            label: '实验室用过氧化氢溶液制取氧气时，二氧化锰起',
            suffix: '作用，反应前后它的质量和化学性质都不变。',
            type: 'keyword',
            keywords: ['催化'],
            reference: '催化。二氧化锰是催化剂，只加快分解速率。'
          },
          {
            id: 'ox2',
            label: '收集氧气常用排水法，说明氧气',
            suffix: '溶于水。',
            type: 'keyword',
            keywords: ['不易', '难'],
            reference: '不易（难）溶于水，所以可以用排水法收集。'
          },
          {
            id: 'ox3',
            label: '把带火星的木条伸入集满氧气的瓶中，木条',
            suffix: '，说明氧气能支持燃烧。',
            type: 'keyword',
            keywords: ['复燃'],
            reference: '复燃。氧气具有助燃性，但本身不能燃烧。'
          }
        ]
      },

      {
        id: 'chem-combustion',
        subject: 'chemistry',
        kind: 'sim',
        name: '探究燃烧的条件',
        short: '铜片上的白磷、红磷与水中的白磷三处对照，改变水温与是否通氧气，找出燃烧必须同时满足的条件。',
        tag: '九年级 · 化学',
        time: '约 14 分钟',
        accent: '#c9622a',
        equipment: [
          { icon: 'beaker', label: '烧杯与热水' },
          { icon: 'flame', label: '铜片与白磷、红磷' },
          { icon: 'thermometer', label: '温度计' },
          { icon: 'atom', label: '氧气导管' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'temp', label: '水温/℃', digits: 0 },
          { key: 'air', label: '水中白磷通气' },
          { key: 'plateWhite', label: '铜片白磷' },
          { key: 'plateRed', label: '铜片红磷' },
          { key: 'waterWhite', label: '水中白磷' }
        ],
        steps: [
          {
            title: '把水温升到白磷的着火点以上',
            instruction: '把水温滑到 40 ℃ 以上，观察铜片上的白磷有什么变化。',
            hint: '白磷的着火点只有 40 ℃，温度一到就达到了燃烧所需的温度条件。'
          },
          {
            title: '对照铜片上的红磷',
            instruction: '同一块铜片上，红磷为什么没有燃烧？把观察到的现象记下来。',
            hint: '红磷的着火点是 240 ℃，热水最高只有 100 ℃，温度达不到。这说明燃烧需要一个最低温度。'
          },
          {
            title: '让水中的白磷燃烧',
            instruction: '打开「向水中的白磷通氧气」，观察钟罩里的白磷。',
            hint: '水中白磷温度够了，但被水隔绝了氧气，所以不燃烧；通入氧气后立刻燃烧。'
          },
          {
            title: '填写实验结论',
            instruction: '综合三处现象，回答下方问题。',
            hint: '三个条件必须同时满足，缺一个就不能燃烧。'
          }
        ],
        conclusions: [
          {
            id: 'cb1',
            label: '燃烧需要三个条件：可燃物、氧气（或空气）、温度达到',
            suffix: '。',
            type: 'keyword',
            keywords: ['着火点'],
            reference: '着火点。三者必须同时满足，缺一不可。'
          },
          {
            id: 'cb2',
            label: '铜片上的红磷不燃烧，是因为',
            suffix: '。',
            type: 'keyword',
            keywords: ['温度', '着火点'],
            reference: '温度没有达到红磷的着火点（240 ℃）。'
          },
          {
            id: 'cb3',
            label: '水中的白磷一开始不燃烧，通入氧气后燃烧，说明燃烧需要',
            suffix: '。',
            type: 'keyword',
            keywords: ['氧气', '空气'],
            reference: '氧气（或空气）。水把白磷与空气隔开了。'
          }
        ]
      },

      {
        id: 'chem-electrolysis',
        subject: 'chemistry',
        kind: 'sim',
        name: '电解水',
        short: '给水通电，观察两支刻度管里气体的体积关系，验证水由氢、氧两种元素组成。',
        tag: '九年级 · 化学',
        time: '约 15 分钟',
        accent: '#2f6fbf',
        equipment: [
          { icon: 'beaker', label: '电解槽与刻度管' },
          { icon: 'atom', label: '石墨电极' },
          { icon: 'gauge', label: '直流电源' },
          { icon: 'flask', label: '稀硫酸 / 氢氧化钠溶液' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'voltage', label: '电压/V', digits: 1 },
          { key: 'electrolyte', label: '电解液' },
          { key: 't', label: '时间/s', digits: 1 },
          { key: 'vH', label: 'V(H₂)/mL', digits: 1 },
          { key: 'vO', label: 'V(O₂)/mL', digits: 1 },
          { key: 'ratio', label: 'V(H₂):V(O₂)', digits: 1 }
        ],
        steps: [
          {
            title: '把电压调到分解电压以上',
            instruction: '把电压调到 1.5 V 以上，让两支电极上开始冒气泡。',
            hint: '水本身几乎不导电，加入少量稀硫酸或氢氧化钠溶液可以增强导电性。'
          },
          {
            title: '观察两极产生的气体',
            instruction: '点击「播放」通电，看看哪支刻度管里的气体多。',
            hint: '与电源负极相连的电极产生氢气，与正极相连的产生氧气。'
          },
          {
            title: '比较两支刻度管的体积',
            instruction: '收集到 20 mL 以上，读出两支刻度管的气体体积，算一算它们的比值。',
            hint: '氢气的体积大约是氧气的 2 倍。'
          },
          {
            title: '记录数据并验证比值',
            instruction: '记录当前数据，再换一个电压重复一次，看看比值是否稳定在 2 : 1。',
            hint: '改变电压只改变产气快慢，不改变氢气和氧气的体积比。'
          },
          {
            title: '填写实验结论',
            instruction: '根据体积比，回答下方问题。',
            hint: '水中氢、氧元素的原子个数比是 2 : 1，所以气体体积比也是 2 : 1。'
          }
        ],
        conclusions: [
          {
            id: 'el1',
            label: '电解水时，与电源负极相连的电极上产生的气体是',
            suffix: '。',
            type: 'keyword',
            keywords: ['氢气', 'H2', 'H₂'],
            reference: '氢气（H₂），它可以用燃着的木条点燃，产生淡蓝色火焰。'
          },
          {
            id: 'el2',
            label: '氢气和氧气的体积比约为',
            suffix: ': 1。',
            type: 'number',
            answer: 2,
            tolerance: 0.15,
            reference: '2 : 1。由 2H₂O —通电→ 2H₂↑ + O₂↑ 可知。'
          },
          {
            id: 'el3',
            label: '电解水的实验说明，水是由氢元素和',
            suffix: '元素组成的。',
            type: 'keyword',
            keywords: ['氧'],
            reference: '氧元素。化学反应前后元素的种类不变。'
          }
        ]
      },

      {
        id: 'chem-acidbase',
        subject: 'chemistry',
        kind: 'sim',
        name: '酸碱中和反应与指示剂',
        short: '向稀盐酸中逐滴加入氢氧化钠溶液，用石蕊或酚酞判断溶液酸碱性的变化，找到恰好完全反应的那一点。',
        tag: '九年级 · 化学',
        time: '约 16 分钟',
        accent: '#a8447f',
        equipment: [
          { icon: 'flask', label: '锥形瓶' },
          { icon: 'beaker', label: '滴定管' },
          { icon: 'atom', label: '稀盐酸、氢氧化钠溶液' },
          { icon: 'ruler', label: '石蕊 / 酚酞' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'acidConc', label: 'c(HCl)/(mol/L)', digits: 2 },
          { key: 'baseConc', label: 'c(NaOH)/(mol/L)', digits: 2 },
          { key: 'added', label: 'V(NaOH)/mL', digits: 1 },
          { key: 'ph', label: 'pH', digits: 2 },
          { key: 'state', label: '状态' },
          { key: 'color', label: '指示剂颜色' }
        ],
        steps: [
          {
            title: '先加入指示剂',
            instruction: '选择紫色石蕊或无色酚酞，观察锥形瓶里 20 mL 稀盐酸的颜色。',
            hint: '石蕊遇酸变红；酚酞在酸性溶液里仍然无色。'
          },
          {
            title: '开始滴加氢氧化钠溶液',
            instruction: '把滴加体积从 0 慢慢调大，观察颜色变化和 pH 的变化。',
            hint: 'pH 会从酸性区间一步步升到 7 附近。'
          },
          {
            title: '越过中性点',
            instruction: '继续滴加，让溶液变成碱性，看看颜色又怎么变。',
            hint: '石蕊由红变紫再变蓝；酚酞在碱性溶液里变红。'
          },
          {
            title: '找到恰好完全反应的体积',
            instruction: '调整滴加体积，让 pH 最接近 7，记录这组数据。',
            hint: '恰好中和时 n(HCl) = n(NaOH)，也就是 c酸 × 20 mL = c碱 × V碱。'
          },
          {
            title: '填写实验结论',
            instruction: '记录两组不同浓度的数据，回答下方问题。',
            hint: '中和反应的实质是 H⁺ + OH⁻ → H₂O。'
          }
        ],
        conclusions: [
          {
            id: 'ab1',
            label: '氢氧化钠与盐酸恰好完全反应时，溶液的 pH =',
            suffix: '。',
            type: 'number',
            answer: 7,
            tolerance: 0.2,
            reference: '7。酸和碱恰好完全反应，溶液呈中性。'
          },
          {
            id: 'ab2',
            label: '盐酸与氢氧化钠反应生成氯化钠和',
            suffix: '，这个反应属于中和反应。',
            type: 'keyword',
            keywords: ['水'],
            reference: '水（H₂O）。NaOH + HCl → NaCl + H₂O。'
          },
          {
            id: 'ab3',
            label: '无色酚酞遇到碱性溶液会变成',
            suffix: '色。',
            type: 'keyword',
            keywords: ['红'],
            reference: '红色。酚酞遇碱变红，遇酸和中性溶液不变色。'
          }
        ]
      },

      {
        id: 'chem-free',
        subject: 'chemistry',
        kind: 'sim',
        name: '化学自由实验室',
        short: '从八种常见试剂里任选两种混合，随时加入石蕊或酚酞，实时显示现象、颜色与化学方程式，无步骤、不限组数。',
        tag: '自由实验 · 不限步骤',
        time: '不限时',
        accent: '#7c5cff',
        free: true,
        freeNote: '八种试剂任意组合 · 现象实时生成',
        equipment: [
          { icon: 'flask', label: '大试管' },
          { icon: 'beaker', label: '试剂瓶' },
          { icon: 'atom', label: '酸、碱、盐、金属' },
          { icon: 'ruler', label: '石蕊 / 酚酞' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'device', label: '试剂组合' },
          { key: 'summary', label: '反应类型' },
          { key: 'result', label: '实验现象' }
        ],
        steps: [],
        conclusions: []
      },

      /* ==================== 生物 ==================== */
      {
        id: 'bio-microscope',
        subject: 'biology',
        kind: 'sim',
        name: '练习使用显微镜',
        short: '对光、放片、调焦、换高倍镜，一步一步把视野调清楚，比较不同放大倍数下看到的范围与细胞大小。',
        tag: '七年级 · 生物',
        time: '约 16 分钟',
        accent: '#2f855a',
        equipment: [
          { icon: 'lens', label: '显微镜（目镜 10×）' },
          { icon: 'beaker', label: '玻片标本与碘液' },
          { icon: 'ruler', label: '粗 / 细准焦螺旋' },
          { icon: 'atom', label: '反光镜与光圈' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'slide', label: '玻片' },
          { key: 'objective', label: '物镜' },
          { key: 'mag', label: '放大倍数', digits: 0 },
          { key: 'field', label: '视野直径/mm', digits: 2 },
          { key: 'aperture', label: '光圈' },
          { key: 'structures', label: '可见结构' }
        ],
        steps: [
          {
            title: '对光',
            instruction: '把光圈调到「大光圈」，让视野明亮起来。',
            hint: '对光时左眼注视目镜，转动反光镜，直到看到一个明亮的圆形视野。'
          },
          {
            title: '放片并下降镜筒',
            instruction: '把玻片放到载物台上，转动粗准焦螺旋，让镜筒慢慢下降靠近玻片。',
            hint: '眼睛要从侧面看着物镜，避免物镜压碎玻片。'
          },
          {
            title: '调出清晰的物像',
            instruction: '再慢慢升高镜筒，找到物像后用细准焦螺旋把它调清楚。',
            hint: '先低倍后高倍：低倍镜下找到物像，再换高倍镜观察细节。'
          },
          {
            title: '换成高倍镜观察',
            instruction: '把物镜换成 40×，只用细准焦螺旋调清楚，看看细胞有什么变化。',
            hint: '放大倍数变大，看到的细胞变大、数目变少、视野变暗。'
          },
          {
            title: '填写实验结论',
            instruction: '记录两组不同放大倍数的数据，回答下方问题。',
            hint: '放大倍数 = 目镜倍数 × 物镜倍数。'
          }
        ],
        conclusions: [
          {
            id: 'mc1',
            label: '显微镜的放大倍数等于目镜倍数与物镜倍数的',
            suffix: '。',
            type: 'keyword',
            keywords: ['乘积', '乘'],
            reference: '乘积。目镜 10× 配 40× 物镜，放大倍数就是 400 倍。'
          },
          {
            id: 'mc2',
            label: '放大倍数越大，视野中看到的细胞数目越',
            suffix: '。',
            type: 'keyword',
            keywords: ['少'],
            reference: '少。倍数越大视野范围越小，看到的细胞数目越少、细胞越大。'
          },
          {
            id: 'mc3',
            label: '观察时如果物像在视野的左上方，应该把玻片向',
            suffix: '方移动，才能把物像移到视野中央。',
            type: 'keyword',
            keywords: ['左上', '左上方'],
            reference: '左上方。显微镜成的是倒像，物像偏向哪边就往哪边移动玻片。'
          }
        ]
      },

      {
        id: 'bio-cell',
        subject: 'biology',
        kind: 'sim',
        name: '观察动、植物细胞的结构',
        short: '在植物细胞与动物细胞之间切换，点选细胞里的各个结构，弄清哪些结构是植物细胞特有的。',
        tag: '七年级 · 生物',
        time: '约 12 分钟',
        accent: '#7c5cff',
        equipment: [
          { icon: 'lens', label: '显微镜视野' },
          { icon: 'atom', label: '植物细胞模型' },
          { icon: 'dna', label: '动物细胞模型' },
          { icon: 'ruler', label: '结构名称与功能' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'cell', label: '细胞类型' },
          { key: 'structure', label: '结构' },
          { key: 'present', label: '是否含有' },
          { key: 'func', label: '功能' }
        ],
        steps: [
          {
            title: '找出植物细胞最外层的结构',
            instruction: '切到植物细胞，点选最外层的结构，看看它叫什么、有什么作用。',
            hint: '植物细胞最外面是细胞壁，起支持和保护作用。'
          },
          {
            title: '认识细胞核',
            instruction: '点选细胞中央那个圆圆的结构——细胞核。',
            hint: '细胞核里有遗传物质，是细胞的控制中心，动植物细胞都有。'
          },
          {
            title: '对比动物细胞',
            instruction: '切换到动物细胞，点选细胞膜或细胞质，比较它和植物细胞少了哪些结构。',
            hint: '动物细胞没有细胞壁、液泡和叶绿体，只有细胞膜、细胞质、细胞核和线粒体。'
          },
          {
            title: '填写实验结论',
            instruction: '根据观察结果，回答下方问题。',
            hint: '细胞是生物体结构和功能的基本单位。'
          }
        ],
        conclusions: [
          {
            id: 'cl1',
            label: '植物细胞与动物细胞都有的结构是细胞膜、细胞质、细胞核和',
            suffix: '。',
            type: 'keyword',
            keywords: ['线粒体'],
            reference: '线粒体。它是呼吸作用的场所，动植物细胞都有。'
          },
          {
            id: 'cl2',
            label: '下列结构中，动物细胞没有的是：细胞壁、液泡、',
            suffix: '。（填一个即可）',
            type: 'keyword',
            keywords: ['叶绿体'],
            reference: '叶绿体（细胞壁、液泡、叶绿体都是植物细胞特有的）。'
          },
          {
            id: 'cl3',
            label: '细胞中进行光合作用的场所是',
            suffix: '。',
            type: 'keyword',
            keywords: ['叶绿体'],
            reference: '叶绿体。它含有叶绿素，能把光能转变成化学能。'
          }
        ]
      },

      {
        id: 'bio-photo',
        subject: 'biology',
        kind: 'sim',
        name: '探究光合作用需要光和二氧化碳',
        short: '给天竺葵部分遮光、控制钟罩里的二氧化碳，再用碘液检验叶片，看看哪一部分变蓝。',
        tag: '七年级 · 生物',
        time: '约 15 分钟',
        accent: '#0d8f6f',
        equipment: [
          { icon: 'flask', label: '天竺葵与透明钟罩' },
          { icon: 'beaker', label: '氢氧化钠溶液 / 清水' },
          { icon: 'flame', label: '酒精与碘液' },
          { icon: 'ruler', label: '黑纸片' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'light', label: '光照' },
          { key: 'co2', label: '二氧化碳' },
          { key: 'hours', label: '光照时间/h', digits: 1 },
          { key: 'starch', label: '淀粉积累/%', digits: 0 },
          { key: 'exposed', label: '见光部分' },
          { key: 'masked', label: '遮光部分' }
        ],
        steps: [
          {
            title: '给叶片一部分遮光',
            instruction: '把「用黑纸遮住叶片的一部分」打开，确认有光照，光照时间调到 1 小时以上。',
            hint: '遮光的目的是形成对照：同一片叶子上，见光与不见光的部分只有光照这一个条件不同。'
          },
          {
            title: '让叶片积累淀粉',
            instruction: '把光照时间逐渐调大，观察淀粉积累的变化。',
            hint: '光照时间越长，光合作用制造的淀粉越多。'
          },
          {
            title: '检验遮光部分',
            instruction: '看碘液检验的结果：遮光的部分变蓝了吗？记录下来。',
            hint: '遮光部分没有光照，不能进行光合作用，滴碘液不变蓝。'
          },
          {
            title: '去掉二氧化碳再试一次',
            instruction: '关闭「放清水」，改用氢氧化钠溶液吸收二氧化碳，观察叶片是否还能变蓝。',
            hint: '二氧化碳是光合作用的原料，没有它同样制造不出淀粉。'
          },
          {
            title: '填写实验结论',
            instruction: '综合两次实验，回答下方问题。',
            hint: '光合作用的原料是二氧化碳和水，条件是光照，产物有淀粉和氧气。'
          }
        ],
        conclusions: [
          {
            id: 'ph1',
            label: '绿叶在光下制造的有机物主要是',
            suffix: '，它遇碘液会变蓝。',
            type: 'keyword',
            keywords: ['淀粉'],
            reference: '淀粉。碘液遇淀粉变蓝，这是检验光合作用产物的常用方法。'
          },
          {
            id: 'ph2',
            label: '叶片遮光部分滴碘液不变蓝，说明光合作用需要',
            suffix: '。',
            type: 'keyword',
            keywords: ['光', '光照'],
            reference: '光。没有光照就不能进行光合作用。'
          },
          {
            id: 'ph3',
            label: '光合作用的原料是二氧化碳和',
            suffix: '。',
            type: 'keyword',
            keywords: ['水'],
            reference: '水。光合作用的表达式：二氧化碳 + 水 —光→ 有机物（贮存能量）+ 氧气。'
          }
        ]
      },

      {
        id: 'bio-enzyme',
        subject: 'biology',
        kind: 'sim',
        name: '探究唾液淀粉酶对淀粉的消化作用',
        short: '三支试管分别放唾液、煮沸后冷却的唾液和清水，在同一个水浴里保温，再用碘液检验淀粉是否被分解。',
        tag: '七年级 · 生物',
        time: '约 14 分钟',
        accent: '#c05621',
        equipment: [
          { icon: 'flask', label: '试管与淀粉液' },
          { icon: 'beaker', label: '水浴与温度计' },
          { icon: 'thermometer', label: '37 ℃ 温水' },
          { icon: 'atom', label: '唾液与碘液' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'temp', label: '温度/℃', digits: 0 },
          { key: 'minutes', label: '时间/min', digits: 0 },
          { key: 'activity', label: '酶活性/%', digits: 0 },
          { key: 't1', label: '1 号管' },
          { key: 't2', label: '2 号管' },
          { key: 't3', label: '3 号管' },
          { key: 'digested', label: '变清管数', digits: 0 }
        ],
        steps: [
          {
            title: '把水浴调到 37 ℃',
            instruction: '把水浴温度调到 37 ℃ 左右，这是唾液淀粉酶最适宜的温度。',
            hint: '37 ℃ 接近人体体温，酶的活性最高。'
          },
          {
            title: '等待淀粉被分解',
            instruction: '把保温时间调到 5 分钟以上，观察 1 号试管里淀粉的分解进程。',
            hint: '酶把淀粉分解成麦芽糖，淀粉越少，滴碘液后颜色越浅。'
          },
          {
            title: '1 号试管完全变清',
            instruction: '继续延长保温时间，直到 1 号试管滴碘液后不再变蓝。',
            hint: '淀粉被彻底分解后，碘液就没有东西可以变蓝了。'
          },
          {
            title: '把温度升到 70 ℃ 以上',
            instruction: '把水浴温度升到 70 ℃ 以上，看看 1 号试管的淀粉还能不能被分解。',
            hint: '高温会使唾液淀粉酶的空间结构被破坏，永久失去活性（变性）。'
          },
          {
            title: '填写实验结论',
            instruction: '综合三支试管的对照结果，回答下方问题。',
            hint: '2 号管的唾液煮沸过，酶已经变性；3 号管没有酶，两个都不会让淀粉消失。'
          }
        ],
        conclusions: [
          {
            id: 'en1',
            label: '唾液淀粉酶把淀粉分解成',
            suffix: '。',
            type: 'keyword',
            keywords: ['麦芽糖'],
            reference: '麦芽糖。淀粉在唾液淀粉酶的作用下分解成麦芽糖，所以碘液不再变蓝。'
          },
          {
            id: 'en2',
            label: '唾液淀粉酶最适宜的温度约为',
            suffix: '℃。',
            type: 'number',
            answer: 37,
            tolerance: 2,
            reference: '37 ℃，接近人的体温。'
          },
          {
            id: 'en3',
            label: '把唾液煮沸后再冷却，它就不能分解淀粉了，因为高温使酶',
            suffix: '。',
            type: 'keyword',
            keywords: ['变性', '失活', '失去活性'],
            reference: '变性失活。高温破坏酶的空间结构，这种破坏是不可逆的。'
          }
        ]
      },

      {
        id: 'bio-free',
        subject: 'biology',
        kind: 'sim',
        name: '生物自由实验室',
        short: '显微镜随便用：六种玻片、三种目镜、三种物镜、两级准焦、两种光圈全部开放，所见即所得，无步骤、不限组数。',
        tag: '自由实验 · 不限步骤',
        time: '不限时',
        accent: '#7c5cff',
        free: true,
        freeNote: '六种玻片 × 三种目镜 × 三种物镜',
        equipment: [
          { icon: 'lens', label: '显微镜' },
          { icon: 'beaker', label: '六种玻片标本' },
          { icon: 'ruler', label: '粗 / 细准焦螺旋' },
          { icon: 'atom', label: '反光镜与光圈' }
        ],
        columns: [
          { key: 'group', label: '组次' },
          { key: 'device', label: '装置' },
          { key: 'summary', label: '观察条件' },
          { key: 'result', label: '观察结果' }
        ],
        steps: [],
        conclusions: []
      },

      {
        id: 'math-board',
        subject: 'math',
        kind: 'math',
        name: '数学绘图器',
        short: '函数图像与几何构造在同一个画布，拖动点线圆即时变化，并用 C++ 风格脚本实时判断图形关系。',
        tag: '自由实验 · 函数与几何',
        time: '不限时',
        accent: '#7c5cff',
        free: true,
        freeNote: '函数绘图 · 几何构造 · C++ 判断',
        equipment: [
          { icon: 'chart-line', label: '函数图像' },
          { icon: 'ruler', label: '几何构造' },
          { icon: 'zoom-in', label: '缩放与测量' },
          { icon: 'settings', label: 'C++ 判断脚本' }
        ],
        columns: [],
        steps: [],
        conclusions: []
      }
    ]
  };

  SL.data.labsById = {};
  SL.data.labs.forEach(function (lab) { SL.data.labsById[lab.id] = lab; });
  SL.data.subjectById = {};
  SL.data.subjects.forEach(function (s) { SL.data.subjectById[s.id] = s; });

  /* 数学绘图器没有独立的 lab-*.js 装置模块：整个工作台由 SL.math.lab 自己挂载。
     app.openLab 统一从 SL.labs 取实验壳，这里登记一个最小壳（meta 指向同一份元数据），
     使 openLab / 卡片点击 / 返回大厅走和其余 27 个实验完全一样的链路。 */
  SL.labs = SL.labs || {};
  SL.labs['math-board'] = {
    id: 'math-board',
    kind: 'math',
    meta: SL.data.labsById['math-board'],
    defaults: {},
    reset: function () {}
  };
})();
