/* 器材图标（手绘线稿）
   ------------------------------------------------------------
   为什么不复用 sprite.js：那套是 Tabler 的通用 UI 字形（seesaw / weight / ruler），
   同一个字形被不同学科反复借用，画面上就成了「通用图标拼盘」。
   这里按初中实验室真器材的样子单独勾线：托盘天平要有刀口、指针和吊盘，
   砝码要有提钮和腰线，斜面要有楔形和支撑，挡板要有底座和斜撑。
   24×24 网格，线宽由 SL.apparatus 统一给（1.45），只允许用 currentColor。 */
window.SparkLab = window.SparkLab || {};
window.SparkLab.apparatusIcons = {
  /* 托盘天平：底座 + 立柱 + 横梁 + 刀口 + 指针 + 两只吊盘 */
  'dep-balance':
    '<rect x="3.8" y="18.8" width="16.4" height="2.4" rx="1.2"/>' +
    '<path d="M6.2 21.2v1M17.8 21.2v1"/>' +
    '<path d="M12 18.6V8.2"/>' +
    '<path d="M4.4 6.4h15.2"/>' +
    '<path d="M12 5.2l-1.7 1.2h3.4z" fill="currentColor" stroke="none"/>' +
    '<path d="M12 6.6v3.4"/>' +
    '<path d="M4.45 6.4V9.6M2 9.6h4.9l-.8 2.6H2.8z"/>' +
    '<path d="M19.55 6.4V9.6M17.1 9.6h4.9l-.8 2.6h-3.3z"/>',

  /* 小天平：同一副结构缩小，坐在一块能放上别人托盘的底板上 */
  'dep-stackBalance':
    '<rect x="4.2" y="18.4" width="15.6" height="2.2" rx="1"/>' +
    '<path d="M12 18.4v-6"/>' +
    '<path d="M6.8 11.2h10.4"/>' +
    '<circle cx="12" cy="10.3" r="1" fill="currentColor" stroke="none"/>' +
    '<path d="M6.8 11.2v3.2M4.4 14.4h4.8l-.7 2.2H5.1z"/>' +
    '<path d="M17.2 11.2v3.2M15.1 14.4h4.8l-.7 2.2h-3.4z"/>',

  /* 物块：木块，带两条木纹和一道底边阴影 */
  'dep-block':
    '<rect x="4.4" y="6.8" width="15.2" height="12.2" rx="1.1"/>' +
    '<path d="M4.4 16.6h15.2" opacity=".35"/>' +
    '<path d="M6.8 10.7h8.6"/>' +
    '<path d="M6.8 13.4h10.4" opacity=".7"/>' +
    '<path d="M6.8 15.4h6.2" opacity=".45"/>',

  /* 砝码：黄铜，梯形砝码体 + 提钮 + 腰线 */
  'dep-weight':
    '<path d="M8.1 20.2l1.5-8.5h4.8l1.5 8.5z"/>' +
    '<path d="M9.4 14.3h5.2"/>' +
    '<circle cx="12" cy="9.5" r="1.7"/>' +
    '<path d="M7.4 20.2h9.2"/>',

  /* 斜面：楔形木块 + 坡上的小物块 + 高端的支撑 */
  'dep-ramp':
    '<path d="M3.4 20h17.2"/>' +
    '<path d="M5 20l12.6-8.1V20z"/>' +
    '<path d="M9.4 14.9l2.9-1.7 1.6 2.7-2.9 1.7z"/>',

  /* 挡板：竖直板 + 底板 + 两根斜撑 + 表示「固定」的斜线 */
  'dep-wall':
    '<rect x="10.7" y="3.6" width="2.6" height="13.6" rx=".9"/>' +
    '<path d="M7 17.2h10"/>' +
    '<path d="M10.7 15.4L8 17.2M13.3 15.4l2.7 1.8"/>' +
    '<path d="M7.4 8.6L5.2 10.8M7.4 12.2l-2.2 2.2M7.4 15.8l-2.2 2.2" opacity=".4"/>',

  /* 光的反射：镜面 + 法线 + 入射/反射光线（反射角等于入射角） */
  'dep-rays':
    '<path d="M3.6 19.4h16.8"/>' +
    '<path d="M12 3.8v15.6" opacity=".45" stroke-dasharray="2.4 2"/>' +
    '<path d="M12 16.6L6.8 8.4M12 16.6l5.2-8.2"/>' +
    '<circle cx="12" cy="16.6" r="1.1" fill="currentColor" stroke="none"/>',

  /* 平面镜成像：镜面 + 物 + 镜后等距的虚像（虚线） */
  'dep-mirror':
    '<path d="M14.6 4.4v15.2"/>' +
    '<path d="M14.6 4.4v15.2" opacity=".5"/>' +
    '<path d="M14.6 6.2l2.2 1.6M14.6 10l2.2 1.6M14.6 13.8l2.2 1.6M14.6 17.6l2.2 1.5" opacity=".55"/>' +
    '<path d="M8.4 16.4V8.2" stroke-width="1.8"/>' +
    '<path d="M20.8 16.4V8.2" stroke-width="1.8" stroke-dasharray="2.6 2.2" opacity=".75"/>',

  /* 凸透镜：双凸透镜 + 平行光会聚到焦点 */
  'dep-lens':
    '<path d="M12 3.6c2.6 4 2.6 8.8 0 16.8M12 3.6c-2.6 4 -2.6 8.8 0 16.8"/>' +
    '<path d="M3.4 8.4h5.2M3.4 12h5.2M3.4 15.6h5.2" opacity=".6"/>' +
    '<path d="M15.4 8.4l3.6 3.6-3.6 3.6" opacity=".6"/>' +
    '<circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>'
};
