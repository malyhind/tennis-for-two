# Источники и происхождение

1. [BNL: The First Video Game?](https://www.bnl.gov/about/history/firstvideo.php)
   — история, управление, усилители, 36 Hz и ссылки на архив.
2. [Tennis Programming, EH1-900-1-3 A](https://www.bnl.gov/about/docs/videogameschematic1.jpg)
   — основа вычислительной части, дата чертежа 15.10.1958.
3. [Display, EH1-900-2-3 A](https://www.bnl.gov/about/docs/videogameschematic2.jpg)
   — лист отображения, дата 18.11.1959; включён в общий игровой тракт.
4. [Higinbotham's notes](https://www.bnl.gov/about/docs/Higinbotham_Notes.pdf)
   и протокол 1976 года, доступный на [странице архива BNL](https://www.bnl.gov/about/history/firstvideo.php),
   — свидетельства автора.
5. [BNL: аппаратная реконструкция](https://www.bnl.gov/newsroom/news.php?a=2964)
   — настоящие реле и германиевые транзисторы; аналоговый вычислитель заменён ИС.
6. [The Strong: Following the Bouncing Ball](https://www.museumofplay.org/blog/following-the-bouncing-ball-tennis-for-two-at-the-strong/)
   — история реконструкций и проблемы сохранившейся документации.
7. [MEGA T42](https://www.m-e-g-a.org/research-education/research/t42-tennis-for-two/)
   — независимая аппаратная реконструкция для сопоставления трактовки схемы.
8. [MIT, Angel De La Cruz и John Ryan, 2016](https://web.mit.edu/6.101/www/s2016/projects/angeld19_Project_Final_Report.pdf)
   — современная аналоговая реализация; её номиналы не приписываются машине 1958 года.
9. [TeTS](https://www.retrogamedeconstructionzone.com/2021/08/the-tennis-for-two-simulator-tets.html)
   — независимый браузерный симулятор для визуального сравнения. Автор оговаривает
   допущение о сопротивлении воздуха. Официальное авторство BNL и «миллиметровая
   точность» для этого проекта не подтверждены. Код, графика и звуки не копировались.

## Вычислитель

- [ngspice](https://ngspice.sourceforge.io/), версия встроенного движка 45.2.
- [EEcircuit-engine](https://github.com/eelab-dev/EEcircuit-engine), npm 1.8.0,
  commit `f4dab6458d3865a1db9766008480690d23410c3a`.
- Из пакета выделена существующая Emscripten-фабрика. Первоначальная сборка затем доработана: текущая версия и правки вычислителя описаны в `../vendor/source/wasm-build.json`. Остальные библиотеки моделей и
  высокоуровневая оболочка EEcircuit в игру не включались.
- Хеши и преобразования: `../vendor/PROVENANCE.json`. Лицензии ngspice и его
  компонентов сохранены в `../vendor/COPYING`, лицензия оболочки EEcircuit —
  `../vendor/EEcircuit-LICENSE.txt`.

Схема и наш интерфейс — самостоятельные исходники проекта. Точность численного
расчёта, полнота электрической модели и историческое соответствие описываются
раздельно в `fidelity.md`.

## Питер Такач: этапы аппаратного восстановления

- [BNL: Celebrating 'Tennis for Two' With A Video Game Extravaganza,
  03.11.2008](https://www.bnl.gov/newsroom/news.php?a=2964). Участники
  юбилейной реконструкции, сохранённые реле/транзисторы и замена вычислителя.
- [Peter Takacs: Resurrecting One of the World's 1st Video Games,
  14.12.2010](https://scienceblogs.com/brookhaven/2010/12/14/resurrecting-one-of-the-worlds).
  Страница прямо атрибутирует гостевой текст Такачу, хотя запись опубликована
  аккаунтом ksnyder. В ней описаны выбросы при релейных переключениях и подготовка
  перехода на восстановленный Donner Model 3400.
- [BNL: The First Video Game?](https://www.bnl.gov/about/history/firstvideo.php).
  Объяснение Такача о коммутации трёх составляющих изображения с частотой 36 Hz.

Эти материалы не содержат полной схемы нашего усилителя и не подтверждают
численно выбранные нами R/L, усиление, полосу, защиту и калибровку. Их выводы
используются для постановки проверок и разграничения разных реконструкций.

## Электронный переключатель, релиз 0.4

- Схема BNL EH1-900-2-3 A от 18.11.1959 — соединения и номиналы генератора,
  делителя, драйверов и шести ключей.
- [RCA Transistor Manual, Technical Series SC-11, 1964, печатная стр. 131](https://manuals.plus/m/db7d541ddf75928e77eb98d8259325b533a3e448761ab34769aa85c3f69a86b6.pdf):
  тип Ge PNP и типичная малосигнальная рабочая точка 2N140. Модель SPICE
  нами не извлечена из справочника: её дополнительные параметры заданы явно.
- Первичный исходный код ngspice 45.2, `src/frontend/outitf.c`, из приложенного
  архива `../vendor/source/ngspice-45.2.tar.gz`: проверка поведения `interp`.

Таблица всех параметров и границ: `display-model.json`; пояснение топологии:
`display-fidelity.md`. Частота 36 Hz сопоставляется с полным циклом как
исследовательская интерпретация слов Такача; пофазных измерений в его тексте нет.

## Дополнительные первичные документы

- [B3] William Higinbotham, 1976 technical account, BNL archive: https://www.bnl.gov/about/docs/higinbotham_deposition.pdf

- [G1] RCA Semiconductor Products1960: https://n4trb.com/AmateurRadio/SemiconductorHistory/RCA_Semiconductor_Products_1960.pdf

- [G2] RCA Transistor ManualSC-12,1966,printed122: https://ftpmirror.your.org/pub/misc/bitsavers/components/rca/1966_SC-12_RCA_Transistor_Manual.pdf

- [G3] Taitron1N100 datasheet, modern: https://www.taitroncomponents.com/catalog/Datasheet/1N100.pdf

- [A1] Dana Peckworth, Resolution of complex decay curves by analog computer techniques,1959,printed4–5,37: https://archive.org/download/resolutionofcomp00peck/resolutionofcomp00peck.pdf

- [C1] DuMont5ADP1 manufacturer data: https://frank.pocnet.net/sheets/041/5/5ADP1.pdf

- [C2] RCA5ADP1 manufacturer data,curves92CM-9099,7910,6820R1: https://frank.pocnet.net/sheets/049/5/5ADP1.pdf

- [C3] RCAHB3PictureTubeGuide,P1curve92CM-5380R2,1951-02-01,PDFpage31: https://frank.pocnet.net/sheets/049/suppinfo/rca_hb3_pic.pdf

- [A2] Donner Scientific, Operating Handbook Model 3000, October1957, printed1–2,5–7,25–26, schematicE25: https://www.analogmuseum.org/library/donner_3000.PDF

- [A3] Irvin H.Swift, Computing amplifier, US2581456A, published1952-01-08: https://patents.google.com/patent/US2581456A/en
