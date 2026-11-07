/* 数学绘图器 · C++ 判断脚本语法详解（应用内帮助页）
   ---------------------------------------------------------------
   SL.math.help.open()        用 SL.modal 打开 10 节可折叠详解
   SL.math.help.QUICKREF_HTML 右栏速查片段（优先级表 + 常用属性 + 常用函数）

   内容与 .trae/documents/C++判断脚本语法详解.md 保持同步；
   示例代码块带「复制」按钮，剪贴板不可用时退化为选中文本，不抛异常。
   依赖：SL.modal / SL.el（core/utils.js）。样式自带，离线可用。
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var SL = (window.SparkLab = window.SparkLab || {});
  SL.math = SL.math || {};

  /* ---------- 小工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function p(s) { return '<p>' + s + '</p>'; }
  function note(s) { return '<p class="mh-note">' + s + '</p>'; }
  function code(src) { return '<pre class="mh-code"><code>' + esc(src) + '</code></pre>'; }

  function ul(items) {
    var out = '<ul class="mh-list">';
    for (var i = 0; i < items.length; i += 1) out += '<li>' + items[i] + '</li>';
    return out + '</ul>';
  }

  function ol(items) {
    var out = '<ol class="mh-list">';
    for (var i = 0; i < items.length; i += 1) out += '<li>' + items[i] + '</li>';
    return out + '</ol>';
  }

  function tbl(head, rows) {
    var out = '<table class="mh-table"><thead><tr>';
    for (var i = 0; i < head.length; i += 1) out += '<th>' + head[i] + '</th>';
    out += '</tr></thead><tbody>';
    for (var r = 0; r < rows.length; r += 1) {
      out += '<tr>';
      for (var c = 0; c < rows[r].length; c += 1) out += '<td>' + rows[r][c] + '</td>';
      out += '</tr>';
    }
    return out + '</tbody></table>';
  }

  function sub(s) { return '<p class="mh-sub">' + s + '</p>'; }

  /* ============================================================
     10 节内容
     ============================================================ */
  var SECTIONS = [];

  SECTIONS.push({
    title: '1. 运行模型',
    html:
      p('在哪里写：进入「数学绘图器」工作台，右栏下半部分是脚本编辑器，下面是输出区（<code>print</code> 的日志与 <code>pass/fail</code> 的判定结果）。') +
      ul([
        '<b>什么时候执行</b>：点「运行」立即执行一次；勾选「自动运行」时，场景变化（拖动自由点、改参数、增删对象）后约 60ms 自动重跑，避免拖动中刷屏。',
        '<b>作用域</b>：每次运行都从<b>全新的空作用域</b>开始，变量不会留到下一次；变量只在声明的块 <code>{ }</code> 内有效；同一作用域重复声明报错，内层块可以同名遮蔽。',
        '<b>属性持久化</b>：<code>color</code>、<code>visible</code>、<code>num</code>、<code>ok</code>、<code>msg</code> 以及自由点的 <code>x</code>、<code>y</code> 会写进场景并保存，刷新后仍在；<b>变量不持久化</b>。',
        '<b>自动运行开关</b>：自动运行期间，脚本自己改属性不会再触发一次运行；调脚本时建议先关掉。',
        '<b>没有 main()</b>：脚本本身就是程序体，从第一行顺序执行到最后一行，没有函数、没有 <code>return</code>、没有命令行参数。'
      ]) +
      code('// 最简单的脚本：只在输出区打印一句话\nprint("Hello, 数学绘图器");')
  });

  SECTIONS.push({
    title: '2. 词法',
    html:
      tbl(['元素', '写法', '说明'], [
        ['行注释', '<code>// 说明</code>', '到行尾为止'],
        ['块注释', '<code>/* 说明 */</code>', '可以跨行，<b>不支持嵌套</b>'],
        ['整数', '<code>123</code>、<code>0</code>、<code>42</code>', '十进制'],
        ['小数', '<code>1.5</code>、<code>.5</code>', '允许省略前导 0'],
        ['科学计数', '<code>1e-3</code>、<code>2E3</code>', '等于 0.001、2000'],
        ['字符串', '<code>"红色"</code>、<code>"#2a63e8"</code>', '只能用双引号'],
        ['字符串转义', '<code>\\"</code>、<code>\\\\</code>、<code>\\n</code>、<code>\\t</code>、<code>\\r</code>', '引号、反斜杠、换行、制表、回车'],
        ['布尔', '<code>true</code>、<code>false</code>', '小写，不能写 <code>True</code>'],
        ['标识符', '<code>n</code>、<code>total</code>、<code>AB</code>、<code>l1</code>', '字母或下划线开头，区分大小写'],
        ['颜色写法', '<code>"red"</code>、<code>"teal"</code>、<code>"#f00"</code>、<code>"#2a63e8"</code>', '颜色就是普通字符串'],
        ['语句结束', '<code>;</code>', '每条语句结尾必须写'],
        ['空白缩进', '空格、换行、Tab', '随便排，不影响语义']
      ]) +
      note('单引号字符串不支持（<code>\'red\'</code> 会报「字符串请用双引号」）；字符串不能跨行，换行写 <code>\\n</code>；不支持 <code>#include</code>、<code>using namespace std;</code>、<code>cout</code> / <code>cin</code>。') +
      code('// 行注释：声明几个变量\n/* 块注释：\n   可以写好几行 */\ndouble half = 0.5;              // .5 也行\nstring color = "#2a63e8";       // 颜色写法\nstring tip = "第一行\\n第二行";    // 转义换行\nprint(tip);')
  });

  SECTIONS.push({
    title: '3. 类型与声明',
    html:
      tbl(['类型', '用途', '默认值', '赋值时怎么转换'], [
        ['<code>int</code>', '整数', '<code>0</code>', '先转数字，再<b>向 0 截断</b>取整；NaN / Infinity 变 0'],
        ['<code>double</code>', '小数', '<code>0</code>', '转成数字（Number）'],
        ['<code>float</code>', '小数', '<code>0</code>', '与 double 完全相同（不模拟单精度误差）'],
        ['<code>bool</code>', '真 / 假', '<code>false</code>', '非 0 数字、非空字符串为 true'],
        ['<code>string</code>', '文本', '<code>""</code>', '数字按原样，布尔转 "true" / "false"']
      ]) +
      ul([
        '<b>先声明后使用</b>：没声明就写 <code>n = 3;</code> 会报「变量 n 还没有声明，不能赋值」。',
        '<b>同一作用域不能重复声明</b>：<code>int a = 1; int a = 2;</code> 报错；内层块可以同名遮蔽。',
        '<b>赋值按左边类型转换</b>：<code>int k = 7 / 2;</code> 得 3（先算 3.5 再截断），<code>double d = 7 / 2;</code> 得 3.5。',
        '所有算术都按 <code>double</code> 进行，int 不参与整型除法，也没有 32 位溢出。'
      ]) +
      code('int n = 2;                 // 声明并初始化\nint a, b = 3, c;           // a=0、b=3、c=0\ndouble length = 0.0;\nbool ok = false;\nstring name = "ABC";') +
      code('int n = 7 / 2;          // 3（先算 3.5，再截断）\ndouble d = 7 / 2;       // 3.5\nint m = -2.8;           // -2（向 0 截断）\nbool b = 0.5;           // true（非 0）\nbool z = "";            // false（空字符串）\nstring s = 3.5;         // "3.5"\nprint(n, d, m, b, z, s);')
  });

  SECTIONS.push({
    title: '4. 语句',
    html:
      tbl(['语句', '写法', '说明'], [
        ['块', '<code>{ ... }</code>', '形成新的作用域'],
        ['条件', '<code>if (条件) 语句 else if (条件) 语句 else 语句</code>', 'else 跟最近的未配对 if 结合'],
        ['当型循环', '<code>while (条件) 语句</code>', '条件为真时反复执行'],
        ['计数循环', '<code>for (初始化; 条件; 步进) 语句</code>', '三段都可空，<code>for (;;)</code> 会被预算掐断'],
        ['跳出', '<code>break;</code>', '结束当前这一层循环'],
        ['继续', '<code>continue;</code>', '跳过本次剩余语句，直接进入下一次判断'],
        ['空语句', '<code>;</code>', '什么都不做'],
        ['表达式语句', '<code>n = n + 1;</code>、<code>i++;</code>、<code>print(x);</code>', '最常见的语句']
      ]) +
      note('分支或循环体只有一条语句时可以不写花括号，但建议始终写；<code>break</code> / <code>continue</code> 只能出现在循环里。') +
      code('// 奇数的累加：1+3+5+7+9 = 25\nint sum = 0;\nfor (int i = 1; i <= 100; i++) {\n    if (i % 2 == 0) continue;   // 偶数跳过\n    if (i > 9) break;           // 超过 9 就收工\n    sum += i;\n}\nprint(sum);') +
      code('// while 版：找到第一个平方大于 50 的整数\nint k = 0;\nwhile (true) {\n    k++;\n    if (k * k > 50) break;\n}\nprint(k);      // 8')
  });

  SECTIONS.push({
    title: '5. 表达式与优先级',
    html:
      tbl(['优先级', '运算符', '结合方向'], [
        ['1', '<code>( )</code> 括号、函数调用 <code>f(...)</code>、成员访问 <code>obj.prop</code>', '左'],
        ['2', '后缀 <code>++</code> <code>--</code>', '左'],
        ['3', '前缀 <code>++</code> <code>--</code>', '右'],
        ['4', '一元 <code>!</code> <code>-</code> <code>+</code>', '右'],
        ['5', '<code>*</code> <code>/</code> <code>%</code>', '左'],
        ['6', '<code>+</code> <code>-</code>', '左'],
        ['7', '<code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code>', '左'],
        ['8', '<code>==</code> <code>!=</code>', '左'],
        ['9', '<code>&amp;&amp;</code>', '左'],
        ['10', '<code>||</code>', '左'],
        ['11', '<code>? :</code> 三目', '右'],
        ['12', '<code>=</code> <code>+=</code> <code>-=</code> <code>*=</code> <code>/=</code>', '右']
      ]) +
      ul([
        '<b>短路</b>：<code>&amp;&amp;</code> 左边为假不再算右边；<code>||</code> 左边为真不再算右边；<code>? :</code> 只算命中的分支。',
        '<b>数值规则</b>：<code>+ - * /</code> 都按小数算；<code>0/0</code> 得 NaN，<code>1/0</code> 得 Infinity，<code>x % 0</code> 直接报错。',
        '<b>比较</b>：两侧都是字符串按字典序；否则转数字。浮点没有容差，用 <code>near(a, b, eps)</code>。',
        '<b>字符串拼接</b>：<code>+</code> 只要有一侧是字符串就拼接，例如 <code>"长度=" + AB.length</code>。'
      ]) +
      code('print(1 + 2 * 3);            // 7\nprint((1 + 2) * 3);          // 9\nprint(3 > 2 == true);        // true（先算 3>2，再和 true 比）\nprint(true ? "是" : "否");     // 是\nprint("AB=" + 5);            // AB=5\nprint(near(0.1 + 0.2, 0.3)); // true')
  });

  SECTIONS.push({
    title: '6. 对象与属性',
    html:
      p('场景里的每个对象都用<b>标签</b>当变量名直接访问：') +
      ul([
        '点：<code>A</code>、<code>B</code>、<code>C</code>……',
        '线段：<code>AB</code>、<code>CD</code>（两个端点标签按字典序拼接）',
        '直线 <code>l1</code>、<code>l2</code>；圆 <code>c1</code>；多边形 <code>poly1</code>；函数图像 <code>f</code>',
        '中点：<code>M1</code>、<code>M2</code>……；交点：<code>X1</code>、<code>X2</code>……（<b>带前缀</b>，不是 C、E）'
      ]) +
      note('名字区分大小写。<b>查找顺序</b>：局部变量 → 场景对象 → 内置名，所以 <code>int pi = 3;</code> 会遮住常数 pi。成员访问<b>只支持一层</b>：<code>AB.length</code> 可以，<code>A.x.y</code> 不行。') +
      tbl(['属性', '类型', '说明', '可写'], [
        ['<code>name</code>', 'string', '标签（如 BC）', '否'],
        ['<code>type</code>', 'string', 'point / segment / line / circle / polygon / midpoint / intersection / perpendicular / parallel', '否'],
        ['<code>visible</code>', 'bool', '是否显示', '<b>是</b>'],
        ['<code>color</code>', 'string', '颜色名或 #rrggbb', '<b>是</b>'],
        ['<code>num</code>', 'double', '自定义数值标记，默认 0', '<b>是</b>'],
        ['<code>ok</code>', 'bool', '自定义判定结果', '<b>是</b>'],
        ['<code>msg</code>', 'string', '自定义说明文字', '<b>是</b>'],
        ['<code>x</code> / <code>y</code>', 'double', '坐标；只有自由点可写', '部分'],
        ['<code>length</code>', 'double', '线段长度', '否'],
        ['<code>slope</code>', 'double', '线段 / 直线斜率（竖直为 Infinity）', '否'],
        ['<code>radius</code>', 'double', '圆半径', '否'],
        ['<code>circumference</code>', 'double', '圆周长', '否'],
        ['<code>area</code>', 'double', '圆 / 多边形面积', '否'],
        ['<code>perimeter</code>', 'double', '多边形周长', '否'],
        ['<code>eval(x)</code>', 'method', '仅函数图像对象，求 f(x)', '否']
      ]) +
      note('写只读属性会报「属性只读: name」；<b>没有 angle 属性</b>，线段倾角用 <code>deg(atan(AB.slope))</code> 自己算。') +
      code('// 用户最常用的写法：靠 num 控制颜色\nif (BC.num == 2) BC.color = "red";\n\nprint(AB.length, AB.slope);\nprint(A.x, A.y);\nA.color = "red";          // 改颜色\nBC.visible = false;       // 隐藏\nBC.msg = "长度 " + tostr(AB.length);')
  });

  SECTIONS.push({
    title: '7. 内置函数表',
    html:
      tbl(['常数', '值'], [
        ['<code>pi</code>、<code>PI</code>', '3.141592653589793'],
        ['<code>e</code>', '2.718281828459045']
      ]) +
      tbl(['函数', '参数', '返回', '说明'], [
        ['<code>sqrt(x)</code>', '1', 'double', '平方根；x &lt; 0 得 NaN'],
        ['<code>abs(x)</code>', '1', 'double', '绝对值'],
        ['<code>pow(a, b)</code>', '2', 'double', 'a 的 b 次方'],
        ['<code>sin(x)</code> <code>cos(x)</code> <code>tan(x)</code>', '1', 'double', '<b>弧度</b>'],
        ['<code>asin</code> <code>acos</code> <code>atan</code>', '1', 'double', '返回<b>弧度</b>，定义域外 NaN'],
        ['<code>atan2(y, x)</code>', '2', 'double', '返回弧度，能分辨象限'],
        ['<code>floor</code> <code>ceil</code>', '1', 'double', '向下 / 向上取整'],
        ['<code>round(x)</code>', '1', 'double', '四舍五入，.5 <b>远离 0</b>'],
        ['<code>log(x)</code>', '1', 'double', '<b>自然对数</b>'],
        ['<code>ln(x)</code>', '1', 'double', '与 log(x) 完全相同，自然对数'],
        ['<code>log10(x)</code>', '1', 'double', '<b>常用对数</b>（以 10 为底）'],
        ['<code>exp(x)</code>', '1', 'double', 'e 的 x 次方'],
        ['<code>min</code> <code>max</code>', '≥2', 'double', '最小 / 最大值'],
        ['<code>deg(rad)</code>', '1', 'double', '弧度 → 角度'],
        ['<code>rad(deg)</code>', '1', 'double', '角度 → 弧度'],
        ['<code>sind</code> <code>cosd</code> <code>tand</code>', '1', 'double', '参数是<b>角度</b>'],
        ['<code>near(a, b, eps)</code>', '2~3', 'bool', 'abs(a-b) &lt;= eps，默认 1e-9'],
        ['<code>dist(A, B)</code>', '2', 'double', '两点距离'],
        ['<code>angle(A, B, C)</code>', '3', 'double', '角 ABC（B 为顶点），单位是度'],
        ['<code>length(obj)</code>', '1', 'double', '线段长 / 圆周长 / 多边形周长'],
        ['<code>tonum(x)</code>', '1', 'double', '转数字'],
        ['<code>tostr(x)</code>', '1', 'string', '转字符串'],
        ['<code>print(x, ...)</code>', '≥1', '0', '普通输出，空格连接'],
        ['<code>warn(s)</code>', '≥1', '0', '警告输出（黄色）'],
        ['<code>pass(s)</code>', '≥1', 'true', '记一条「通过」判定'],
        ['<code>fail(s)</code>', '≥1', 'false', '记一条「未通过」判定']
      ]) +
      '<p class="mh-warn"><b>重点：<code>log</code> 与 <code>ln</code> 都是自然对数</b>（对齐 C++ &lt;cmath&gt;：std::log 是自然对数，std::log10 才是常用对数）。要「以 10 为底」必须写 <code>log10</code>：<code>log(100)</code> 得 4.605…，<code>log10(100)</code> 得 2。参数个数必须对得上，否则报「函数 sqrt 需要 1 个参数，实际给了 2 个」。</p>' +
      code('print(sqrt(2), pow(2, 10));      // 1.41421356237 1024\nprint(log(e), log10(1000));      // 1 3\nprint(sind(30), cosd(60));       // 0.5 0.5\nprint(near(0.1 + 0.2, 0.3));     // true\nprint(dist(A, B));\nprint(angle(A, B, C));           // ∠ABC，单位是度\nprint(length(AB));')
  });

  SECTIONS.push({
    title: '8. 示例库',
    html:
      sub('（1）用户原始示例：靠 num 控制颜色') +
      code('// 当 BC 的自定义计数 num 等于 2 时，把 BC 标红\nif (BC.num == 2) {\n    BC.color = "red";\n} else {\n    BC.color = "#2a63e8";\n}') +
      sub('（2）判断两条线段是否等长') +
      code('if (near(AB.length, CD.length, 0.01)) pass("AB 与 CD 等长");\nelse fail("AB 与 CD 不等长");') +
      sub('（3）判断直角（角度制）') +
      code('double a = angle(B, A, C);      // 顶点是 A\nif (near(a, 90, 0.5)) pass("∠BAC 是直角");\nelse fail("∠BAC = " + tostr(a) + "°");') +
      sub('（4）比较面积与周长') +
      code('if (tri.area > 10) pass("三角形面积大于 10");\nprint("面积 " + tostr(tri.area) + "，周长 " + tostr(tri.perimeter));') +
      sub('（5）循环统计：平方和') +
      code('int count = 0;\ndouble total = 0;\nfor (int i = 0; i < 5; i++) {\n    total += i * i;\n    count++;\n}\nprint("平方和 " + tostr(total) + "，共 " + tostr(count) + " 项");') +
      sub('（6）按长度分档上色（三目嵌套）') +
      code('double s = AB.length;\nBC.color = (s > 5) ? "red" : (s > 3 ? "orange" : "#2a63e8");') +
      sub('（7）求线段倾角') +
      code('print("AB 倾角 " + tostr(deg(atan(AB.slope))) + "°");') +
      sub('（8）用 while 找阈值') +
      code('int k = 0;\nwhile (true) {\n    k++;\n    if (k * k > 50) break;\n}\nprint(k);       // 8')
  });

  SECTIONS.push({
    title: '9. 错误与限制',
    html:
      note('错误格式：<b>第 N 行 第 M 列：中文提示</b>。语法错误在运行前返回；运行时错误指向出错的那条语句。') +
      tbl(['提示', '原因', '怎么办'], [
        ['未定义的变量或对象：Foo', '名字拼错，或对象还没创建', '对照对象列表里的标签，注意大小写'],
        ['变量 a 重复声明', '同一作用域写了两次', '换个名字或合并声明'],
        ['语句末尾缺少分号 ;', '少写分号', '补上 <code>;</code>'],
        ['属性只读: name', '给只读属性赋值', '只写 visible/color/num/ok/msg 与自由点 x/y'],
        ['对象 BC 没有属性 "yy"', '属性名拼错', '对照第 6 节属性表'],
        ['函数 sqrt 需要 1 个参数，实际给了 2 个', '参数个数不对', '对照第 7 节函数表'],
        ['取余运算的除数为 0', '<code>x % 0</code>', '先判断除数'],
        ['循环次数超过上限（10000 次）', '死循环', '检查循环条件与 break'],
        ['脚本执行步数超过上限（50000 步）', '脚本太大', '减少循环层数或规模'],
        ['暂不支持自定义函数', '写了 <code>int f(...) { }</code>', '把逻辑写在脚本里']
      ]) +
      p('<b>预算</b>：每条语句计一步，上限 50000 步；每个循环单独计数，上限 10000 次。接口上可用 <code>run(src, bridge, { maxSteps: 20000, maxLoop: 2000 })</code> 调整，界面不改。') +
      p('<b>不支持</b>：') +
      ul([
        '指针与引用（<code>*</code>、<code>&amp;</code>）',
        '数组、vector、下标访问 <code>a[i]</code>',
        '类、结构体、enum',
        '模板、STL、<code>#include</code>',
        '自定义函数、递归',
        '<code>switch</code> / <code>goto</code> / <code>do-while</code>',
        '位运算（<code>&amp;</code> <code>|</code> <code>^</code> <code>~</code> <code>&lt;&lt;</code> <code>&gt;&gt;</code>）',
        '<code>cout</code> / <code>cin</code> / <code>endl</code>',
        '单引号字符串、跨行字符串、注释嵌套'
      ]) +
      code('// 语法错误示例：第 2 行 第 1 列 提示缺少分号（列号指向行尾）\nint n = 2\n\n// 运行时错误示例：取余的除数为 0（第 1 行 第 11 列）\nint m = 5 % 0;')
  });

  SECTIONS.push({
    title: '10. 与真实 C++ 的差异与调试建议',
    html:
      tbl(['主题', '真实 C++', '本引擎'], [
        ['程序结构', '需要 <code>int main() { ... }</code>', '脚本本身就是程序体，没有 main / 函数 / return'],
        ['数字', 'int 有 32 位溢出，<code>7/2</code> 得 3', '全按 double 算，<code>7/2</code> 得 3.5，赋给 int 才截断'],
        ['字符串', '<code>string + int</code> 编译失败', '<code>+</code> 只要有一侧是字符串就拼接'],
        ['比较', '<code>"10" == 10</code> 编译失败', '转数字比，得 true'],
        ['浮点相等', '== 不精确，需要自己写容差', '同样不精确，内置 <code>near(a, b, eps)</code>'],
        ['除零', '整数除 0 崩溃；浮点除 0 得 inf', '<code>1/0</code> 得 Infinity、<code>0/0</code> 得 NaN；<code>% 0</code> 报错'],
        ['log', 'std::log 是自然对数，没有 ln', 'log 与 ln 都是自然对数，log10 是常用对数'],
        ['round', '.5 远离 0', '相同'],
        ['求值顺序', '很多地方是未定义行为', '严格从左到右求值'],
        ['switch / 指针 / 数组', '支持', '不支持（见第 9 节）']
      ]) +
      p('<b>调试建议</b>：') +
      ol([
        '先把关键量 <code>print</code> 出来，看不清数值时一切推断都是猜。',
        '浮点比较一律用 <code>near(a, b, 1e-6)</code>，不要写 <code>==</code>。',
        '循环不收敛时，先打印条件里的量，或临时把规模改小。',
        '报错先看<b>行列</b>：列号通常指向出错的那个符号（缺分号会指到行尾）。',
        '大表达式拆成几个 double 变量，报错位置更准，也更像 C++ 的写法。',
        '用 <code>warn("走到这里")</code> 标记分支，用 <code>pass</code> / <code>fail</code> 表达最终判定。',
        '自动运行开着时，每次拖点都会重跑；调脚本时先关掉它。',
        '需要「多次试验不同条件」时，改 <code>num</code> 这类自定义属性比改脚本更快。'
      ]) +
      code('// 调试脚手架：先看数，再判定\nprint("AB.length = " + tostr(AB.length));\nprint("CD.length = " + tostr(CD.length));\nif (near(AB.length, CD.length, 0.01)) pass("AB 与 CD 等长");\nelse warn("两者不等长，先别急着判错");')
  });

  /* ============================================================
     样式（只作用于 .math-help-modal 与 .math-quickref）
     ============================================================ */
  var STYLE = [
    '.math-help-modal{width:min(920px,100%)}',
    '.math-help-modal .modal-body{padding-right:22px}',
    '.mh-lead{margin:0 0 14px;color:var(--muted,#5a6b83);font-size:13.5px;line-height:1.8}',
    '.mh-sec{border:1px solid var(--line,rgba(122,146,180,.22));border-radius:14px;margin:0 0 10px;background:rgba(255,255,255,.55);overflow:hidden}',
    '.mh-sec>summary{cursor:pointer;padding:11px 14px;font-weight:600;font-size:14.5px;color:var(--ink,#0f1c2e);list-style:none;display:flex;align-items:center;gap:8px}',
    '.mh-sec>summary::-webkit-details-marker{display:none}',
    '.mh-sec>summary::before{content:"+";display:inline-grid;place-items:center;width:18px;height:18px;border-radius:6px;background:var(--primary-soft,rgba(42,99,232,.10));color:var(--primary,#2a63e8);font-size:13px;font-weight:700;flex:none}',
    '.mh-sec[open]>summary::before{content:"−"}',
    '.mh-sec[open]>summary{border-bottom:1px solid var(--line,rgba(122,146,180,.18))}',
    '.mh-body{padding:12px 14px 14px;font-size:13.5px;line-height:1.85;color:var(--ink,#0f1c2e)}',
    '.mh-body p{margin:8px 0}',
    '.mh-list{margin:8px 0;padding-left:20px}',
    '.mh-list li{margin:4px 0}',
    '.mh-note{margin:8px 0;padding:8px 11px;border-left:3px solid var(--primary,#2a63e8);background:var(--primary-soft,rgba(42,99,232,.07));border-radius:0 8px 8px 0;color:var(--ink,#0f1c2e);font-size:13px}',
    '.mh-warn{margin:10px 0;padding:9px 11px;border-left:3px solid var(--accent,#f08a3c);background:var(--accent-soft,rgba(240,138,60,.10));border-radius:0 8px 8px 0;font-size:13px}',
    '.mh-sub{margin:14px 0 6px;font-weight:600;color:var(--primary-dark,#1c48b8);font-size:13.5px}',
    '.mh-table{width:100%;border-collapse:collapse;margin:8px 0 12px;font-size:12.8px}',
    '.mh-table th,.mh-table td{border:1px solid var(--line,rgba(122,146,180,.22));padding:6px 8px;text-align:left;vertical-align:top}',
    '.mh-table th{background:rgba(42,99,232,.06);font-weight:600;white-space:nowrap}',
    '.mh-table code,.mh-body p code,.mh-list code{background:rgba(42,99,232,.08);border-radius:5px;padding:1px 4px;font-family:var(--mono,Consolas,monospace);font-size:12.5px}',
    '.mh-codewrap{position:relative;margin:8px 0 12px}',
    '.mh-code{margin:0;padding:11px 12px;background:#f4f7fc;border:1px solid var(--line,rgba(122,146,180,.22));border-radius:10px;overflow-x:auto;font-family:var(--mono,Consolas,monospace);font-size:12.6px;line-height:1.65;color:#1b2b45}',
    '.mh-code code{white-space:pre;font-family:inherit}',
    '.mh-copy{position:absolute;top:7px;right:8px;border:1px solid var(--line-strong,rgba(106,132,170,.34));background:rgba(255,255,255,.92);color:var(--muted,#5a6b83);border-radius:7px;padding:2px 9px;font-size:11.5px;cursor:pointer;opacity:0;transition:opacity .15s ease}',
    '.mh-codewrap:hover .mh-copy,.mh-copy:focus-visible{opacity:1}',
    '.mh-copy:hover{color:var(--primary,#2a63e8);border-color:var(--primary,#2a63e8)}',
    '@media (max-width:640px){.mh-table{font-size:12px}.mh-code{font-size:12px}}',
    '.math-quickref{font-size:12.5px;line-height:1.6}',
    '.math-quickref h4{margin:10px 0 4px;font-size:12.5px;color:var(--muted,#5a6b83);font-weight:600}',
    '.math-quickref table{width:100%;border-collapse:collapse}',
    '.math-quickref td{border-bottom:1px dashed var(--line,rgba(122,146,180,.22));padding:3px 2px;vertical-align:top}',
    '.math-quickref code{font-family:var(--mono,Consolas,monospace);color:var(--primary-dark,#1c48b8)}',
    '.math-quickref .qf-k{color:var(--muted,#5a6b83);white-space:nowrap;padding-right:8px}'
  ].join('');

  function injectStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('math-help-style')) return;
    var style = document.createElement('style');
    style.id = 'math-help-style';
    style.appendChild(document.createTextNode(STYLE));
    (document.head || document.body).appendChild(style);
  }

  /* ============================================================
     正文拼装
     ============================================================ */
  function buildBody() {
    var html = '<p class="mh-lead">面向「会一点 C++」的读者：这套脚本长得像 C++，但更小、更安全，不会把页面卡死。' +
      '所有示例都可以直接粘贴到脚本框里运行。</p>';
    for (var i = 0; i < SECTIONS.length; i += 1) {
      html += '<details class="mh-sec"' + (i === 0 ? ' open' : '') + '>' +
        '<summary>' + esc(SECTIONS[i].title) + '</summary>' +
        '<div class="mh-body">' + SECTIONS[i].html + '</div>' +
        '</details>';
    }
    injectStyle();
    return html;
  }

  /* ============================================================
     复制按钮
     ============================================================ */
  function flash(btn, label) {
    if (!btn || !btn.dataset) return;
    if (btn.__timer) window.clearTimeout(btn.__timer);
    btn.textContent = label;
    btn.__timer = window.setTimeout(function () {
      btn.textContent = '复制';
      btn.__timer = null;
    }, 1400);
  }

  function legacyCopy(text) {
    var ta = null;
    try {
      ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) {
      if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
      return false;
    }
  }

  function selectCode(pre) {
    try {
      var range = document.createRange();
      range.selectNodeContents(pre);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { /* 选不中也不影响 */ }
  }

  function copyText(text, pre, btn) {
    var done = function () { flash(btn, '已复制'); };
    var fail = function () { flash(btn, '已选中，请 Ctrl+C'); selectCode(pre); };

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        var result = navigator.clipboard.writeText(text);
        if (result && typeof result.then === 'function') {
          result.then(done, function () { if (legacyCopy(text)) done(); else fail(); });
        } else {
          done();
        }
        return;
      }
    } catch (e) { /* 落到下面的兜底 */ }

    if (legacyCopy(text)) done();
    else fail();
  }

  function enhance(root) {
    if (!root || !root.querySelectorAll) return;
    var pres = root.querySelectorAll('pre.mh-code');
    for (var i = 0; i < pres.length; i += 1) {
      (function (pre) {
        if (pre.parentNode && pre.parentNode.className === 'mh-codewrap') return;
        var wrap = document.createElement('div');
        wrap.className = 'mh-codewrap';
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);

        var btn = document.createElement('button');
        btn.className = 'mh-copy';
        btn.type = 'button';
        btn.textContent = '复制';
        btn.setAttribute('aria-label', '复制这段示例代码');
        btn.addEventListener('click', function () {
          copyText(pre.textContent, pre, btn);
        });
        wrap.appendChild(btn);
      })(pres[i]);
    }
  }

  /* ============================================================
     右栏速查片段
     ============================================================ */
  var QUICKREF_HTML =
    '<div class="math-quickref">' +
      '<style>' + STYLE + '</style>' +
      '<h4>优先级（高 → 低）</h4>' +
      '<table>' +
        '<tr><td class="qf-k">1</td><td><code>()</code> <code>f()</code> <code>obj.prop</code></td></tr>' +
        '<tr><td class="qf-k">2</td><td><code>++</code> <code>--</code>（后缀）</td></tr>' +
        '<tr><td class="qf-k">3</td><td><code>!</code> <code>-</code> <code>+</code>（一元）</td></tr>' +
        '<tr><td class="qf-k">4</td><td><code>*</code> <code>/</code> <code>%</code></td></tr>' +
        '<tr><td class="qf-k">5</td><td><code>+</code> <code>-</code></td></tr>' +
        '<tr><td class="qf-k">6</td><td><code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code></td></tr>' +
        '<tr><td class="qf-k">7</td><td><code>==</code> <code>!=</code></td></tr>' +
        '<tr><td class="qf-k">8</td><td><code>&amp;&amp;</code> <code>||</code></td></tr>' +
        '<tr><td class="qf-k">9</td><td><code>? :</code></td></tr>' +
        '<tr><td class="qf-k">10</td><td><code>=</code> <code>+=</code> <code>-=</code> <code>*=</code> <code>/=</code></td></tr>' +
      '</table>' +
      '<h4>常用属性</h4>' +
      '<table>' +
        '<tr><td class="qf-k">读</td><td><code>.name</code> <code>.type</code> <code>.length</code> <code>.slope</code> <code>.area</code> <code>.radius</code></td></tr>' +
        '<tr><td class="qf-k">写</td><td><code>.color</code> <code>.visible</code> <code>.num</code> <code>.ok</code> <code>.msg</code></td></tr>' +
        '<tr><td class="qf-k">点坐标</td><td><code>A.x</code> <code>A.y</code>（仅自由点可写）</td></tr>' +
        '<tr><td class="qf-k">标签</td><td><code>AB</code> <code>l1</code> <code>c1</code> <code>poly1</code> <code>M1</code> <code>X1</code></td></tr>' +
      '</table>' +
      '<h4>常用函数</h4>' +
      '<table>' +
        '<tr><td class="qf-k">判定</td><td><code>near(a,b,eps)</code> <code>pass()</code> <code>fail()</code></td></tr>' +
        '<tr><td class="qf-k">几何</td><td><code>dist(A,B)</code> <code>angle(A,B,C)</code> <code>length(obj)</code></td></tr>' +
        '<tr><td class="qf-k">数学</td><td><code>sqrt</code> <code>abs</code> <code>pow</code> <code>min</code> <code>max</code></td></tr>' +
        '<tr><td class="qf-k">三角</td><td><code>sin</code> <code>cos</code> <code>tan</code>（弧度）<br><code>sind</code> <code>cosd</code> <code>tand</code>（角度）</td></tr>' +
        '<tr><td class="qf-k">对数</td><td><code>log</code> <code>ln</code> 自然对数<br><code>log10</code> 常用对数</td></tr>' +
        '<tr><td class="qf-k">输出</td><td><code>print(x)</code> <code>warn(x)</code> <code>tostr(x)</code></td></tr>' +
      '</table>' +
    '</div>';

  /* ============================================================
     对外接口
     ============================================================ */
  function open() {
    if (typeof document === 'undefined' || !SL.modal) return null;
    injectStyle();
    var dialog = SL.modal({
      title: 'C++ 判断脚本语法详解',
      body: buildBody(),
      className: 'math-help-modal'
    });
    if (dialog && dialog.body) enhance(dialog.body);
    return dialog;
  }

  SL.math.help = {
    open: open,
    QUICKREF_HTML: QUICKREF_HTML
  };
})();
