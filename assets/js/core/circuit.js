/* 电路引擎：元件定义、节点合并、MNA 求解、异常检测、串并联拓扑识别 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  var BULB_R = 2.5 / 0.3;          // 小灯泡按额定值折算的线性电阻 ≈ 8.33Ω
  var BULB_RATED_P = 2.5 * 0.3;    // 额定功率 0.75W
  var AMMETER_R = 0.01;
  var VOLTMETER_R = 1e6;
  var SWITCH_R = 1e-3;

  var TYPES = {
    battery: {
      label: '电池组', icon: 'circuit-battery', w: 96, h: 48,
      terminals: [{ id: 'neg', dx: -48, dy: 0, polarity: '-' }, { id: 'pos', dx: 48, dy: 0, polarity: '+' }],
      props: { cells: 2 }
    },
    switch: {
      label: '开关', icon: 'settings', w: 76, h: 40,
      terminals: [{ id: 'a', dx: -38, dy: 0 }, { id: 'b', dx: 38, dy: 0 }],
      props: { closed: false }
    },
    bulb: {
      label: '小灯泡', icon: 'circuit-bulb', w: 60, h: 60,
      terminals: [{ id: 'a', dx: -30, dy: 0 }, { id: 'b', dx: 30, dy: 0 }],
      props: {}
    },
    resistor: {
      label: '定值电阻', icon: 'circuit-resistor', w: 92, h: 36,
      terminals: [{ id: 'a', dx: -46, dy: 0 }, { id: 'b', dx: 46, dy: 0 }],
      props: { resistance: 10, unknown: false }
    },
    rheostat: {
      label: '滑动变阻器', icon: 'circuit-resistor', w: 132, h: 58,
      terminals: [
        { id: 'a', dx: -66, dy: 0, label: 'A' },
        { id: 'b', dx: 66, dy: 0, label: 'B' },
        { id: 'c', dx: -66, dy: -24, label: 'C' },
        { id: 'd', dx: 66, dy: -24, label: 'D' }
      ],
      props: { slider: 0.5, max: 20 }
    },
    ammeter: {
      label: '电流表', icon: 'circuit-ammeter', w: 80, h: 60,
      terminals: [{ id: 'plus', dx: -40, dy: 0, polarity: '+' }, { id: 'minus', dx: 40, dy: 0, polarity: '-' }],
      props: { range: 0.6 }
    },
    voltmeter: {
      label: '电压表', icon: 'circuit-voltmeter', w: 80, h: 60,
      terminals: [{ id: 'plus', dx: -40, dy: 0, polarity: '+' }, { id: 'minus', dx: 40, dy: 0, polarity: '-' }],
      props: { range: 3 }
    }
  };

  var seq = 0;
  function nextId(type) { seq += 1; return type + '-' + seq; }

  /* 从已保存的场景恢复时，把计数器推到现有 ID 之后，避免 ID 冲突 */
  function syncIds(scene) {
    if (!scene || !scene.components) return;
    scene.components.forEach(function (comp) {
      var m = /-(\d+)$/.exec(comp.id || '');
      if (m) seq = Math.max(seq, parseInt(m[1], 10));
    });
  }

  function create(type, x, y, props) {
    var def = TYPES[type];
    if (!def) throw new Error('未知元件类型：' + type);
    var comp = {
      id: nextId(type),
      type: type,
      x: Math.round(x || 0),
      y: Math.round(y || 0),
      rotation: 0,
      props: Object.assign({}, def.props, props || {})
    };
    if (!comp.props.id) comp.props.id = comp.id;
    return comp;
  }

  function rotatePoint(dx, dy, deg) {
    var rad = (deg * Math.PI) / 180;
    var cos = Math.cos(rad), sin = Math.sin(rad);
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  }

  function terminalPoint(comp, terminalId) {
    var def = TYPES[comp.type];
    var t = null;
    for (var i = 0; i < def.terminals.length; i++) {
      if (def.terminals[i].id === terminalId) t = def.terminals[i];
    }
    if (!t) return null;
    var p = rotatePoint(t.dx, t.dy, comp.rotation || 0);
    return { x: comp.x + p.x, y: comp.y + p.y };
  }

  function terminalKey(compId, terminalId) { return compId + ':' + terminalId; }

  function makeDsu() {
    var parent = {};
    function add(key) { if (!(key in parent)) parent[key] = key; }
    function find(key) {
      add(key);
      var root = key;
      while (parent[root] !== root) root = parent[root];
      while (parent[key] !== key) { var nxt = parent[key]; parent[key] = root; key = nxt; }
      return root;
    }
    function union(a, b) {
      var ra = find(a), rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    }
    return { add: add, find: find, union: union, parent: parent };
  }

  function getComp(scene, id) {
    for (var i = 0; i < scene.components.length; i++) {
      if (scene.components[i].id === id) return scene.components[i];
    }
    return null;
  }

  function connectedTerminals(scene, comp) {
    var set = {};
    scene.wires.forEach(function (w) {
      if (w.from.compId === comp.id) set[w.from.terminalId] = true;
      if (w.to.compId === comp.id) set[w.to.terminalId] = true;
    });
    return set;
  }

  /* 滑动变阻器接入信息：按实际接线柱判断接入电阻与“阻值最大端” */
  function rheostatInfo(comp, scene) {
    var p = comp.props || {};
    var max = p.max || 20;
    var slider = Math.max(0, Math.min(1, p.slider == null ? 0.5 : p.slider));
    var wired = scene ? connectedTerminals(scene, comp) : {};
    var bottoms = (wired.a ? 1 : 0) + (wired.b ? 1 : 0);
    var tops = (wired.c ? 1 : 0) + (wired.d ? 1 : 0);
    var lower = wired.a && !wired.b ? 'a' : wired.b && !wired.a ? 'b' : null;

    var wiring, active, maxAtSlider = null, atMax = false;
    if (bottoms + tops < 2) {
      wiring = 'incomplete';
      active = 0;
    } else if (bottoms === 2) {
      wiring = tops >= 1 ? 'mixed' : 'fixed-max';
      active = max;
      atMax = true;
    } else if (bottoms === 0) {
      wiring = 'fixed-zero';
      active = 0;
    } else {
      wiring = 'valid';
      maxAtSlider = lower === 'a' ? 1 : 0;
      active = (lower === 'a' ? slider : 1 - slider) * max;
      atMax = lower === 'a' ? slider >= 0.95 : slider <= 0.05;
    }
    return {
      slider: slider,
      max: max,
      wiring: wiring,
      bottoms: bottoms,
      tops: tops,
      lower: lower,
      active: Math.max(0, active),
      maxAtSlider: maxAtSlider,
      atMax: atMax
    };
  }

  /* ---------- 求解 ---------- */
  function solveLinear(A, rhs) {
    var n = rhs.length;
    var i, j, k;
    for (var col = 0; col < n; col++) {
      var pivot = col;
      for (var r = col + 1; r < n; r++) {
        if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
      }
      if (Math.abs(A[pivot][col]) < 1e-10) return null;
      if (pivot !== col) {
        var tmpRow = A[pivot]; A[pivot] = A[col]; A[col] = tmpRow;
        var tmpB = rhs[pivot]; rhs[pivot] = rhs[col]; rhs[col] = tmpB;
      }
      var pv = A[col][col];
      for (var rr = col + 1; rr < n; rr++) {
        var f = A[rr][col] / pv;
        if (f === 0) continue;
        for (var cc = col; cc < n; cc++) A[rr][cc] -= f * A[col][cc];
        rhs[rr] -= f * rhs[col];
      }
    }
    var x = new Array(n);
    for (i = 0; i < n; i++) x[i] = 0;
    for (i = n - 1; i >= 0; i--) {
      var s = rhs[i];
      for (j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    return x;
  }

  function solve(scene) {
    var dsu = makeDsu();
    var terminals = [];
    var terminalNode = {};
    var compById = {};

    scene.components.forEach(function (comp) {
      compById[comp.id] = comp;
      TYPES[comp.type].terminals.forEach(function (t) {
        var key = terminalKey(comp.id, t.id);
        dsu.add(key);
        terminals.push({ key: key, comp: comp, terminal: t });
        terminalNode[comp.id + ':' + t.id] = key;
      });
      if (comp.type === 'rheostat') {
        var sKey = '#RHEO:' + comp.id;
        dsu.add(sKey);
        dsu.union(comp.id + ':c', sKey);
        dsu.union(comp.id + ':d', sKey);
      }
      if (comp.type === 'battery') {
        dsu.add('#BAT:' + comp.id);
      }
    });

    scene.wires.forEach(function (wire) {
      var a = wire.from.compId + ':' + wire.from.terminalId;
      var b = wire.to.compId + ':' + wire.to.terminalId;
      dsu.union(a, b);
    });

    function nodeOf(key) { return dsu.find(key); }

    var elements = [];
    function addR(comp, aKey, bKey, resistance) {
      if (!(resistance > 0)) return;
      elements.push({
        kind: 'R', compId: comp ? comp.id : null, compType: comp ? comp.type : null,
        a: nodeOf(aKey), b: nodeOf(bKey), R: resistance
      });
    }
    function addV(comp, posKey, negKey, voltage) {
      elements.push({
        kind: 'V', compId: comp.id, compType: comp.type,
        a: nodeOf(posKey), b: nodeOf(negKey), E: voltage
      });
    }

    scene.components.forEach(function (comp) {
      var p = comp.props || {};
      if (comp.type === 'battery') {
        var cells = Math.max(1, Math.min(4, Math.round(p.cells || 2)));
        var internal = '#BAT:' + comp.id;
        addV(comp, internal, comp.id + ':neg', cells * 1.5);
        addR(comp, comp.id + ':pos', internal, cells * 0.5);
      } else if (comp.type === 'switch') {
        if (p.closed) addR(comp, comp.id + ':a', comp.id + ':b', SWITCH_R);
      } else if (comp.type === 'bulb') {
        if (!p.burned) addR(comp, comp.id + ':a', comp.id + ':b', BULB_R);
      } else if (comp.type === 'resistor') {
        addR(comp, comp.id + ':a', comp.id + ':b', Math.max(0.01, p.resistance || 10));
      } else if (comp.type === 'rheostat') {
        var max = p.max || 20;
        var slider = Math.max(0, Math.min(1, p.slider == null ? 0.5 : p.slider));
        var sKey = '#RHEO:' + comp.id;
        addR(comp, comp.id + ':a', sKey, Math.max(0.001, slider * max));
        addR(comp, comp.id + ':b', sKey, Math.max(0.001, (1 - slider) * max));
      } else if (comp.type === 'ammeter') {
        addR(comp, comp.id + ':plus', comp.id + ':minus', AMMETER_R);
      } else if (comp.type === 'voltmeter') {
        addR(comp, comp.id + ':plus', comp.id + ':minus', VOLTMETER_R);
      }
    });

    var nodeSet = {};
    elements.forEach(function (e) { nodeSet[e.a] = true; nodeSet[e.b] = true; });
    var nodes = Object.keys(nodeSet);

    var adj = {};
    nodes.forEach(function (n) { adj[n] = []; });
    elements.forEach(function (e, idx) {
      adj[e.a].push(idx);
      if (e.b !== e.a) adj[e.b].push(idx);
    });

    var visited = {};
    var nodeV = {};
    var sourceCurrent = {};
    var failed = false;

    nodes.forEach(function (start) {
      if (visited[start]) return;
      var queue = [start];
      var compNodes = [];
      var compElems = [];
      visited[start] = true;
      while (queue.length) {
        var n = queue.shift();
        compNodes.push(n);
        adj[n].forEach(function (idx) {
          var e = elements[idx];
          var other = e.a === n ? e.b : e.a;
          if (!visited[other]) { visited[other] = true; queue.push(other); }
          if (compElems.indexOf(idx) === -1) compElems.push(idx);
        });
      }
      compNodes.forEach(function (n) { nodeV[n] = 0; });

      var sources = compElems.map(function (idx) { return elements[idx]; }).filter(function (e) { return e.kind === 'V'; });
      if (!sources.length) return;

      var ref = sources[0].b;
      var localIndex = {};
      var idx = 0;
      compNodes.forEach(function (n) { if (n !== ref) localIndex[n] = idx++; });
      var nVolt = compNodes.length - 1;
      var nSrc = sources.length;
      var size = nVolt + nSrc;
      if (size <= 0) return;

      var A = [];
      for (var r = 0; r < size; r++) {
        A.push(new Array(size).fill(0));
      }
      var rhs = new Array(size).fill(0);

      function kcl(row, col, value) {
        if (row == null || col == null) return;
        A[row][col] += value;
      }
      function nodeRow(n) { return n === ref ? null : localIndex[n]; }

      compElems.forEach(function (eIdx) {
        var e = elements[eIdx];
        if (e.kind === 'R') {
          var g = 1 / e.R;
          var ia = nodeRow(e.a), ib = nodeRow(e.b);
          if (ia != null) kcl(ia, ia, g);
          if (ib != null) kcl(ib, ib, g);
          if (ia != null && ib != null) {
            kcl(ia, ib, -g);
            kcl(ib, ia, -g);
          }
        }
      });

      sources.forEach(function (e, k) {
        var ia = nodeRow(e.a), ib = nodeRow(e.b);
        var curCol = nVolt + k;
        if (ia != null) kcl(ia, curCol, 1);
        if (ib != null) kcl(ib, curCol, -1);
        var row = nVolt + k;
        if (ia != null) A[row][ia] = 1;
        if (ib != null) A[row][ib] = -1;
        rhs[row] = e.E;
      });

      var x = solveLinear(A, rhs);
      if (!x) { failed = true; return; }
      compNodes.forEach(function (n) { nodeV[n] = n === ref ? 0 : x[localIndex[n]]; });
      sources.forEach(function (e, k) { sourceCurrent[e.compId + '|' + e.a + '|' + e.b] = x[nVolt + k]; });
    });

    /* 元件结果 */
    var result = {
      ok: !failed,
      nodeV: nodeV,
      terminalNode: {},
      components: {},
      bulbs: {},
      batteries: {},
      meters: {},
      warnings: []
    };

    scene.components.forEach(function (comp) {
      var out = { terminals: {}, voltage: 0, current: 0 };
      TYPES[comp.type].terminals.forEach(function (t) {
        var key = terminalNode[comp.id + ':' + t.id];
        var node = nodeOf(key);
        out.terminals[t.id] = { node: node, voltage: nodeV[node] || 0 };
        result.terminalNode[comp.id + ':' + t.id] = node;
      });

      if (comp.type === 'battery') {
        var internal = nodeOf('#BAT:' + comp.id);
        var posNode = nodeOf(comp.id + ':pos');
        var negNode = nodeOf(comp.id + ':neg');
        var cells = Math.max(1, Math.min(4, Math.round((comp.props || {}).cells || 2)));
        var r = cells * 0.5;
        var vPos = nodeV[posNode] || 0;
        var vInt = nodeV[internal] || 0;
        var current = (vPos - vInt) / r;
        var terminalV = vPos - (nodeV[negNode] || 0);
        out.current = current;
        out.voltage = terminalV;
        out.terminalVoltage = terminalV;
        out.emf = cells * 1.5;
        out.externalCurrent = current;
        result.batteries[comp.id] = out;
        var rExt = Math.abs(current) > 1e-6 ? Math.abs(terminalV / current) : Infinity;
        if (Math.abs(current) > 1.2 && rExt < 0.6) {
          out.short = true;
          result.flags = result.flags || {};
          result.flags.short = true;
        }
      } else if (comp.type === 'bulb') {
        var v = (out.terminals.a.voltage - out.terminals.b.voltage);
        out.voltage = v;
        out.current = v / BULB_R;
        out.power = (v * v) / BULB_R;
        out.ratio = out.power / BULB_RATED_P;
        result.bulbs[comp.id] = out;
      } else if (comp.type === 'ammeter') {
        var ia = (out.terminals.plus.voltage - out.terminals.minus.voltage) / AMMETER_R;
        out.current = ia;
        out.voltage = out.terminals.plus.voltage - out.terminals.minus.voltage;
        result.meters[comp.id] = { kind: 'A', value: ia, range: (comp.props || {}).range || 0.6 };
      } else if (comp.type === 'voltmeter') {
        var uv = out.terminals.plus.voltage - out.terminals.minus.voltage;
        out.voltage = uv;
        out.current = uv / VOLTMETER_R;
        result.meters[comp.id] = { kind: 'V', value: uv, range: (comp.props || {}).range || 3 };
      } else if (comp.type === 'resistor' || comp.type === 'rheostat' || comp.type === 'switch') {
        var ta = out.terminals[Object.keys(out.terminals)[0]];
        var tb = out.terminals[Object.keys(out.terminals)[1]];
        out.voltage = (ta ? ta.voltage : 0) - (tb ? tb.voltage : 0);
      }
      result.components[comp.id] = out;
    });

    /* 电表读数与异常 */
    Object.keys(result.meters).forEach(function (id) {
      var m = result.meters[id];
      var comp = compById[id];
      var range = (comp.props || {}).range || m.range;
      m.range = range;
      m.reversed = m.value < -1e-6;
      m.overRange = Math.abs(m.value) > range * 1.001;
      m.display = Math.abs(m.value);
      if (m.overRange) result.warnings.push({ type: 'overRange', compId: id, message: (m.kind === 'A' ? '电流表' : '电压表') + '超量程，请更换大量程' });
      if (m.reversed) result.warnings.push({ type: 'reverse', compId: id, message: (m.kind === 'A' ? '电流表' : '电压表') + '指针反偏，正负接线柱接反了' });
    });

    /* 断路判断：开关已闭合但电源没有电流 */
    var closedSwitch = scene.components.some(function (c) { return c.type === 'switch' && c.props.closed; });
    var anyBattery = scene.components.some(function (c) { return c.type === 'battery'; });
    var maxBat = 0;
    Object.keys(result.batteries).forEach(function (id) { maxBat = Math.max(maxBat, Math.abs(result.batteries[id].current)); });
    if (anyBattery && closedSwitch && maxBat < 1e-4) {
      result.flags = result.flags || {};
      result.flags.open = true;
      result.warnings.push({ type: 'open', message: '电路断路：开关已闭合但没有电流，请检查导线是否接好' });
    }
    if (result.flags && result.flags.short) {
      result.warnings.push({ type: 'short', message: '电源短路！电流过大，请立即断开开关并检查接线' });
    }

    /* 变阻器接法 */
    result.rheostats = {};
    scene.components.forEach(function (comp) {
      if (comp.type !== 'rheostat') return;
      var info = rheostatInfo(comp, scene);
      result.rheostats[comp.id] = info;
      if (info.wiring === 'fixed-max') result.warnings.push({ type: 'rheostat', compId: comp.id, message: '滑动变阻器接成了定值电阻（只接下面两个接线柱），滑片不起作用' });
      if (info.wiring === 'mixed') result.warnings.push({ type: 'rheostat', compId: comp.id, message: '同时接了下端两个接线柱，滑动变阻器被接成定值电阻，滑片不起作用' });
      if (info.wiring === 'fixed-zero') result.warnings.push({ type: 'rheostat', compId: comp.id, message: '滑动变阻器只接了上面接线柱，接入电阻几乎为零' });
      if (info.wiring === 'incomplete') result.warnings.push({ type: 'rheostat', compId: comp.id, message: '滑动变阻器接线不完整，请“一上一下”接入电路' });
    });

    /* 拓扑：串并联识别与电流路径 */
    var topo = analyseTopology(scene, dsu, terminalNode, nodeOf);
    result.sceneType = topo.scene;
    result.paths = topo.paths;
    result.bulbIds = topo.bulbIds;
    result.meterInfo = topo.meterInfo;
    result.nodeLevels = topo.levels;
    result.warnCount = result.warnings.length;

    return result;
  }

  /* ---------- 拓扑分析 ---------- */
  function analyseTopology(scene, dsu, terminalNode, nodeOf) {
    var bulbIds = scene.components.filter(function (c) { return c.type === 'bulb'; }).map(function (c) { return c.id; });
    var batteries = scene.components.filter(function (c) { return c.type === 'battery'; });
    var edges = [];
    var adj = {};

    function nodeOfKey(key) { return nodeOf(key); }
    function addEdge(compId, aNode, bNode) {
      if (!aNode || !bNode || aNode === bNode) return;
      var idx = edges.length;
      edges.push({ compId: compId, a: aNode, b: bNode });
      (adj[aNode] = adj[aNode] || []).push(idx);
      (adj[bNode] = adj[bNode] || []).push(idx);
    }

    scene.components.forEach(function (comp) {
      if (comp.type === 'voltmeter') return;
      if (comp.type === 'rheostat') {
        var sNode = nodeOfKey('#RHEO:' + comp.id);
        addEdge(comp.id, nodeOfKey(comp.id + ':a'), sNode);
        addEdge(comp.id, nodeOfKey(comp.id + ':b'), sNode);
        return;
      }
      if (comp.type === 'bulb' && comp.props.burned) return;
      if (comp.type === 'battery') return;
      var ts = TYPES[comp.type].terminals;
      addEdge(comp.id, nodeOfKey(comp.id + ':' + ts[0].id), nodeOfKey(comp.id + ':' + ts[1].id));
    });

    var paths = [];
    var levels = {};
    var meterInfo = { ammetersOnPath: [], voltmeterAcross: {} };
    var sceneResult = 'other';

    if (batteries.length) {
      var bat = batteries[0];
      var start = nodeOfKey(bat.id + ':pos');
      var end = nodeOfKey(bat.id + ':neg');

      /* 广度优先给节点分层，用于电流方向动画 */
      var queue = [start];
      levels[start] = 0;
      while (queue.length) {
        var n = queue.shift();
        (adj[n] || []).forEach(function (idx) {
          var e = edges[idx];
          var other = e.a === n ? e.b : e.a;
          if (levels[other] == null) { levels[other] = levels[n] + 1; queue.push(other); }
        });
      }

      var maxPaths = 80;
      var visitedNodes = {};
      visitedNodes[start] = true;
      var stack = [start];

      function dfs(node, pathEdges) {
        if (paths.length >= maxPaths) return;
        if (node === end) {
          paths.push(pathEdges.slice());
          return;
        }
        (adj[node] || []).forEach(function (idx) {
          var e = edges[idx];
          var other = e.a === node ? e.b : e.a;
          if (visitedNodes[other]) return;
          visitedNodes[other] = true;
          pathEdges.push(idx);
          dfs(other, pathEdges);
          pathEdges.pop();
          visitedNodes[other] = false;
        });
      }
      dfs(start, []);

      var sceneType = 'other';
      if (bulbIds.length >= 2) {
        var both = 0, onlyFirst = 0, onlySecond = 0;
        paths.forEach(function (path) {
          var ids = {};
          path.forEach(function (idx) { ids[edges[idx].compId] = true; });
          var hasA = !!ids[bulbIds[0]];
          var hasB = !!ids[bulbIds[1]];
          if (hasA && hasB) both += 1;
          else if (hasA && !hasB) onlyFirst += 1;
          else if (hasB && !hasA) onlySecond += 1;
        });
        if (paths.length && both === paths.length && both > 0) sceneType = 'series';
        else if (onlyFirst > 0 && onlySecond > 0) sceneType = 'parallel';
      } else if (bulbIds.length === 1 && paths.length) {
        sceneType = 'single';
      }
      sceneResult = sceneType;

      paths.forEach(function (path) {
        path.forEach(function (idx) {
          var compId = edges[idx].compId;
          var comp = getComp(scene, compId);
          if (!comp) return;
          if (comp.type === 'ammeter' && meterInfo.ammetersOnPath.indexOf(compId) === -1) {
            meterInfo.ammetersOnPath.push(compId);
          }
        });
      });

      scene.components.forEach(function (comp) {
        if (comp.type !== 'voltmeter') return;
        var vp = nodeOfKey(comp.id + ':plus');
        var vm = nodeOfKey(comp.id + ':minus');
        scene.components.forEach(function (other) {
          if (other.id === comp.id) return;
          var ts = TYPES[other.type].terminals;
          if (ts.length !== 2) return;
          var a = nodeOfKey(other.id + ':' + ts[0].id);
          var b = nodeOfKey(other.id + ':' + ts[1].id);
          if ((a === vp && b === vm) || (a === vm && b === vp)) {
            meterInfo.voltmeterAcross[comp.id] = other.id;
          }
        });
      });

    }

    return {
      scene: sceneResult,
      paths: paths,
      bulbIds: bulbIds,
      meterInfo: meterInfo,
      levels: levels,
      edges: edges
    };
  }

  SL.circuit = {
    TYPES: TYPES,
    BULB_R: BULB_R,
    BULB_RATED_P: BULB_RATED_P,
    create: create,
    solve: solve,
    syncIds: syncIds,
    terminalPoint: terminalPoint,
    terminalKey: terminalKey,
    getComp: getComp,
    connectedTerminals: connectedTerminals,
    rheostatInfo: rheostatInfo,
    resetIds: function () { seq = 0; }
  };
})();
