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
        available: false,
        desc: '物态变化、比热容（敬请期待）'
      },
      {
        id: 'optics',
        name: '物理 · 光学',
        icon: 'lens',
        available: false,
        desc: '反射、折射、凸透镜（敬请期待）'
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
        available: false,
        desc: '显微镜、光合作用（敬请期待）'
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
      }
    ]
  };

  SL.data.labsById = {};
  SL.data.labs.forEach(function (lab) { SL.data.labsById[lab.id] = lab; });
  SL.data.subjectById = {};
  SL.data.subjects.forEach(function (s) { SL.data.subjectById[s.id] = s; });
})();
