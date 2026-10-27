/* 通用工具：DOM、存储、图标、弹窗、提示、音效、下载 */
(function () {
  'use strict';
  var SL = (window.SparkLab = window.SparkLab || {});

  /* 版本号：界面顶栏、首页页脚与「关于」中展示 */
  SL.VERSION = '1.7.0';
  SL.VERSION_DATE = '2026-10-25';

  SL.$ = function (sel, root) { return (root || document).querySelector(sel); };
  SL.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  SL.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var val = attrs[key];
      if (val == null) return;
      if (key === 'class') node.className = val;
      else if (key === 'text') node.textContent = val;
      else if (key === 'html') node.innerHTML = val;
      else if (key === 'dataset') Object.keys(val).forEach(function (k) { node.dataset[k] = val[k]; });
      else if (key === 'style' && typeof val === 'object') Object.assign(node.style, val);
      else if (key.indexOf('on') === 0 && typeof val === 'function') node.addEventListener(key.slice(2), val);
      else node.setAttribute(key, val);
    });
    (Array.isArray(children) ? children : children ? [children] : []).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  };

  SL.escape = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  SL.icon = function (name, cls, size) {
    var markup = (SL.icons && SL.icons[name]) || '';
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) +
      '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + markup + '</svg>';
  };

  SL.fmt = function (value, digits) {
    if (value == null || isNaN(value)) return '—';
    var d = digits == null ? 2 : digits;
    return Number(value).toFixed(d);
  };

  SL.today = function () {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  SL.now = function () {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  };

  /* ---------- 存储（localStorage 失败时降级为内存） ---------- */
  SL.KEYS = {
    records: 'sparklab:v1:records',
    progress: 'sparklab:v1:progress',
    settings: 'sparklab:v1:settings'
  };

  SL.storage = (function () {
    var memory = {};
    var available = (function () {
      try {
        var k = '__sparklab_probe__';
        window.localStorage.setItem(k, '1');
        window.localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    })();

    return {
      available: available,
      get: function (key, fallback) {
        try {
          var raw = available ? window.localStorage.getItem(key) : memory[key];
          if (raw == null) return fallback;
          return JSON.parse(raw);
        } catch (e) { return fallback; }
      },
      set: function (key, value) {
        var raw = JSON.stringify(value);
        try {
          if (available) window.localStorage.setItem(key, raw);
          else memory[key] = raw;
        } catch (e) { memory[key] = raw; }
      },
      remove: function (key) {
        try {
          if (available) window.localStorage.removeItem(key);
          delete memory[key];
        } catch (e) { delete memory[key]; }
      }
    };
  })();

  SL.settings = (function () {
    var defaults = { sound: true };
    var data = SL.storage.get(SL.KEYS.settings, {}) || {};
    var api = {
      get: function (key) { return data[key] == null ? defaults[key] : data[key]; },
      set: function (key, value) {
        data[key] = value;
        SL.storage.set(SL.KEYS.settings, data);
      }
    };
    return api;
  })();

  /* ---------- 音效：WebAudio 合成，轻柔低音量 ---------- */
  SL.sound = (function () {
    var ctx = null;
    function ensure() {
      if (!SL.settings.get('sound')) return null;
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, duration, delay, gainValue) {
      var ac = ensure();
      if (!ac) return;
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      var filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ac.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(gainValue || 0.03, ac.currentTime + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);
      osc.connect(filter); filter.connect(gain); gain.connect(ac.destination);
      osc.start(ac.currentTime + delay);
      osc.stop(ac.currentTime + delay + duration + 0.02);
    }

    var patterns = {
      connect: [[440, 0.05, 0, 0.025]],
      click: [[330, 0.045, 0, 0.02]],
      record: [[620, 0.07, 0, 0.03], [780, 0.08, 0.09, 0.028]],
      warn: [[220, 0.13, 0, 0.03], [196, 0.12, 0.1, 0.024]],
      success: [[523, 0.09, 0, 0.028], [659, 0.09, 0.1, 0.026], [784, 0.13, 0.2, 0.026]]
    };

    return {
      play: function (type) {
        var pattern = patterns[type];
        if (!pattern) return;
        pattern.forEach(function (p) { tone(p[0], p[1], p[2], p[3]); });
      },
      unlock: function () { ensure(); }
    };
  })();

  /* ---------- Toast ---------- */
  SL.toast = function (message, type, ms) {
    var host = SL.$('#toast-host');
    if (!host) {
      host = SL.el('div', { id: 'toast-host' });
      document.body.appendChild(host);
    }
    var item = SL.el('div', { class: 'toast toast-' + (type || 'info') });
    var iconName = type === 'warn' ? 'alert-triangle' : type === 'ok' ? 'check' : 'help-circle';
    item.innerHTML = SL.icon(iconName, 'toast-icon', 18) + '<span>' + SL.escape(message) + '</span>';
    host.appendChild(item);
    if (type === 'warn') SL.sound.play('warn');
    requestAnimationFrame(function () { item.classList.add('toast-in'); });
    window.setTimeout(function () {
      item.classList.remove('toast-in');
      window.setTimeout(function () { item.remove(); }, 220);
    }, ms || 2600);
  };

  /* ---------- 弹窗（内容独立滚动、关闭按钮醒目且贴近滚动条） ---------- */
  SL.modal = function (options) {
    options = options || {};
    var overlay = SL.el('div', { class: 'modal-overlay' });
    var modal = SL.el('div', { class: 'modal ' + (options.className || ''), role: 'dialog', 'aria-modal': 'true' });
    var closeBtn = SL.el('button', { class: 'modal-close', type: 'button', 'aria-label': '关闭', html: '&times;' });
    var scroll = SL.el('div', { class: 'modal-scroll' });
    var body = SL.el('div', { class: 'modal-body' });

    if (options.title) {
      body.appendChild(SL.el('h2', { class: 'modal-title', text: options.title }));
    }
    if (typeof options.body === 'string') body.insertAdjacentHTML('beforeend', options.body);
    else if (options.body) body.appendChild(options.body);
    if (options.footer) {
      var footer = SL.el('div', { class: 'modal-footer' });
      footer.appendChild(options.footer);
      body.appendChild(footer);
    }

    scroll.appendChild(body);
    modal.appendChild(closeBtn);
    modal.appendChild(scroll);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    function close() {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      overlay.classList.remove('is-open');
      window.setTimeout(function () { overlay.remove(); }, 180);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    return { close: close, overlay: overlay, body: body };
  };

  SL.confirm = function (message, onConfirm, options) {
    options = options || {};
    var footer = SL.el('div', { class: 'modal-actions' });
    var cancel = SL.el('button', { class: 'btn btn-ghost', type: 'button', text: options.cancelText || '取消' });
    var ok = SL.el('button', { class: 'btn btn-danger', type: 'button', text: options.okText || '确定' });
    var dialog = SL.modal({ title: options.title || '请确认', body: '<p class="modal-text">' + SL.escape(message) + '</p>', footer: footer });
    footer.appendChild(cancel);
    footer.appendChild(ok);
    cancel.addEventListener('click', dialog.close);
    ok.addEventListener('click', function () { dialog.close(); if (onConfirm) onConfirm(); });
  };

  /* ---------- 文件下载 ---------- */
  SL.download = function (filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = SL.el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };
})();
