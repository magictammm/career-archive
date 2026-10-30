#!/usr/bin/env node
/**
 * build_framework.cjs —— 从 archive.config.json + 项目深挖 md 生成单文件自包含简历框架页
 *
 * 用法：
 *   node build_framework.cjs <config.json 路径>
 *
 * config 结构见 assets/archive.config.example.json
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_TEMPLATE = path.join(__dirname, '..', 'assets', 'framework_template.html');

/* ─────────── 工具 ─────────── */
const pad2 = n => String(n).padStart(2, '0');

function parseYM(s) {
  if (typeof s === 'number') return s; // 允许直接写「月序号」，以 start 为 0
  const m = /^(\d{4})[-./](\d{1,2})$/.exec(String(s).trim());
  if (!m) throw new Error('时间格式应为 YYYY-MM：' + s);
  return parseInt(m[1], 10) * 12 + (parseInt(m[2], 10) - 1);
}
function ymLabel(idx, origin) {
  const total = origin + idx;
  return parseInt(total / 12, 10) + '.' + pad2(total % 12 + 1);
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─────────── 读配置 ─────────── */
const cfgPath = process.argv[2];
if (!cfgPath) {
  console.error('用法: node build_framework.cjs <config.json>');
  process.exit(1);
}
const cfgFile = path.resolve(cfgPath);
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
const BASE = path.dirname(cfgFile);

const origin = parseYM(cfg.start);
const endIdx = parseYM(cfg.end);
const months = endIdx - origin + 1;
if (months <= 0) throw new Error('end 必须晚于 start');

const VIEW_W = cfg.width || 1400;
const PL = cfg.plotLeft || 140;  // 左侧坐标轴标签区（放得下「PC 端上位机」这类层名）
const PR = 24;                   // 右侧留白
const COL_W = (VIEW_W - PL - PR) / months;
const PX_PER_K = cfg.pxPerK || 74;   // 价格轴：每 1k 的像素高
const BAR_H = 26;
const GAP = 3;                   // 同价位避让的最小间隔
const YEAR_H = 34;               // 顶部年份/月份标签区

const x = idx => PL + idx * COL_W;
const xEnd = idx => PL + (idx + 1) * COL_W;

/* ─────────── 读深挖文档 ─────────── */
const DOCS = {};
const docsDir = path.resolve(BASE, cfg.docsDir || '项目深挖');
if (fs.existsSync(docsDir)) {
  fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).sort().forEach(f => {
    DOCS[f] = fs.readFileSync(path.join(docsDir, f), 'utf8')
      .replace(/<\/script/gi, '<\\/script')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  });
}
console.log('读入深挖文档 ' + Object.keys(DOCS).length + ' 份');

/* ─────────── 项目 → 文档映射 ─────────── */
const MAP = {};
(cfg.hardware || []).concat(cfg.software || []).forEach(p => {
  if (!p.doc) { MAP[p.key] = null; return; }
  const arr = Array.isArray(p.doc) ? p.doc : [{ f: p.doc, l: p.docLabel || p.name }];
  MAP[p.key] = arr.map(d => ({ f: d.f, l: d.l || d.f }));
});

/* ─────────── 时间轴（共用） ─────────── */
function timeMarks(maxH) {
  let h = '';
  for (let i = 0; i < months; i++) {
    const total = origin + i;
    const isYear = (total % 12) === 0;
    h += '<div class="col' + (isYear ? ' yr' : '') + '" style="left:' + x(i).toFixed(1) + 'px"></div>';
    if (isYear) {
      h += '<div class="yrlab" style="left:' + (x(i) + 3).toFixed(1) + 'px">' + parseInt(total / 12, 10) + '</div>';
    } else if (COL_W >= 26) {
      h += '<div class="monlab" style="left:' + (x(i) + 3).toFixed(1) + 'px">' + pad2(total % 12 + 1) + '</div>';
    }
  }
  h += '<div class="col yr" style="left:' + x(months).toFixed(1) + 'px"></div>';
  return h;
}

