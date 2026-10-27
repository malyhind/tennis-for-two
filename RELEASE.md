# Tennis for Two 0.8.6 — Controller input and Fox CPU

## English

**Tennis for Two** is a browser reconstruction of the 1958 analog tennis game. This release improves controller input and clarifies who operates each controller.

### Changes in 0.8.6

- Knobs support dragging from the centre as well as rotation around the rim. Releasing a drag between animation frames no longer discards its last command.
- Button presses check the visible key bounds and pointer identity. Capture loss, cancellation and duplicate native clicks are handled explicitly.
- **Me and Fox** now assigns the right controller to the Fox CPU. **Two players** gives both controllers to people. **Me and Opponent** and **Gremlin vs Fox** remain available.
- Mode explanations and control instructions are available in Russian and English.

### Validation

41 automated checks passed across controller input, CPU play, mechanics and recorded-demo playback. In a circuit test, Fox returned six shots against ordinary manual commands. The nine numerical-model files and the recorded demo are unchanged. Browser verification of the updated interface remains pending.

The circuit runs in ngspice/WebAssembly; the browser calculates the oscilloscope display, and Planck.js calculates controller mechanics. Our code and writing are released under **MIT**; third-party licenses and attribution remain in place.

## Русский

**Tennis for Two** — браузерная реконструкция аналоговой теннисной игры 1958 года. Этот выпуск исправляет управление пультами и поясняет, кто управляет каждым игроком.

### Изменения в 0.8.6

- Ручки можно тянуть за центр или вращать по краю. При отпускании мыши между кадрами последняя команда больше не теряется.
- Нажатия кнопок проверяют границы видимой клавиши и принадлежность указателя. Обработаны потеря захвата мыши, отмена нажатия и повторный системный клик.
- В режиме **«Я и Лиса»** правым пультом теперь управляет компьютерная Лиса. Режим **«Два игрока»** предназначен для двух людей. **«Я и Противник»** и **«Гремлин против Лисы»** также доступны.
- Пояснения режимов и инструкции управления обновлены на русском и английском.

### Проверки

Прошла 41 автоматическая проверка управления, компьютерных игроков, механики и воспроизведения демо. В схемном тесте Лиса отбила шесть мячей против обычных ручных команд. Девять файлов численной модели и запись демо не изменены. Браузерная проверка обновлённого интерфейса ещё не завершена.

Схема работает в ngspice/WebAssembly; браузер рассчитывает экран осциллографа, Planck.js — механику пультов. Наш код и тексты выпускаются под **MIT**; лицензии и авторство сторонних компонентов сохранены.

[Play on GitHub Pages / Играть на GitHub Pages](https://malyhind.github.io/tennis-for-two/) · [Play in the Laboratory / Играть в Лаборатории](https://games.oopssre.ru/play/tennis-for-two/)

[Research on GitHub / Исследование на GitHub](https://malyhind.github.io/tennis-for-two/app/docs/research.html) · [Research in the Laboratory / Исследование в Лаборатории](https://games.oopssre.ru/lab/tennis-for-two.html)

A project of the Imperial School Laboratory / Проект Лаборатории Школы Империи.
