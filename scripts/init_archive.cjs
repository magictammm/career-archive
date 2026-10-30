#!/usr/bin/env node
/**
 * init_archive.cjs —— 初始化一套职业档案目录
 *
 * 用法：
 *   node init_archive.cjs --company "XX科技" --period "2023.09-2026.08" --out ./我的档案
 *   node init_archive.cjs --company "XX" --period "2023.09-2026.08" --out . --force
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
}
const company = arg('company');
const period = arg('period', '');
const out = path.resolve(arg('out', '.'));
const force = args.includes('--force');

if (!company) {
  console.error('缺少 --company');
  console.error('用法: node init_archive.cjs --company "公司名" --period "2023.09-2026.08" --out ./档案目录');
  process.exit(1);
}

const dirs = [
  '00_总览', '09_原始底稿', '项目深挖', '20_能力图谱', '30_职业曲线',
  '40_派生输出/简历', '40_派生输出/述职晋升', '40_派生输出/STAR故事库', '40_派生输出/面试问答',
  '99_证据登记',
];
dirs.forEach(d => fs.mkdirSync(path.join(out, d), { recursive: true }));

/* 时间线骨架 */
const tl = path.join(out, '09_原始底稿', 'K1-1_经历时间线.md');
if (!fs.existsSync(tl) || force) {
  fs.writeFileSync(tl, [
    '# ' + company + ' · 经历时间线',
    '',
    '> 真实口径 ≠ 简历口径。真实列写实际起止与职级，简历列写对外写法，两栏并存。',
    '',
    '| 阶段 | 真实 | 简历口径 |',
    '| - | - | - |',
    '| ' + company + ' | ' + (period || 'YYYY.MM–YYYY.MM') + ' | 同 |',
    '',
    '## 薪酬阶梯',
    '',
    '| 时间 | 岗位 | 月薪 | 涨幅 |',
    '| - | - | - | - |',
    '| | | | |',
    '',
    '## 跳涨点',
    '',
    '- ',
    '',
    '## Gap / 兼职 / 外包',
    '',
    '- ',
    '',
  ].join('\n'), 'utf8');
}

/* 项目台账骨架 */
const ledger = path.join(out, '00_总览', '项目台账.md');
if (!fs.existsSync(ledger) || force) {
  fs.writeFileSync(ledger, [
    '# ' + company + ' · 项目台账',
    '',
    '> 来源标注：`已核`＝原始文档有出处 / `口述`＝本人确认 / `待确认`＝暂无来源。',
    '',
    '| 代号 | 名称 | 我参与 | 价格档 | 系统 | 芯片/关键器件 | 主责 | 形态 | 来源 |',
    '| - | - | - | - | - | - | - | - | - |',
    '| | | | | | | | | |',
    '',
  ].join('\n'), 'utf8');
}

/* 配置骨架 */
const cfgPath = path.join(out, 'archive.config.json');
if (!fs.existsSync(cfgPath) || force) {
  const [a, b] = (period || '2023.09-2026.08').split(/[-–~]/);
  const toYM = s => {
    const m = /(\d{4})[.\-/](\d{1,2})/.exec(s || '');
    return m ? m[1] + '-' + String(m[2]).padStart(2, '0') : '2023-09';
  };
  const cfg = {
    title: company + ' 工作经历框架',
    subtitle: '点击任一条目查看项目深挖文档',
    company: company + (period ? ' ' + period : ''),
    start: toYM(a),
    end: toYM(b || a),
    docsDir: '项目深挖',
    out: '工作经历框架.html',
    hardware: [],
    software: [],
    layers: ['PC 端上位机', '移动端 App', '云端 / SaaS', '设备端固件'],
    foot: [],
  };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
}

/* 深挖模板副本 */
const tplSrc = path.join(__dirname, '..', 'assets', 'project-deepdive-template.md');
const tplDst = path.join(out, '项目深挖', '项目深挖-00_模板.md');
if (fs.existsSync(tplSrc) && (!fs.existsSync(tplDst) || force)) {
  fs.copyFileSync(tplSrc, tplDst);
}

console.log('✓ 已在 ' + out + ' 初始化档案目录');
console.log('  下一步：');
console.log('  1) 填 09_原始底稿/K1-1_经历时间线.md 与 00_总览/项目台账.md');
console.log('  2) 按 项目深挖-00_模板.md 逐项目写深挖 md');
console.log('  3) 填 archive.config.json 后运行 build_framework.cjs');