/* ─────────── ① 整机 / 硬件区 ─────────── */
function buildHardware() {
  const list = (cfg.hardware || []).filter(p => p.price != null || p.start);
  if (!list.length) return { html: '<div class="md-p">（未配置硬件项目）</div>', h: 120 };

  const prices = list.map(p => Number(p.price) || 0);
  let maxK = Math.max.apply(null, prices.concat([Number(cfg.maxPrice) || 0]));
  maxK = Math.ceil(maxK);                       // 向上取整到 1k
  if (maxK < 1) maxK = 1;
  const plotH = maxK * PX_PER_K;
  const H = YEAR_H + plotH + 14;

  const yOf = price => YEAR_H + (maxK - (Number(price) || 0)) * PX_PER_K;

  // 先算自然位置，再做重叠避让
  const items = list.map(p => {
    const s = parseYM(p.start) - origin;
    const e = p.end ? parseYM(p.end) - origin : s;
    return {
      p, s: Math.max(0, s), e: Math.min(months - 1, Math.max(s, e)),
      x1: x(Math.max(0, s)), x2: xEnd(Math.min(months - 1, Math.max(s, e))),
      top: yOf(p.price) - BAR_H / 2,
    };
  }).sort((a, b) => a.s - b.s || b.e - a.e);

  // 避让：时间重叠且纵向过近 → 下移
  const placed = [];
  items.forEach(it => {
    let top = it.top;
    let guard = 0;
    while (guard++ < 40) {
      const hit = placed.find(q =>
        Math.abs(q.top - top) < BAR_H + GAP && it.x1 < q.x2 + 4 && it.x2 > q.x1 - 4);
      if (!hit) break;
      top = hit.top + BAR_H + GAP;
    }
    // 不让条溢出绘图区
    top = Math.min(top, H - BAR_H - 6);
    it.top = top;
    placed.push(it);
  });

  // 价格刻度
  let grid = '';
  for (let k = 0; k <= maxK; k++) {
    const y = yOf(k);
    grid += '<div class="axline" style="top:' + y.toFixed(1) + 'px"></div>';
    grid += '<div class="axl k" style="left:' + (PL - 10) + 'px;top:' + y.toFixed(1) + 'px;transform:translate(-100%,-50%)">'
      + (k === 0 ? '0' : k + 'k') + '</div>';
  }

  const bars = placed.map(it => {
    const p = it.p;
    const w = Math.max(6, it.x2 - it.x1);
    const narrow = w < 168;
    const hasDoc = !!(MAP[p.key] && MAP[p.key].length);
    const cls = ['bar', p.owner ? 'own' : '', hasDoc ? 'clickable' : 'todo', narrow ? 'narrow' : ''].filter(Boolean).join(' ');
    const dateTxt = ymLabel(it.s, origin) + ' – ' + ymLabel(it.e, origin);
    let inner = '<span class="nm">' + esc(p.name) + '</span>';
    if (!narrow) inner += '<span class="dt">' + dateTxt + '</span>';
    if (!narrow && p.system) inner += '<span class="sp">' + esc(p.system) + '</span>';
    if (!narrow && p.price != null) inner += '<span class="pr">' + (p.price >= 1 ? p.price + 'k' : p.price) + '</span>';
    if (!hasDoc && !narrow) inner += '<span class="lock">暂无文档</span>';
    if (p.owner) inner += '<span class="star">★</span>';

    return '<div class="' + cls + '" data-key="' + esc(p.key) + '"'
      + (hasDoc ? ' data-open="1"' : '')
      + ' title="' + esc(p.name + ' · ' + dateTxt + (p.chip ? ' · ' + p.chip : '')) + '"'
      + ' style="left:' + it.x1.toFixed(1) + 'px;top:' + it.top.toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;'
      + 'background:' + (p.color || '#DCEEF8') + '">' + inner + '</div>';
  }).join('');

  return {
    h: H,
    html: '<div style="position:relative;height:' + H + 'px">' + timeMarks() + grid + bars + '</div>',
  };
}

