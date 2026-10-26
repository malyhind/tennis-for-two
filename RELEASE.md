# Tennis for Two 0.8.5

## English

**Tennis for Two** is a browser reconstruction of the analog tennis game created by William Higinbotham and Robert Dvorak at Brookhaven National Laboratory in 1958.

Two players hit a ball over a net, turn knobs to select the shot angle and press buttons to hit. The ball's motion comes from a simulation of the electrical circuit. The browser also calculates the oscilloscope image and the mechanical controls.

### Changes in 0.8.5

- A ready looped demo recording is included. It plays at real-time speed and remains off by default.
- Packaging retains the recording and verifies its data hashes; the recording files can be committed with the project.
- README and research materials provide direct links to GitHub Pages, research sources in the repository and the Laboratory website.
- The project version and English/Russian interface labels identify release 0.8.5.

### Reconstruction

The ball computer, passive supply, transistor display switch and oscilloscope electrical model share one continuous ngspice/WebAssembly simulation. The display follows the calculated beam signal: deflection, intensity, phosphor excitation and decay, and glass optics. Planck.js calculates knob inertia, friction and backlash, button travel, springs and contact closure.

Play with another person, against a CPU, or watch Gremlin and Fox play. CPU operators use the visible ball position and operate the ordinary controls. Demo replays recorded electrical signals while beam, phosphor and glass calculations run live.

The research includes Russian and English PDFs, archival drawings, connection diagrams, executable SPICE circuits, solver patches and interactive benches. The reconstruction follows surviving drawings and published restoration materials, including Peter Takacs's work. Adopted models, inferred parameters and accuracy limits are documented. Numerical checks validate the implemented model; exact identity with the lost original is not claimed.

### Play and research

- [Play in the Laboratory](https://games.oopssre.ru/en/play/tennis-for-two/)
- [Play on GitHub Pages](https://malyhind.github.io/tennis-for-two/)
- [Complete research on GitHub Pages](https://malyhind.github.io/tennis-for-two/app/docs/research.en.html)
- [Research text in the repository](https://github.com/malyhind/tennis-for-two/blob/main/app/docs/RESEARCH.en.md)
- [Research and materials in the Laboratory](https://games.oopssre.ru/en/lab/tennis-for-two.html)
- [Research PDF](https://malyhind.github.io/tennis-for-two/app/docs/Gremlin_Tennis_Research_0.8.4.en.pdf)
- [Browser checks and benches](https://malyhind.github.io/tennis-for-two/checks/index.en.html)

### License and authors

Our code, circuit descriptions and writing are released under **MIT**. Third-party components, archival drawings and manufacturer documents retain their licenses and attribution. Authors and reuse are documented in [ACKNOWLEDGEMENTS.md](https://github.com/malyhind/tennis-for-two/blob/main/ACKNOWLEDGEMENTS.md).

**Dmitry Malykhin / Gremlin.** Research and development in dialogue with ChatGPT (OpenAI).

A project of the [Imperial School Laboratory](https://games.oopssre.ru/en/lab/) at the [Imperial School Arcade](https://games.oopssre.ru/).

---

## Русский

**Tennis for Two** — браузерная реконструкция аналоговой теннисной игры, созданной Уильямом Хигинботамом и Робертом Двораком в Брукхейвенской национальной лаборатории в 1958 году.

Два игрока перебрасывают мяч через сетку: ручкой выбирают угол удара, кнопкой отбивают мяч. Движение мяча получается из расчёта электрической схемы. Браузер также рассчитывает изображение осциллографа и механику пультов.

### Изменения в 0.8.5

- Готовая зацикленная запись демо входит в комплект. Она воспроизводится в реальном темпе; по умолчанию демо выключено.
- Упаковка сохраняет запись и проверяет хеши её данных; файлы записи доступны для коммита вместе с проектом.
- README и материалы исследования содержат прямые ссылки на GitHub Pages, тексты в репозитории и сайт Лаборатории.
- Версия проекта и подписи русского и английского интерфейса обозначают выпуск 0.8.5.

### Реконструкция

Вычислитель мяча, пассивное питание, транзисторный переключатель изображения и электрическая модель осциллографа работают вместе в непрерывном расчёте ngspice/WebAssembly. Экран получает рассчитанный сигнал луча: отклонение, яркость, возбуждение и затухание люминофора, оптика стекла. Planck.js рассчитывает инерцию, трение и люфт ручек, ход кнопок, пружины и момент замыкания контактов.

Можно играть вдвоём, против компьютера или смотреть матч Гремлина и Лисы. Компьютерные игроки получают видимое положение мяча и управляют обычными пультами. В демо записанные электрические сигналы воспроизводятся с расчётом луча, люминофора и стекла во время просмотра.

Исследование включает PDF на русском и английском, архивные чертежи, схемы связей, исполняемые SPICE-схемы, правки решателя и интерактивные стенды. Основа реконструкции — сохранившиеся чертежи и опубликованные материалы аппаратных восстановлений, включая работу Питера Такача. Принятые модели, восстановленные параметры и границы точности описаны в исследовании. Численные проверки подтверждают реализованную модель; точное совпадение с утраченным оригиналом не заявляется.

### Игра и исследование

- [Играть в Лаборатории](https://games.oopssre.ru/play/tennis-for-two/)
- [Играть на GitHub Pages](https://malyhind.github.io/tennis-for-two/)
- [Полное исследование на GitHub Pages](https://malyhind.github.io/tennis-for-two/app/docs/research.html)
- [Текст исследования в репозитории](https://github.com/malyhind/tennis-for-two/blob/main/app/docs/RESEARCH.md)
- [Исследование и материалы в Лаборатории](https://games.oopssre.ru/lab/tennis-for-two.html)
- [Исследование в PDF](https://malyhind.github.io/tennis-for-two/app/docs/Gremlin_Tennis_Research_0.8.4.pdf)
- [Браузерные проверки и стенды](https://malyhind.github.io/tennis-for-two/checks/index.html)

### Лицензия и авторы

Наш код, схемные описания и тексты выпускаются под **MIT**. Сторонние компоненты, архивные чертежи и документы изготовителей сохраняют свои лицензии и авторство. Авторы и заимствования перечислены в [ACKNOWLEDGEMENTS.ru.md](https://github.com/malyhind/tennis-for-two/blob/main/ACKNOWLEDGEMENTS.ru.md).

**Дмитрий Малыхин / Гремлин.** Разработка и исследование в диалоге с ChatGPT (OpenAI).

Проект [Лаборатории Школы Империи](https://games.oopssre.ru/lab/) в составе [Аркадного зала Школы Империи](https://games.oopssre.ru/).
