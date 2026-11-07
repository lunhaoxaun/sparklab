/* 刚体沙盒引擎：Matter.js 0.20.0 的薄封装
   ------------------------------------------------------------
   职责边界：
   1) 建世界（重力、迭代次数、固定步长推进），对外只暴露 create/addBody/addStatic/
      addJoint/removeBody/step/setGrab/clearGrab/destroy 等原子操作；
   2) 把「复杂装置」装配成多个独立刚体 + Constraint（禁止用 Body.create({parts})，
      它的 autoHull 会生成隐形凸包，把砝码架在空气上）；
   3) 换算成初中物理量（1 px = 1 cm、g = 10 N/kg），供读数面板使用。

   绘制不在这里做：页面用 SL.sim.Stage 的 SVG 自绘 body.vertices，
   不用 Matter.Render（create({engine}) 会深拷贝循环引用而爆栈）。 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  var STEP = 1000 / 60;      /* 固定步长，保证可复现 */
  var MASS_TO_KG = 0.05;     /* Matter 质量单位 → kg */
  var MASS_TO_G = 50;        /* Matter 质量单位 → g */
  var G = 10;                /* 初中口径 g = 10 N/kg */
  var PX_PER_M = 100;        /* 1 px = 1 cm */
  var COLUMN_CAT = 4;        /* 立柱专用碰撞类别：横梁不与立柱碰撞 */

  function M() { return window.Matter; }
  function finite(n) { return typeof n === 'number' && isFinite(n); }

  /* ---------- 单位换算 ---------- */
  function massKg(body) { return body && body.mass ? body.mass * MASS_TO_KG : 0; }
  function massG(body) { return body && body.mass ? body.mass * MASS_TO_G : 0; }
  /* Matter 的 speed 是「每步多少像素」，量纲换算法：
     1 px = 1 cm，每步 1/60 s → v(m/s) = speed × 0.01 × 60 = speed × 60 / PX_PER_M */
  function speedMs(body) {
    return body && finite(body.speed) ? body.speed * 60 / PX_PER_M : 0;
  }

  function create(canvas) {
    var matter = M();
    if (!matter) throw new Error('缺少 Matter.js（assets/js/vendor/matter.min.js）');

    var bounds = { w: 900, h: 520 };
    if (canvas && canvas.width) { bounds.w = canvas.width; bounds.h = canvas.height; }
    else if (canvas && canvas.w) { bounds.w = canvas.w; bounds.h = canvas.h; }

    var engine = matter.Engine.create({ gravity: { x: 0, y: 1 } });
    engine.positionIterations = 12;
    engine.velocityIterations = 10;
    engine.constraintIterations = 6;
    /* 静止的刚体会休眠：否则托盘上的砝码永远有 0.1 m/s 级的微抖动，
       读数里「总动能」会一直挂着几十毫焦，看起来像在动。 */
    engine.enableSleeping = true;

    var seq = 0;
    var state = {
      destroyed: false,
      broken: false,
      acc: 0,
      steps: 0,
      bodies: [],
      groups: {},
      grab: null
    };
    var world = engine.world;

    /* ---------- 新增刚体 ---------- */
    function bodyOptions(spec) {
      var conf = {
        isStatic: !!spec.isStatic,
        density: spec.density == null ? 0.002 : spec.density,
        friction: spec.friction == null ? 0.7 : spec.friction,
        frictionStatic: spec.frictionStatic == null ? 1 : spec.frictionStatic,
        frictionAir: spec.frictionAir == null ? 0.004 : spec.frictionAir,
        restitution: spec.restitution == null ? 0 : spec.restitution,
        angle: spec.angle || 0,
        label: spec.label || spec.role || 'rb'
      };
      if (spec.collisionFilter) conf.collisionFilter = spec.collisionFilter;
      return conf;
    }

    function addBody(spec) {
      if (state.destroyed || !spec) return null;
      var m = M();
      var conf = bodyOptions(spec);
      var body;
      if (spec.type === 'circle') {
        body = m.Bodies.circle(spec.x, spec.y, spec.r || 16, conf);
      } else if (spec.type === 'polygon') {
        body = m.Bodies.polygon(spec.x, spec.y, spec.sides || 5, spec.r || 20, conf);
      } else {
        body = m.Bodies.rectangle(spec.x, spec.y, spec.w || 40, spec.h || 40, conf);
      }
      /* sl：绘图与读数用的元信息（与 Matter 自身字段分开，避免污染求解） */
      body.sl = {
        role: spec.role || 'block',
        tone: spec.tone || 0,
        shape: spec.shape || null,
        group: spec.group || null,
        w: spec.w, h: spec.h, r: spec.r
      };
      if (spec.group && state.groups[spec.group]) {
        var group = state.groups[spec.group];
        group.bodies.push(body);
        if (spec.role) group.parts[spec.role] = body;
      }
      state.bodies.push(body);
      m.Composite.add(world, body);
      return body;
    }

    function addStatic(spec) {
      var copy = {};
      Object.keys(spec || {}).forEach(function (k) { copy[k] = spec[k]; });
      copy.isStatic = true;
      return addBody(copy);
    }

    function addJoint(a, b, options) {
      if (state.destroyed) return null;
      var m = M();
      var o = options || {};
      var conf = {
        length: o.length == null ? 0 : o.length,
        stiffness: o.stiffness == null ? 1 : o.stiffness,
        damping: o.damping == null ? 0.2 : o.damping,
        pointA: o.pointA || { x: 0, y: 0 },
        pointB: o.pointB || { x: 0, y: 0 }
      };
      if (a) conf.bodyA = a;
      if (b) conf.bodyB = b;
      var joint = m.Constraint.create(conf);
      joint.sl = { role: o.role || 'joint' };
      m.Composite.add(world, joint);
      return joint;
    }

    function group(id) { return state.groups[id] || null; }

    function newGroup(type, meta) {
      seq += 1;
      var g = {
        id: 'g' + seq,
        type: type,
        meta: meta || {},
        parts: {},
        bodies: []
      };
      state.groups[g.id] = g;
      return g;
    }

    function dropBody(body) {
      var m = M();
      if (!body) return false;
      var idx = state.bodies.indexOf(body);
      if (idx >= 0) state.bodies.splice(idx, 1);
      if (body.sl && body.sl.group && state.groups[body.sl.group]) {
        var g = state.groups[body.sl.group];
        var gi = g.bodies.indexOf(body);
        if (gi >= 0) g.bodies.splice(gi, 1);
        Object.keys(g.parts).forEach(function (role) {
          if (g.parts[role] === body) delete g.parts[role];
        });
      }
      /* 连带删掉挂在这个刚体上的约束，否则约束会拖着一个已移出世界的 body 求解 */
      m.Composite.allConstraints(world).forEach(function (c) {
        if (c.bodyA === body || c.bodyB === body) m.Composite.remove(world, c);
      });
      m.Composite.remove(world, body);
      return true;
    }

    function removeBody(body) { return dropBody(body); }

    function removeGroup(id) {
      var g = state.groups[id];
      if (!g) return false;
      g.bodies.slice().forEach(dropBody);
      delete state.groups[id];
      return true;
    }

    function clear() {
      var m = M();
      m.Composite.allConstraints(world).slice().forEach(function (c) { m.Composite.remove(world, c); });
      m.Composite.allBodies(world).slice().forEach(function (b) { m.Composite.remove(world, b); });
      state.bodies = [];
      state.groups = {};
      state.acc = 0;
      state.steps = 0;
      state.broken = false;
      state.grab = null;
      seq = 0;
    }

    /* ---------- 推进 ---------- */
    function guard() {
      for (var i = 0; i < state.bodies.length; i++) {
        var b = state.bodies[i];
        if (!finite(b.position.x) || !finite(b.position.y) || !finite(b.angle)) {
          state.broken = true;
          return false;
        }
      }
      return true;
    }

    /* 托盘「始终保持水平」：真实的托盘天平，托盘挂在平行连杆吊架上，转动自由度
       被机构锁死，只能上下平移。这里每步把托盘的转角锁回 0 —— 若放任它转动，
       砝码会在微小的倾角上一点点往外滑，滑出去的重量又会把摆动越推越大
       （实测 5 s 时托盘还平，15 s 就漂到 ±17°）。 */
    function levelPans() {
      var m = M();
      Object.keys(state.groups).forEach(function (id) {
        var g = state.groups[id];
        if (!g.meta.level) return;
        [g.parts.panL, g.parts.panR].forEach(function (pan) {
          if (!pan || Math.abs(pan.angle) < 1e-4) return;
          m.Body.setAngle(pan, 0);
          pan.angularVelocity = 0;
        });
      });
    }

    /* 固定步长：对外按毫秒喂，内部永远以 1000/60 推进 */
    function step(dtMs) {
      if (state.destroyed || state.broken) return 0;
      var m = M();
      var dt = dtMs == null ? STEP : dtMs;
      if (!finite(dt) || dt <= 0) return 0;
      state.acc += Math.min(dt, 200);       /* 卡顿保护：单帧最多补 200 ms */
      var n = 0;
      while (state.acc >= STEP - 1e-6 && n < 6) {
        m.Engine.update(engine, STEP);
        levelPans();
        state.acc -= STEP;
        state.steps += 1;
        n += 1;
        if (!guard()) break;
      }
      if (n >= 6) state.acc = 0;
      /* 清掉浮点残余：否则 step(1000/60) 连调会交替出现 0 步 / 2 步 */
      if (Math.abs(state.acc) < 1e-3) state.acc = 0;
      return n;
    }

    /* ---------- 抓取（拖动物体） ---------- */
    function setGrab(body, point) {
      if (state.destroyed || !body || body.isStatic || !point) return false;
      var m = M();
      clearGrab();
      var dx = point.x - body.position.x;
      var dy = point.y - body.position.y;
      var a = -body.angle;
      var local = {
        x: dx * Math.cos(a) - dy * Math.sin(a),
        y: dx * Math.sin(a) + dy * Math.cos(a)
      };
      var joint = m.Constraint.create({
        pointA: { x: point.x, y: point.y },
        bodyB: body,
        pointB: local,
        length: 0,
        stiffness: 0.18,
        damping: 0.12
      });
      m.Composite.add(world, joint);
      m.Sleeping.set(body, false);
      state.grab = { body: body, joint: joint, point: { x: point.x, y: point.y } };
      return true;
    }

    function moveGrab(point) {
      if (!state.grab || !point) return false;
      state.grab.joint.pointA = { x: point.x, y: point.y };
      state.grab.point = { x: point.x, y: point.y };
      return true;
    }

    function clearGrab() {
      if (!state.grab) return false;
      var m = M();
      m.Composite.remove(world, state.grab.joint);
      state.grab = null;
      return true;
    }

    /* ---------- 整组平移（拖动静态机架时用，只做水平移动，避免浮空） ---------- */
    function moveGroup(id, dx, dy) {
      var g = state.groups[id];
      if (!g) return false;
      var m = M();
      g.bodies.forEach(function (b) {
        m.Body.setPosition(b, { x: b.position.x + dx, y: b.position.y + dy });
        if (!b.isStatic) m.Sleeping.set(b, false);
      });
      return true;
    }

    function setGravity(v) {
      engine.gravity.y = v;
      var m = M();
      state.bodies.forEach(function (b) { if (!b.isStatic) m.Sleeping.set(b, false); });
    }

    /* ---------- 质量 / 密度 ---------- */
    function setMassG(body, grams) {
      if (!body || body.isStatic) return false;
      var m = M();
      var mass = Math.max(1, grams) / MASS_TO_G;
      m.Body.setMass(body, mass);
      if (body.sl && body.sl.lockRot) lockRotation(body);
      m.Sleeping.set(body, false);
      return true;
    }

    function setDensityG(body, gPerCm2) {
      if (!body || body.isStatic) return false;
      var m = M();
      m.Body.setDensity(body, Math.max(0.001, gPerCm2) / MASS_TO_G);
      if (body.sl && body.sl.lockRot) lockRotation(body);
      m.Sleeping.set(body, false);
      return true;
    }

    /* ---------- 查询 ---------- */
    function bodies() { return state.bodies.slice(); }
    function groups() {
      return Object.keys(state.groups).map(function (id) { return state.groups[id]; });
    }
    function count() { return state.bodies.length; }

    function pick(point) {
      for (var i = state.bodies.length - 1; i >= 0; i--) {
        var b = state.bodies[i];
        if (M().Vertices.contains(b.vertices, point)) return b;
      }
      return null;
    }

    /* 托盘上的载重：沿「接触 + 约束」把整条支承链上的刚体找出来累加质量。
       只按几何（压在盘面上方）判断会漏掉挂在托盘上的整套装置 ——
       比如把一台小天平放上去，只有底座在盘面高度，横梁和托盘是吊在下面的。 */
    function supportGraph() {
      var adj = {};
      function link(a, b) {
        if (!a || !b) return;
        (adj[a.id] = adj[a.id] || []).push(b);
        (adj[b.id] = adj[b.id] || []).push(a);
      }
      (engine.pairs.list || []).forEach(function (p) {
        if (p.isActive) link(p.bodyA, p.bodyB);
      });
      M().Composite.allConstraints(world).forEach(function (c) { link(c.bodyA, c.bodyB); });
      return adj;
    }

    function panLoad(group, pan, adj) {
      if (!pan) return { mass: 0, items: 0 };
      var seen = {};
      var queue = [pan];
      var total = 0, items = 0;
      seen[pan.id] = true;
      while (queue.length) {
        var cur = queue.shift();
        var next = adj[cur.id] || [];
        for (var i = 0; i < next.length; i++) {
          var b = next[i];
          if (!b || seen[b.id]) continue;
          seen[b.id] = true;
          if (b.sl && b.sl.group === group.id) continue;   /* 本装置自己的零件不算载重 */
          if (b.isStatic) continue;                        /* 地面/止挡不是负载，也不往下穿 */
          total += massKg(b);
          items += 1;
          queue.push(b);
        }
      }
      return { mass: total, items: items };
    }

    function balanceInfo(g, adj) {
      var beam = g.parts.beam;
      var armCm = g.meta.arm || 0;
      var armM = armCm / PX_PER_M;
      var l = panLoad(g, g.parts.panL, adj);
      var r = panLoad(g, g.parts.panR, adj);
      var panL = massKg(g.parts.panL), panR = massKg(g.parts.panR);
      var torqueL = (panL + l.mass) * G * armM;
      var torqueR = (panR + r.mass) * G * armM;
      var tolerance = 0.04 + 0.03 * Math.max(torqueL, torqueR);
      return {
        id: g.id,
        type: g.type,
        angle: beam ? beam.angle * 180 / Math.PI : 0,
        armCm: armCm,
        torqueL: torqueL,
        torqueR: torqueR,
        loadL: l.mass,
        loadR: r.mass,
        balanced: Math.abs(torqueL - torqueR) <= tolerance,
        heavier: torqueL > torqueR ? 'left' : 'right'
      };
    }

    function readStats() {
      var dynamicCount = 0, kinetic = 0, maxSpeed = 0;
      var byType = {};
      state.bodies.forEach(function (b) {
        if (!b.isStatic) {
          dynamicCount += 1;
          var v = speedMs(b);
          /* 静止场景里托盘仍有 0.3 px/步 级的微抖动，读数上按静止处理（2 cm/s 以下） */
          if (v < 0.02) v = 0;
          if (v > maxSpeed) maxSpeed = v;
          kinetic += 0.5 * massKg(b) * v * v;
        }
      });
      groups().forEach(function (g) { byType[g.type] = (byType[g.type] || 0) + 1; });
      var contacts = 0;
      /* 休眠的刚体不再产生 collisionActive，但接触对还在 —— 两边都在休眠时也算一对，
         否则「一摞物块放稳了」反而显示 0 对接触 */
      (engine.pairs.list || []).forEach(function (p) {
        if (p.isActive || (p.bodyA.isSleeping && p.bodyB.isSleeping)) contacts += 1;
      });
      var adj = supportGraph();
      return {
        count: dynamicCount,
        all: state.bodies.length,
        contacts: contacts,
        kinetic: kernel(kinetic),
        maxSpeed: maxSpeed,
        steps: state.steps,
        broken: state.broken,
        devices: byType,
        balances: groups().filter(function (g) {
          return g.parts.beam && (g.type === 'balance' || g.type === 'stackBalance');
        }).map(function (g) { return balanceInfo(g, adj); })
      };
    }

    function kernel(n) { return finite(n) ? n : 0; }

    function destroy() {
      if (state.destroyed) return true;
      clearGrab();
      clear();
      M().Engine.clear(engine);
      state.destroyed = true;
      engine = null;
      world = null;
      return true;
    }

    return {
      engine: engine,
      bounds: bounds,
      addBody: addBody,
      addStatic: addStatic,
      addJoint: addJoint,
      removeBody: removeBody,
      removeGroup: removeGroup,
      newGroup: newGroup,
      group: group,
      groups: groups,
      bodies: bodies,
      count: count,
      pick: pick,
      step: step,
      clear: clear,
      destroy: destroy,
      setGrab: setGrab,
      moveGrab: moveGrab,
      clearGrab: clearGrab,
      moveGroup: moveGroup,
      setGravity: setGravity,
      gravity: function () { return engine ? engine.gravity.y : 1; },
      setMassG: setMassG,
      setDensityG: setDensityG,
      readStats: readStats,
      isDestroyed: function () { return state.destroyed; }
    };
  }

  /* 托盘锁死转动：真实的托盘天平，托盘挂在平行连杆吊架上，只有平移没有转动。
     转动惯量给到 1e12 后，任何力矩都转不动它（求解器用 inverseInertia=1e-12），
     比「每步把角度掰回 0」稳得多 —— 每步硬掰会在接触面上产生棘轮效应，
     砝码会一格一格往外挪，十几秒后从托盘上滑下去。 */
  function lockRotation(body) {
    if (!body) return body;
    var m = window.Matter;
    m.Body.setInertia(body, 1e12);
    body.angularVelocity = 0;
    if (body.sl) body.sl.lockRot = true;
    return body;
  }

  /* ============================================================
     装置库：每个装置 = 一组独立刚体 + 约束
     锚点约定：balance / ramp 的 y 是「落地高度」，block 与 stackBalance 的 y 是
     部件当前中心/底面，方便从存档精确复原。
     ============================================================ */
  function buildBalance(rigid, x, floorY, options) {
    var o = options || {};
    var s = o.scale || 1;
    /* hang 必须让「托盘面 → 横梁底」的净空 > 最大物块高度（40 px），
       否则砝码被横梁和托盘夹住、横着挤出去（hang=46 时净空只有 36.5，实测会把砝码弹到一边） */
    var arm = 116 * s, beamH = 9 * s, panW = 100 * s, panH = 10 * s, hang = 74 * s;
    var baseW = 150 * s, baseH = 12 * s, colW = 14 * s, colH0 = 130 * s;
    var g = rigid.newGroup('balance', {
      arm: arm, panW: panW, panH: panH, hang: hang, scale: s, level: true,
      anchor: { x: x, y: floorY }
    });
    var baseTop = floorY - baseH;
    var pivotY = baseTop - colH0;
    /* 刀口在横梁中心「上方」：横梁重心因此落在支点下方，
       两端等重时会自己回到水平（真实天平的配重就是这个道理）。
       若把刀口开在重心上，横梁就是随遇平衡 —— 被磕一下会停在任意角度。 */
    var hingeOff = beamH / 2 + 8 * s;
    var colTop = pivotY - hingeOff;
    var colH = baseTop - colTop;

    rigid.addStatic({
      type: 'box', x: x, y: floorY - baseH / 2, w: baseW, h: baseH,
      friction: 0.9, group: g.id, role: 'base'
    });
    /* 立柱顶伸到刀口（横梁中心上方），会和横梁「穿」在一起：
       给立柱单独一个碰撞类别、横梁的掩码里剔掉它，两者只靠约束相连，不产生碰撞。 */
    var col = rigid.addStatic({
      type: 'box', x: x, y: colTop + colH / 2, w: colW, h: colH,
      friction: 0.6, group: g.id, role: 'column',
      collisionFilter: { category: COLUMN_CAT, mask: -1 }
    });
    var beam = rigid.addBody({
      type: 'box', x: x, y: pivotY, w: arm * 2 + 8 * s, h: beamH,
      density: 0.005, friction: 0.8, group: g.id, role: 'beam',
      collisionFilter: { category: 1, mask: -1 & ~COLUMN_CAT }
    });
    /* 刀口：横梁挂在立柱顶（零长度点约束） */
    rigid.addJoint(col, beam, {
      pointA: { x: 0, y: -colH / 2 }, pointB: { x: 0, y: -hingeOff },
      stiffness: 1, damping: 0.05, role: 'pivot'
    });

    [-1, 1].forEach(function (side) {
      var pan = rigid.addBody({
        type: 'box', x: x + side * arm, y: pivotY + hang, w: panW, h: panH,
        density: 0.0022, friction: 0.9, frictionAir: 0.05,
        group: g.id, role: side < 0 ? 'panL' : 'panR'
      });
      lockRotation(pan);
      /* 托盘「挂」在横梁端点：连接点随梁转动，托盘靠重力保持水平。
         注意 damping 必须是 0 —— Matter 的约束阻尼会额外给托盘施加角阻尼，
         配上锁死的转动惯量就会变成横向的「棘轮」，十几秒把砝码推出托盘。 */
      rigid.addJoint(beam, pan, {
        pointA: { x: side * arm, y: 0 }, pointB: { x: 0, y: -hang },
        stiffness: 1, damping: 0, role: 'sling'
      });
    });

    /* 机架限位：托盘下方 12 px 的静态止挡柱，等效把倾角限制在约 6°。
       止挡下面补一段短支柱接到底座，否则画面上就是一根「悬空的白条」 */
    if (o.stops !== false) {
      var stopTop = pivotY + hang + panH / 2 + 12 * s;
      var stopH = 10 * s;
      var postTop = stopTop + stopH;
      var postH = (baseTop - postTop);
      [-1, 1].forEach(function (side) {
        rigid.addStatic({
          type: 'box', x: x + side * arm, y: stopTop + stopH / 2,
          w: panW - 10 * s, h: stopH,
          friction: 0.5, group: g.id, role: side < 0 ? 'stopL' : 'stopR'
        });
        if (postH > 6) {
          rigid.addStatic({
            type: 'box', x: x + side * arm, y: postTop + postH / 2,
            w: 8 * s, h: postH, group: g.id, role: 'post'
          });
        }
      });
    }
    return g;
  }

  /* 可叠放的小天平：底座是动态刚体，所以能整体放到另一台天平的托盘上。
     底座做成 56×40 的厚墩（不另设立柱，省掉一组会晃的铰接），
     托盘挂在底座两侧、底面之上 5 px，保证整台装置「脚底」干净、放得稳。 */
  function buildStackBalance(rigid, x, bottomY, options) {
    var o = options || {};
    var baseW = 56, baseH = 40, arm = 54, beamH = 9, panW = 40, panH = 10, hang = 36;
    var g = rigid.newGroup('stackBalance', {
      arm: arm, panW: panW, panH: panH, hang: hang, scale: 1, level: true,
      anchor: { x: x, y: bottomY }
    });
    var baseTop = bottomY - baseH;
    var pivotY = baseTop - 6;

    var base = rigid.addBody({
      type: 'box', x: x, y: bottomY - baseH / 2, w: baseW, h: baseH,
      density: 0.004, friction: 0.9, group: g.id, role: 'base'
    });
    var beam = rigid.addBody({
      type: 'box', x: x, y: pivotY, w: arm * 2 + 8, h: beamH,
      density: 0.0016, friction: 0.8, group: g.id, role: 'beam'
    });
    rigid.addJoint(base, beam, {
      pointA: { x: 0, y: -(baseH / 2 + 6) }, pointB: { x: 0, y: 0 },
      stiffness: 1, damping: 0.05, role: 'pivot'
    });
    [-1, 1].forEach(function (side) {
      var pan = rigid.addBody({
        type: 'box', x: x + side * arm, y: pivotY + hang, w: panW, h: panH,
        density: 0.0022, friction: 0.9, frictionAir: 0.05,
        group: g.id, role: side < 0 ? 'panL' : 'panR'
      });
      lockRotation(pan);
      rigid.addJoint(beam, pan, {
        pointA: { x: side * arm, y: 0 }, pointB: { x: 0, y: -hang },
        stiffness: 1, damping: 0, role: 'sling'
      });
    });
    return g;
  }

  function buildBlock(rigid, x, y, options) {
    var o = options || {};
    var w = o.w || 40, h = o.h || 40;
    var g = rigid.newGroup(o.type || 'block', { w: w, h: h, anchor: { x: x, y: y } });
    rigid.addBody({
      type: 'box', x: x, y: y, w: w, h: h,
      density: o.density || 0.002, friction: o.friction == null ? 0.7 : o.friction,
      restitution: o.restitution || 0,       angle: o.angle || 0,
      group: g.id, role: 'block', tone: o.tone || 0, shape: o.shape || null
    });
    return g;
  }

  /* 静态斜面 / 挡板：y 是落地高度，按旋转后的包围盒贴地，绝不浮空 */
  function buildRamp(rigid, x, floorY, options) {
    var o = options || {};
    var len = o.len || 220, thick = o.thick || 10;
    var deg = o.angle == null ? 22 : o.angle;
    var rad = deg * Math.PI / 180;
    var lift = (Math.abs(Math.sin(rad)) * len + Math.abs(Math.cos(rad)) * thick) / 2;
    var cy = floorY - lift;
    var g = rigid.newGroup(o.type || 'ramp', {
      len: len, thick: thick, angle: deg, anchor: { x: x, y: floorY }
    });
    rigid.addStatic({
      type: 'box', x: x, y: cy, w: len, h: thick, angle: rad,
      friction: 0.8, group: g.id, role: 'ramp'
    });
    /* 高端的支撑腿：让斜面看起来是架起来的，而不是凌空 */
    if (o.prop !== false && Math.abs(deg) > 4 && Math.abs(deg) < 86) {
      var highX = x - Math.cos(rad) * (len / 2 - 14);
      var highY = cy - Math.sin(rad) * (len / 2 - 14) + thick / 2;
      var hgt = floorY - highY;
      if (hgt > 8) {
        rigid.addStatic({
          type: 'box', x: highX, y: floorY - hgt / 2, w: 10, h: hgt,
          friction: 0.4, group: g.id, role: 'prop'
        });
      }
    }
    return g;
  }

  SL.rigid = {
    STEP: STEP,
    MASS_TO_KG: MASS_TO_KG,
    MASS_TO_G: MASS_TO_G,
    G: G,
    PX_PER_M: PX_PER_M,
    create: create,
    massKg: massKg,
    massG: massG,
    speedMs: speedMs,
    kgToMass: function (kg) { return kg / MASS_TO_KG; },
    gToMass: function (g) { return g / MASS_TO_G; },
    devices: {
      balance: buildBalance,
      stackBalance: buildStackBalance,
      block: buildBlock,
      ramp: buildRamp
    }
  };
})();
