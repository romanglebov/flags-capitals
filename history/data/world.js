/* Современные государства и внешние участники событий (краткие карточки).
   Подробную историю каждой страны можно добавить отдельным файлом — записи с тем же id дополняются. */
HistoryDB.add({
  source: 'data/world.js',
  entities: [
    // Государства, образовавшиеся при распаде СССР (кроме России)
    { id: 'ua', name: 'Украина', start: '1991-08-24', end: null, flags: [{ from: '1991', flag: { code: 'ua' } }], capitals: [{ name: 'Киев', from: '1991' }], summary: 'Независимость провозглашена 24 августа 1991 года, подтверждена референдумом 1 декабря 1991 года.' },
    { id: 'by', name: 'Беларусь', start: '1991-08-25', end: null, flags: [{ from: '1995', flag: { code: 'by' } }], capitals: [{ name: 'Минск', from: '1991' }] },
    { id: 'kz', name: 'Казахстан', start: '1991-12-16', end: null, flags: [{ from: '1992', flag: { code: 'kz' } }], capitals: [{ name: 'Алма-Ата', from: '1991' }, { name: 'Астана', from: '1997' }] },
    { id: 'uz', name: 'Узбекистан', start: '1991-08-31', end: null, flags: [{ from: '1991', flag: { code: 'uz' } }], capitals: [{ name: 'Ташкент', from: '1991' }] },
    { id: 'tm', name: 'Туркменистан', start: '1991-10-27', end: null, flags: [{ from: '1992', flag: { code: 'tm' } }], capitals: [{ name: 'Ашхабад', from: '1991' }] },
    { id: 'kg', name: 'Киргизия', start: '1991-08-31', end: null, flags: [{ from: '1992', flag: { code: 'kg' } }], capitals: [{ name: 'Бишкек', from: '1991' }] },
    { id: 'tj', name: 'Таджикистан', start: '1991-09-09', end: null, flags: [{ from: '1992', flag: { code: 'tj' } }], capitals: [{ name: 'Душанбе', from: '1991' }] },
    { id: 'az', name: 'Азербайджан', start: '1991-10-18', end: null, flags: [{ from: '1991', flag: { code: 'az' } }], capitals: [{ name: 'Баку', from: '1991' }] },
    { id: 'am', name: 'Армения', start: '1991-09-21', end: null, flags: [{ from: '1990', flag: { code: 'am' } }], capitals: [{ name: 'Ереван', from: '1991' }] },
    { id: 'ge', name: 'Грузия', start: '1991-04-09', end: null, flags: [{ from: '2004', flag: { code: 'ge' } }], capitals: [{ name: 'Тбилиси', from: '1991' }] },
    { id: 'md', name: 'Молдавия', start: '1991-08-27', end: null, flags: [{ from: '1990', flag: { code: 'md' } }], capitals: [{ name: 'Кишинёв', from: '1991' }] },
    { id: 'lt', name: 'Литва', start: '1990-03-11', end: null, flags: [{ from: '1988', flag: { code: 'lt' } }], capitals: [{ name: 'Вильнюс', from: '1990' }], summary: 'Независимость провозглашена в 1918 году; в 1940 году присоединена к СССР; восстановление независимости — 11 марта 1990 года.' },
    { id: 'lv', name: 'Латвия', start: '1990-05-04', end: null, flags: [{ from: '1990', flag: { code: 'lv' } }], capitals: [{ name: 'Рига', from: '1990' }], summary: 'Независимость провозглашена в 1918 году; в 1940 году присоединена к СССР; восстановлена в 1990–1991 годах.' },
    { id: 'ee', name: 'Эстония', start: '1991-08-20', end: null, flags: [{ from: '1990', flag: { code: 'ee' } }], capitals: [{ name: 'Таллин', from: '1991' }], summary: 'Независимость провозглашена в 1918 году; в 1940 году присоединена к СССР; восстановлена 20 августа 1991 года.' },
    // Соседи и участники событий
    { id: 'fi', name: 'Финляндия', start: '1917-12-06', end: null, flags: [{ from: '1918', flag: { code: 'fi' } }], capitals: [{ name: 'Хельсинки', from: '1917' }] },
    { id: 'pl', name: 'Польша', start: '1918-11-11', end: null, flags: [{ from: '1919', flag: { code: 'pl' } }], capitals: [{ name: 'Варшава', from: '1918' }] },
    { id: 'us', name: 'США', start: '1776-07-04', end: null, flags: [{ from: '1960', flag: { code: 'us' } }], capitals: [{ name: 'Вашингтон', from: '1800' }] },
    { id: 'jp', name: 'Япония', start: '-660', startLabel: 'по преданию 660 до н. э.', end: null, flags: [{ from: '1870', flag: { code: 'jp' } }], capitals: [{ name: 'Токио', from: '1869' }] },
    { id: 'de', name: 'Германия', start: '1871-01-18', end: null, flags: [{ from: '1949', flag: { code: 'de' } }], capitals: [{ name: 'Берлин', from: '1871' }] },
    { id: 'se', name: 'Швеция', start: '1523', end: null, flags: [{ from: '1906', flag: { code: 'se' } }], capitals: [{ name: 'Стокгольм', from: '1523' }] },
    { id: 'qing', name: 'Империя Цин', start: '1636', end: '1912-02-12', flags: [{ from: '1889', flag: { type: 'symbol', glyph: 'dragon', bg: '#F5C518' }, name: 'Флаг с драконом' }], capitals: [{ name: 'Пекин', from: '1644' }] },
    { id: 'byzantium', name: 'Византийская империя', start: '395', end: '1453-05-29', flags: [{ from: '395', flag: { type: 'symbol', glyph: 'cross', bg: '#5B2A86', fg: '#F2C230', conventional: true } }], capitals: [{ name: 'Константинополь', from: '395' }], religions: [{ name: 'Православное христианство', kind: 'orthodox', from: '395' }] },
    { id: 'khazaria', name: 'Хазарский каганат', start: '650', startLabel: 'ок. 650', end: '969', flags: [], capitals: [{ name: 'Итиль', from: '750' }], religions: [{ name: 'Тенгрианство, верхушка — иудаизм', kind: 'other', from: '650' }], summary: 'Каганат в Нижнем Поволжье и Северном Кавказе. Часть восточнославянских племён платила хазарам дань.' },
    { id: 'gdl', name: 'Великое княжество Литовское', start: '1236', end: '1795', flags: [{ from: '1400', flag: { type: 'initials', text: 'ВКЛ', bg: '#A01E2A' }, conventional: true }], capitals: [{ name: 'Вильна', from: '1323' }] },
    // Земли, на которые распалась Древняя Русь
    { id: 'kiev_pr', name: 'Киевское княжество', start: '1132', end: '1471', flags: [], capitals: [{ name: 'Киев', from: '1132' }] },
    { id: 'chernigov', name: 'Черниговское княжество', start: '1132', end: '1401', flags: [], capitals: [{ name: 'Чернигов', from: '1132' }] },
    { id: 'galicia', name: 'Галицко-Волынское княжество', start: '1199', end: '1392', flags: [], capitals: [{ name: 'Галич', from: '1199' }] },
    { id: 'polotsk', name: 'Полоцкое княжество', start: '1132', end: '1392', flags: [], capitals: [{ name: 'Полоцк', from: '1132' }] },
    { id: 'smolensk_pr', name: 'Смоленское княжество', start: '1127', end: '1404', flags: [], capitals: [{ name: 'Смоленск', from: '1127' }] },
  ],
  events: [],
});
