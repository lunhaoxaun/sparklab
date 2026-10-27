/* 实验元数据：科目、实验卡片、引导步骤文案、记录表头、结论题 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  SL.data = {
    subjects: [
      {
        id: 'physics',
        name: '物理 · 电学',
        icon: 'circuit-battery',
        available: true,
        desc: '电路、电流、电压、电阻'
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
        subject: 'physics',
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
        subject: 'physics',
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
        subject: 'physics',
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
        subject: 'physics',
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
      }
    ]
  };

  SL.data.labsById = {};
  SL.data.labs.forEach(function (lab) { SL.data.labsById[lab.id] = lab; });
  SL.data.subjectById = {};
  SL.data.subjects.forEach(function (s) { SL.data.subjectById[s.id] = s; });
})();