/* ─────────── ② 软件 / 平台区 ─────────── */
function buildSoftware() {
  const list = cfg.software || [];
  const layers = cfg.layers || ['PC 端上位机', '移动端 App', '云端 / SaaS', '设备端固件'];
  if (!list.length) return { html: '<div class="md-p">（未配置软件项目）</div>', h: 120 };

  const LAYER_H = 48, BAR_H2 = 26;
  const H = YEAR_H + layers.length * LAYER_H + 12;
  const layerY = name => {
    const i = Math.max(0, layers.indexOf(name));
    return YEAR_H + i * LAYER_H + (LAYER_H - BAR_H2) / 2;
  };

  let grid = '';
  layers.forEach((name, i) => {
    const y = YEAR_H + i * LAYER_H + LAYER_H / 2;
    grid += '<div class="axline" style="top:' + (YEAR_H + i * LAYER_H).toFixed(1) + 'px"></div>';
    grid += '<div class="axl k" style="left:' + (PL - 10) + 'px;top:' + y.toFixed(1) + 'px;transform:translate(-100%,-50%)">'
      + esc(name) + '</div>';
  });

  const items = list.map(p => {
    const s = Math.max(0, parseYM(p.start) - origin);
    const e = Math.min(months - 1, Math.max(s, parseYM(p.end) - origin));
    return { p, s, e, x1: x(s), x2: xEnd(e), top: layerY(p.layer) };
  }).sort((a, b) => a.s - b.s);

  // 同层重叠时轻微错位
  items.forEach((it, i) => {
    let top = it.top, guard = 0;
    while (guard++ < 20) {
      const hit = items.slice(0, i).find(q =>
        Math.abs(q.top - top) < 2 && it.x1 < q.x2 + 4 && it.x2 > q.x1 - 4);
      if (!hit) break;
      top = hit.top + BAR_H2 + 2;
    }
    it.top = top;
  });

  const bars = items.map(it => {
    const p = it.p;
    const w = Math.max(6, it.x2 - it.x1);
    const narrow = w < 150;
    const hasDoc = !!(MAP[p.key] && MAP[p.key].length);
    const cls = ['bar', p.owner ? 'own' : '', hasDoc ? 'clickable' : 'todo', narrow ? 'narrow' : ''].filter(Boolean).join(' ');
    const dateTxt = ymLabel(it.s, origin) + ' – ' + ymLabel(it.e, origin);
    let inner = '<span class="nm">' + esc(p.name) + '</span>';
    if (!narrow) {
      inner += '<span class="dt">' + dateTxt + '</span>';
      if (p.form) inner += '<span class="sp">' + esc(p.form) + '</span>';
    }
    if (!hasDoc && !narrow) inner += '<span class="lock">暂无文档</span>';
    if (p.owner) inner += '<span class="star">★</span>';
    return '<div class="' + cls + '" data-key="' + esc(p.key) + '"'
      + (hasDoc ? ' data-open="1"' : '')
      + ' title="' + esc(p.name + ' · ' + dateTxt) + '"'
      + ' style="left:' + it.x1.toFixed(1) + 'px;top:' + it.top.toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;'
      + 'background:' + (p.color || '#E7E4F7') + '">' + inner + '</div>';
  }).join('');

  return {
    h: H,
    html: '<div style="position:relative;height:' + H + 'px">' + timeMarks() + grid + bars + '</div>',
  };
}

/* ─────────── ③ 页脚 ─────────── */
function buildFoot() {
  const rows = cfg.foot || [];
  if (!rows.length) {
    return '<div class="fline"><span class="fk">说明</span>'
      + '<span class="ftag tip">★ 标记为本人主责项目；点击项目条查看对应深挖文档</span></div>';
  }
  return rows.map(r => {
    const tags = (r.tags || []).map(t =>
      '<span class="ftag ' + (t.k || '') + '">' + esc(t.v) + '</span>').join('');
    return '<div class="fline"><span class="fk">' + esc(r.k) + '</span>' + tags + '</div>';
  }).join('');
}

/* ─────────── 组装 ─────────── */
const hw = buildHardware();
const sw = buildSoftware();

const tplPath = cfg.template ? path.resolve(BASE, cfg.template) : DEFAULT_TEMPLATE;
let html = fs.readFileSync(tplPath, 'utf8');

const metaLines = (cfg.metaLines || [
  cfg.company || '',
  '统计区间 ' + cfg.start + ' – ' + cfg.end,
  '共 ' + ((cfg.hardware || []).length + (cfg.software || []).length) + ' 个项目',
]).filter(Boolean).map(s => esc(s)).join('<br>');

const out = html
  .replace(/\{\{TITLE\}\}/g, esc(cfg.title || '工作经历框架'))
  .replace(/\{\{SUBTITLE\}\}/g, esc(cfg.subtitle || ''))
  .replace(/\{\{META\}\}/g, metaLines)
  .replace(/\{\{SUB1\}\}/g, cfg.noteHardware || '纵轴为价格档，★ 为主责项目，点击项目条查看深挖文档。')
  .replace(/\{\{SUB2\}\}/g, cfg.noteSoftware || '纵轴为软件形态分层，时间轴与上图完全对齐。')
  .replace(/\{\{FOOT\}\}/g, buildFoot())
  .replace(/\{\{DOCS_JSON\}\}/g, JSON.stringify(DOCS))
  .replace(/\{\{MAP_JSON\}\}/g, JSON.stringify(MAP))
  .replace('id="plot1"></div>', 'id="plot1" style="height:' + hw.h + 'px">' + hw.html + '</div>')
  .replace('id="plot2"></div>', 'id="plot2" style="height:' + sw.h + 'px">' + sw.html + '</div>');

const outPath = path.resolve(BASE, cfg.out || '工作经历框架.html');
fs.writeFileSync(outPath, out, 'utf8');

const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log('✓ 已生成 ' + outPath + '  (' + kb + ' KB)');
console.log('  硬件 ' + ((cfg.hardware || []).length) + ' 条 / 软件 ' + ((cfg.software || []).length)
  + ' 条 / 可点击 ' + Object.values(MAP).filter(Boolean).length + ' 条');
