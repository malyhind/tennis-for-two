# ngspice / EEcircuit: исходники, изменения и лицензии

## Текущая сборка 0.5.2

Gremlin ngspice45.2-tft-eval2: подготовленные выражения и производные,
O3, выборочные исключения синхронных функций Asyncify, без LTO.
Точные хеши файлов: PROVENANCE.json. Кумулятивная правка к исходному
ngspice45.2: source/ngspice45.2-tft-eval2.patch. Прежняя правка 0.5.1
сохранена отдельно как reference. Запись сборки: source/wasm-build-eval2.json.

[Устройство, замеры и границы проверки](../docs/prepared-evaluator.md).
[Необязательная пересборка](../../tools/build_solver.py) требует уже
активированный Emscripten. Значения по умолчанию: подготовленный
вычислитель, O3, без LTO. Ничего не устанавливает.


## Предыдущая сборка 0.5.1

Поставляется **Gremlin ngspice 45.2-tft-eval1**. Это модифицированная сборка
официального ngspice 45.2 с совместимым командным интерфейсом EEcircuit.
Текущие хеши JS/WASM, область изменений и сведения об эталоне записаны в
[PROVENANCE.json](PROVENANCE.json).

Наша правка [вычислителя выражений](source/ngspice45.2-tft-evaluator.patch)
сохраняет общие поддеревья в пределах одного вызова функции и сокращает
служебную обвязку известных синхронных вычислений. Номиналы, модели деталей
и допуски электрической схемы сохранены.

Использованы Emscripten **3.1.6~dfsg-7**, LLVM/Clang **15.0.7-14build3**,
Binaryen **108-1** из подписанного снимка Ubuntu. Запись происхождения пакетов:
[toolchain-record.json](source/toolchain-record.json); параметры сборки:
[wasm-build.json](source/wasm-build.json).
Лицензионные сведения Emscripten: [Emscripten-COPYRIGHT.txt](Emscripten-COPYRIGHT.txt).

[Результаты и границы проверки](../docs/engine-optimization.md) описывают
численное сравнение и ускорение. Необязательный
[инструмент пересборки](../../tools/build_solver.py) использует уже активированный
SDK и пишет результат в отдельный каталог. Установку SDK он не выполняет.
Побайтовая воспроизводимость на другом SDK или пути сборки не заявлена.

## Эталонная сборка игры 0.5.0

`spice.wasm` взят без изменения байтов из **eecircuit-engine 1.8.0**:

- npm: https://registry.npmjs.org/eecircuit-engine/-/eecircuit-engine-1.8.0.tgz
- upstream: https://github.com/eelab-dev/EEcircuit-engine
- commit: `f4dab6458d3865a1db9766008480690d23410c3a`
- версия в работающем WASM: `ngspice-45.2`
- SHA-256 WASM: `ed7995425b6f7af02db874539d13ea10d07759d5f2be6b79969343459ae886e4`

Фабрика `spice.js` выделена из `dist/eecircuit-engine.mjs`. Единственное
изменение её загрузки: встроенный data URL заменён соседним `spice.wasm`.
Добавлен export default. Исходный алгоритм ngspice не менялся нами.
Повторное выделение тех же байтов проверено инструментом
`tools/extract_vendor.py` в полном исходном проекте.

## Исходные архивы и лицензии

В комплект входят:

- [Полные исходники ngspice 45.2](source/ngspice-45.2.tar.gz), официальный архив
  https://sourceforge.net/projects/ngspice/files/ng-spice-rework/old-releases/45.2/ngspice-45.2.tar.gz/download
  с проверенным SHA-256
  `ba8345f4c3774714c10f33d7da850d361cec7d14b3a295d0dc9fd96f7423812d`.
- [Исходники сборки EEcircuit](source/EEcircuit-build-f4dab645.tar.gz): Dockerfile,
  run.sh, pre.js, hicum2_patch.sh, build-ngspice.sh, README и MIT LICENSE
  из указанного commit. Они содержат изменения интерфейса команд/Asyncify
  и состава сборки, применённые upstream к ngspice.
- [COPYING](COPYING): полный upstream-перечень лицензий ngspice и компонентов,
  включая тексты BSD, LGPL и MPL. Наш MIT LICENSE относится к нашим исходникам.
- [EEcircuit-LICENSE.txt](EEcircuit-LICENSE.txt), [AUTHORS](AUTHORS),
  [PROVENANCE.json](PROVENANCE.json).

ngspice mirror, использованный upstream:
https://github.com/danchitnis/ngspice-sf-mirror,
tag `ngspice-45.2`, commit `724dc77b9153dc75eaec474b1f7a44f1fcf5f362`.

Для самостоятельной пересборки в приложенном upstream run.sh следует выбрать
этот tag вместо автоматического latest и зафиксировать свой Emscripten SDK.
Точная версия SDK исходного эталонного npm-бинарника в доступной метаинформации не указана;
воспроизводимость поставленных байтов обеспечивается проверенным выделением
из конкретного npm-архива. Пересборка C/WASM для запуска готовой игры не нужна.

Приложенные исходники позволяют изучать и менять вычислитель. После замены
пары JS/WASM следует повторить численные проверки полного проекта.
