#!/usr/bin/env node
/* Проверка данных древа: node history/tools/validate.js
   Загружает все файлы из history/data/ в порядке, указанном в index.html, и печатает проблемы. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { console };
ctx.globalThis = ctx;
vm.createContext(ctx);
const run = f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

run('js/engine.js');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dataFiles = [...html.matchAll(/<script src="(data\/[^"]+)"/g)].map(m => m[1]);
const onDisk = fs.readdirSync(path.join(root, 'data')).filter(f => f.endsWith('.js')).map(f => 'data/' + f);
for (const f of onDisk) if (!dataFiles.includes(f)) console.warn(`! ${f} не подключён в index.html`);
dataFiles.forEach(run);

const DB = ctx.HistoryDB;
const issues = DB.validate();
const focus = process.argv[2] || 'ru';
console.log(`Сущностей: ${DB.entities.size}, событий: ${DB.events.length}, файлов: ${dataFiles.length}`);
if (DB.get(focus)) {
  console.log(`Главная линия «${focus}»: ${DB.trunk(focus).join(' ← ')}`);
  console.log(`Предков в древе: ${DB.ancestry(focus).length}`);
}
if (issues.length) {
  console.error(`\nПроблем: ${issues.length}`);
  issues.forEach(i => console.error(' - ' + i));
  process.exit(1);
}
console.log('Ошибок не найдено.');
