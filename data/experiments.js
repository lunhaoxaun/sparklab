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
        desc: '物态变化、比热容、内能'
      },
      {
        id: 'optics',
        name: '物理 · 光学',
        icon: 'lens',
        available: true,
        desc: '反射、折射、平面镜、凸透镜'
      },
      {
        id: 'chemistry',
        name: '化学',
        icon: 'flask',
        available: false,
        desc: '酸碱、气体制取（敬请期待）'
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
            instruction: '把钩码提升到设定高度（可点「播放」自动提升，也可直接拖动钩码），然后记录一组数据。',
            hint: '一定要读到「提升到位」再记录，否则绳端移动距离对不上。'
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
      }
    ]
  };

  SL.data.labsById = {};
  SL.data.labs.forEach(function (lab) { SL.data.labsById[lab.id] = lab; });
  SL.data.subjectById = {};
  SL.data.subjects.forEach(function (s) { SL.data.subjectById[s.id] = s; });
})();
