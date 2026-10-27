"""Build the public research pages and PDF from one audited Markdown source.
Uses only the already installed Python/ReportLab/Matplotlib/Pillow toolchain.
No installation, network request, circuit change or catalogue edit is performed.
"""
from pathlib import Path
import json,re,html,shutil,math,hashlib
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'app/docs';F=D/'figures'
LANG='ru'
PDFNAME='Gremlin_Tennis_Research_0.8.4.pdf'
EN_LABELS=json.loads((D/'report-labels.en.json').read_text())
DOCUMENT_CHAPTERS=('RESEARCH','reuse-audit','METHODS','SCHEMATICS','cpu-research',
    'NEXT-STAGE','mechanics','engine-comparison','glass-optics',
    'continuation-recovery','demo-mode','CONTACTS')

def document_reference(value):
    """Publish source-document references as readable research sections."""
    name=Path(value).name
    if not name.endswith('.md'):return None
    stem=name[:-3].removesuffix('.en');suffix='.en' if LANG=='en' else ''
    if stem=='PROJECT':return ('Complete research' if LANG=='en' else 'Полное исследование','research'+suffix+'.html#overview','overview')
    if stem=='sources':return ('Research sources' if LANG=='en' else 'Источники исследования','research'+suffix+'.html#sources','sources')
    if stem not in DOCUMENT_CHAPTERS:return None
    text=(D/(stem+suffix+'.md')).read_text()
    title=next(line[2:].strip() for line in text.splitlines() if line.startswith('# '))
    anchor='overview' if stem=='RESEARCH' else stem.lower()
    return title,'research'+suffix+'.html#'+anchor,anchor

def heading_anchor(value):
    for name in DOCUMENT_CHAPTERS+('sources',):
        ref=document_reference(name+'.md')
        if ref and ref[0]==value:return ref[2]
    return None

def local_resource(value):
    """Link only files actually distributed beside the public research."""
    if not re.fullmatch(r'[\w./-]+',value) or '.' not in value:return None
    candidates=(D/value,ROOT/'app'/value,ROOT/value,ROOT/'app/vendor/source'/value)
    for path in candidates:
        path=path.resolve()
        if path.is_relative_to(ROOT/'app') and path.is_file():
            import os
            return Path(os.path.relpath(path,D)).as_posix()
    return None
def label(value):return EN_LABELS.get(value,value) if LANG=='en' else value
def figure_path(name):return F/(name+('.en' if LANG=='en' else '')+'.png')
def save_figure(fig,name):
    from matplotlib.text import Text
    if LANG=='en':
        for item in fig.findobj(match=Text):item.set_text(label(item.get_text()))
    fig.tight_layout();fig.savefig(figure_path(name),dpi=180)

def blocks(text):
    lines=text.splitlines();i=0
    while i<len(lines):
        s=lines[i].strip()
        if not s:i+=1;continue
        if s.startswith('```'):
            lang=s[3:];i+=1;part=[]
            while i<len(lines) and not lines[i].startswith('```'):part.append(lines[i]);i+=1
            yield 'code','\n'.join(part);i+=1;continue
        m=re.match(r'^(#{1,4}) (.+)',s)
        if m:yield 'h'+str(len(m[1])),m[2];i+=1;continue
        m=re.match(r'^!\[([^]]*)\]\(([^)]+)\)$',s)
        if m:yield 'image',(m[1],m[2]);i+=1;continue
        if s.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                cells=[c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.match(r'^:?-+:?$',c) for c in cells):rows.append(cells)
                i+=1
            yield 'table',rows;continue
        if s.startswith('- '):
            part=s[2:];i+=1
            while i<len(lines) and lines[i].strip() and not re.match(r'^(?:-|#|\||```)',lines[i].strip()):part+=' '+lines[i].strip();i+=1
            yield 'li',part;continue
        part=s;i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'^(?:-|#|\||```|!\[)',lines[i].strip()):part+=' '+lines[i].strip();i+=1
        yield 'p',part

def inline(text,pdf=False):
    # Protect explicit inline markup before automatic URL linking.
    tokens=[]
    def keep(value):tokens.append(value);return '\x01'+str(len(tokens)-1)+'\x02'
    def anchor(title,url):
        attrs=' color="#3e6138"' if pdf else ''
        return '<a href="'+html.escape(url,quote=True)+'"'+attrs+'>'+title+'</a>'
    def code(m):
        value=m[1];ref=document_reference(value)
        if ref:return keep(anchor(html.escape(ref[0]),'#'+ref[2] if pdf else ref[1]))
        title=('<font face="Mono" size="8">' if pdf else '<code>')+html.escape(value)+('</font>' if pdf else '</code>')
        resource=local_resource(value)
        return keep(anchor(title,resource) if resource else title)
    text=re.sub(r'`([^`]+)`',code,text)
    def link(m):
        title,url=m[1],m[2]
        ref=document_reference(url)
        if ref:url='#'+ref[2] if pdf else ref[1]
        return keep(anchor(html.escape(title),url))
    text=re.sub(r'\[([^]]+)\]\(([^)]+)\)',link,text)
    text=html.escape(text)
    def bare_url(m):
        url=m[1].rstrip('.,;!');tail=m[1][len(url):]
        return '<a href="'+url+'">'+url+'</a>'+tail
    text=re.sub(r'(https?://[^\s<>]+)',bare_url,text)
    text=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',text)
    text=re.sub(r'\*([^*]+)\*',r'<i>\1</i>',text)
    return re.sub(r'\x01(\d+)\x02',lambda m:tokens[int(m[1])],text)

CSS='''*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#e9e6da;color:#292c25;font:17px/1.75 system-ui,-apple-system,Arial,sans-serif}a{color:#3e6138;text-underline-offset:4px;overflow-wrap:anywhere}header,main,footer{max-width:1080px;margin:auto;padding:24px 28px}header{border-bottom:1px solid #c3c4b6;display:flex;gap:20px;justify-content:space-between;align-items:center;font:12px/1.6 ui-monospace,monospace}header a{color:inherit;text-decoration:none}.brand{letter-spacing:.08em}.edition{color:#707365}h1{font:500 clamp(32px,5vw,54px)/1.15 Georgia,serif;max-width:900px;letter-spacing:-.025em;margin:40px 0 24px}h2{font:500 30px/1.25 Georgia,serif;margin:60px 0 20px;scroll-margin-top:24px}h3{font-size:20px;margin-top:34px}p,li{max-width:820px}p{margin:18px 0}li{margin:10px 0}nav.actions{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0 34px}nav.actions a{display:inline-block;padding:10px 16px;border:1px solid #939a83;border-radius:4px;text-decoration:none;background:#f4f1e8;color:#292c25;font-size:14px}.toc{border-top:1px solid #939a83;border-bottom:1px solid #c3c4b6;padding:18px 0;columns:2;column-gap:36px}.toc a{display:block;font-size:14px;margin:8px 0;break-inside:avoid}figure{margin:30px 0;padding:18px;background:#f6f3e9;border:1px solid #c3c4b6;border-radius:5px}figure img{display:block;max-width:100%;max-height:750px;margin:auto;object-fit:contain}figcaption{font-size:13px;color:#626857;margin-top:12px;max-width:850px}.table-wrap{overflow:auto;margin:28px 0;border:1px solid #c3c4b6;border-radius:4px}table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.6}th,td{text-align:left;vertical-align:top;padding:13px 15px;border-bottom:1px solid #c3c4b6;min-width:130px}th{background:#dce0d2;font-weight:600}tr:last-child td{border:0}code,pre{font-family:ui-monospace,monospace;font-size:.84em}code{background:#dfe1d4;padding:2px 4px;border-radius:3px;overflow-wrap:anywhere}pre{overflow:auto;padding:18px;background:#dfe1d4;line-height:1.6}footer{margin-top:55px;border-top:1px solid #939a83;font-size:13px;color:#626857}.notice{border-left:3px solid #3e6138;padding:8px 20px;background:#dfe3d4;max-width:820px}.skip{position:absolute;top:-80px;left:20px;background:#fff;padding:8px}.skip:focus{top:10px}:focus-visible{outline:3px solid #3e6138;outline-offset:3px}@media(max-width:600px){body{font-size:16px}header,main,footer{padding:18px}header{align-items:flex-start}.edition{max-width:120px;text-align:right}.toc{columns:1}h2{font-size:26px;margin-top:44px}figure{padding:10px;margin:24px 0}th,td{padding:10px;font-size:13px}}@media print{header,.actions,.toc{display:none}body{background:#fff;color:#000}main{max-width:none}h2{break-after:avoid}.table-wrap,figure{break-inside:avoid}}'''

CSS+='''
.research-layout{display:grid;grid-template-columns:225px minmax(0,1fr);gap:36px;align-items:start}.research-text{min-width:0}.research-layout>.toc{position:sticky;top:24px;columns:auto;max-height:calc(100vh - 48px);max-height:calc(100dvh - 48px);overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;margin:0;padding:14px 10px 14px 0}.research-layout>.toc a{font-size:12px;line-height:1.6;margin:10px 0}.toc-title{font:12px ui-monospace,monospace;margin:0 0 12px!important;color:#626857}.research-text>h2:first-child{margin-top:0}@media(max-width:900px){.research-layout{display:block}.research-layout>.toc{position:static;max-height:300px;margin-bottom:28px;padding:14px 8px}.research-layout>.toc a{font-size:13px}}@media print{.research-layout{display:block}.research-layout>.toc{display:none}}
'''

def project_resources(pdf=False):
    lab='https://games.oopssre.ru/en/lab/' if LANG=='en' else 'https://games.oopssre.ru/lab/'
    items=[('Imperial School Laboratory' if LANG=='en' else 'Лаборатория Школы Империи',lab),
           ('Imperial School Arcade' if LANG=='en' else 'Аркадный зал Школы Империи','https://games.oopssre.ru/')]
    color=' color="#3e6138"' if pdf else ''
    return ' · '.join('<a href="'+url+'"'+color+'>'+title+'</a>' for title,url in items)

def render_html(source,name,title):
    parts=[];toc=[];count=0;first_h1=True;offset=0
    for kind,data in blocks(source):
        if kind.startswith('h'):
            if kind=='h1':
                if first_h1:first_h1=False
                else:offset=1
            tag='h'+str(min(6,int(kind[1])+offset))
            count+=1;anchor='s'+str(count);named=heading_anchor(data)
            alias='<span id="'+named+'"></span>' if named else ''
            parts.append(f'<{tag} id="{anchor}">{alias}{inline(data)}</{tag}>')
            if tag=='h2':toc.append(f'<a href="#{anchor}">{html.escape(data)}</a>')
        elif kind=='table':
            if len({len(r) for r in data})!=1:raise ValueError('Unequal table columns')
            parts.append('<div class="table-wrap"><table><thead><tr>'+''.join('<th scope="col">'+inline(c)+'</th>' for c in data[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>' for row in data[1:])+'</tbody></table></div>')
        elif kind=='image':
            caption,path=data;parts.append('<figure><a href="'+html.escape(path)+'"><img loading="lazy" src="'+html.escape(path)+'" alt="'+html.escape(caption)+'"></a><figcaption>'+html.escape(caption)+'</figcaption></figure>')
        elif kind=='code':parts.append('<pre><code>'+html.escape(data)+'</code></pre>')
        elif kind=='li':parts.append('<ul><li>'+inline(data)+'</li></ul>')
        else:parts.append('<p>'+inline(data)+'</p>')
    info_url='https://games.oopssre.ru/en/lab/tennis-for-two.html' if LANG=='en' else 'https://games.oopssre.ru/lab/tennis-for-two.html'
    research_href='research.en.html' if LANG=='en' else 'research.html'
    document_link=('<a href="'+info_url+'">'+('About the project' if LANG=='en' else 'О проекте')+'</a>') if name.startswith('research') else ('<a href="'+research_href+'">'+('Full research' if LANG=='en' else 'Полное исследование')+'</a>')
    nav='<nav class="actions" aria-label="Материалы"><a href="../index.html">Запустить прибор</a><a href="'+PDFNAME+'" download>Исследование · PDF</a>'+document_link+'<a href="reuse-audit.html">Авторы и заимствования</a></nav>'
    body=''.join(parts);first=body.find('</h1>')+5
    if toc:
        outline='<nav class="toc" aria-label="Содержание"><p class="toc-title">'+('Contents' if LANG=='en' else 'Содержание')+'</p>'+''.join(toc)+'</nav>'
        body=body[:first]+nav+'<div class="research-layout">'+outline+'<article class="research-text">'+body[first:]+'</article></div>'
    else:
        body=body[:first]+nav+body[first:]
    graph={'@context':'https://schema.org','@type':'TechArticle','headline':title,'inLanguage':LANG,'version':'0.8.4','dateModified':'2026-10-27','author':{'@type':'Person','name':'Дмитрий Малыхин'},'license':'https://opensource.org/license/mit','description':'Исследование схемной реконструкции Tennis for Two: источники, модель, проверки и границы точности.'}
    page='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta name="description" content="'+html.escape(graph['description'])+'"><meta name="ai-disclosure" content="ai-assisted"><title>'+html.escape(title)+' · Лаборатория Школы Империи</title><link rel="stylesheet" href="research.css"><script type="application/ld+json">'+json.dumps(graph,ensure_ascii=False).replace('<','\\u003c')+'</script></head><body><a class="skip" href="#research">К исследованию</a><header><a class="brand" href="../index.html">G / ЛАБОРАТОРИЯ ШКОЛЫ ИМПЕРИИ</a><span class="edition">TENNIS FOR TWO<br>ИССЛЕДОВАНИЕ / 0.8.4</span></header><main id="research">'+body+'</main><footer>Дмитрий Малыхин · Разработка и исследование в диалоге с ChatGPT (OpenAI). Наш код и тексты: MIT; сторонние части сохраняют свои лицензии. Численная проверка относится к выбранной модели.</footer></body></html>'
    suffix='.en' if LANG=='en' else ''
    if LANG=='en':
        for a,b in sorted(EN_LABELS.items(),key=lambda pair:-len(pair[0])):page=page.replace(a,b)
        page=page.replace('<html lang="ru">','<html lang="en">')
        page=page.replace('href="research.html"','href="research.en.html"').replace('href="reuse-audit.html"','href="reuse-audit.en.html"')
    other=name.replace('.en.html','.html') if LANG=='en' else name.replace('.html','.en.html')
    ru=name if LANG=='ru' else other;en=other if LANG=='ru' else name
    switch='<nav class="doc-language" aria-label="Language / Язык"><a data-document-language="ru" lang="ru" href="'+ru+'"'+(' aria-current="true"' if LANG=='ru' else '')+'>RU</a><a data-document-language="en" lang="en" href="'+en+'"'+(' aria-current="true"' if LANG=='en' else '')+'>EN</a></nav>'
    page=page.replace('<span class="edition">',switch+'<span class="edition">')
    page=page.replace('</head>','<link rel="icon" type="image/svg+xml" href="../icons/tennis.svg"><link rel="alternate" hreflang="ru" href="'+ru+'"><link rel="alternate" hreflang="en" href="'+en+'"></head>')
    page=page.replace('G / '+label('ЛАБОРАТОРИЯ ШКОЛЫ ИМПЕРИИ'),'<img src="../icons/laboratory.svg" alt="" width="28" height="28"> '+label('ЛАБОРАТОРИЯ ШКОЛЫ ИМПЕРИИ'))
    page=page.replace('href="../index.html"','href="../index.html?lang='+LANG+'"')
    page=page.replace('</body>','<script type="module" src="../document-language.js"></script></body>')
    lab='https://games.oopssre.ru/en/lab/' if LANG=='en' else 'https://games.oopssre.ru/lab/'
    page=page.replace('<a class="brand" href="../index.html?lang='+LANG+'"','<a class="brand" href="'+lab+'"')
    page=page.replace('<footer>','<footer><nav aria-label="'+('Project resources' if LANG=='en' else 'Ресурсы проекта')+'">'+project_resources()+'</nav><p>').replace('</footer>','</p></footer>')
    (D/name).write_text(page)

def evidence_markdown():
    j=json.loads((D/'joint-validation.json').read_text());w=json.loads((D/'worker-validation.json').read_text());p=json.loads((D/'joint-phase-validation.json').read_text());n=json.loads((D/'joint-native-validation.json').read_text())
    rows=['## Численные проверки модели','','Числа относятся к выбранным сценариям Linux/Node/WASM и одной электрической модели; это не аппаратная верификация.','','| Проверка | Измерение | Область |','| --- | --- | --- |']
    def add(a,b,c):rows.append('| '+a+' | '+b+' | '+c+' |')
    add('Общий тракт',str(sum(bool(t.get('passed')) for t in j['tests']))+' / '+str(len(j['tests'])),'Схема, след луча, продолжение расчёта, экран и CPU')
    add('Перенос координат',format(j['metrics']['checkpoints']['maxBallErrorV']*1e6,'.3f')+' µV','Контрольная траектория, несколько перезапусков')
    for key,label in [('production','Штатный перенос'),('stress','Частые переносы')]:add(label,format(p[key]['maxEdgeShift_s']*1e6,'.3f')+' µs','Максимальный сдвиг фронтов в указанном окне')
    add('Холодный старт: координаты',format(max(n['maxDifferenceV'][:2])*1000,'.3f')+' mV','Полное окно 0,4 s, включая установление')
    add('Холодный старт: одноимённые фронты',format(n['edgeComparison']['maxShift_s']*1e6,'.3f')+' µs','Линеаризованная сетка 20 µs; полный отчёт сохраняет исходные максимумы')
    add('Холодный старт: вне фронтов',format(max(n['settled']['maxDifferenceV'])*1000,'.3f')+' mV','Исключены явно заданные окна ±150 µs; это отдельный критерий')
    add('Холодный старт: максимумы',format(max(n['maxDifferenceV']),'.3f')+' V','Покомпонентный порог 20 mV на переключениях: '+('пройден' if n['strictPointwise20mVPassed'] else 'не пройден'))
    for t in w['tests']:
        if 'simulated_s' in t:add('Перенос Worker (форсированный)' if 'forcedHeapBoundBytes' in t else 'Производственный Worker',format(t['simulated_s'],'.3f')+' s / '+str(t.get('hits','—'))+' ударов',str(t['workerRestarts'])+' переносов; пик WASM '+format(t['peakHeapBytes']/1024**2,'.2f')+' MiB')
        elif not t.get('passed'):add('Производственный Worker','Ошибка','См. полный журнал; не засчитана как успешный прогон')
    warm=json.loads((D/'joint-native-warm-validation.json').read_text())
    add('Общее начальное состояние: координаты',format(max(warm['maxDifferenceV'][:2])*1000,'.3f')+' mV','Native и WASM продолжают одну принятую точку после 0,25 s')
    add('Общее состояние: фронты / вне фронтов',format(warm['edgeComparison']['maxShift_s']*1e6,'.3f')+' µs / '+format(max(warm['settled']['maxDifferenceV'])*1000,'.3f')+' mV','Отдельно от холодного старта; исходные максимумы сохраняются')
    rows+=['','### Границы результата','','При холодном запуске делитель может выбрать разный начальный порядок B/C. Одноимённые сигналы в таком случае различаются и вне фронтов: это сохранённый неуспешный критерий сравнения холодного старта. Дополнительный опыт с общей принятой начальной точкой отдельно проверяет численное продолжение одинакового состояния. Все неуспешные опыты сохранены. Начальный строгий профиль 25 µs / 10⁻⁶ увеличил память прямого сеанса и обнаружил ошибку продолжения в новом Worker. Рабочая версия сначала устанавливает принятую начальную точку с прежними входами на микросекундном интервале, затем применяет новую команду пульта. Повторного включения прибора и нового розыгрыша при этом нет. Датированные журналы проверок доступны в исходниках исследования рядом с описанием сценариев.','','Серия E1 содержит 40 завершённых переходных случаев, два обрыва по сходимости и один тайм-аут, а также два завершённых AC-опыта. Они описывают исследовательские варианты, не подменяют проверки рабочего прибора.','','Скорость Mac M1, Firefox и аппаратный WebGL пока отдельно не измерены. В браузере доступен резервный CPU-рендер. Полные журналы: joint-validation.json, worker-validation.json, joint-phase-validation.json, joint-native-validation.json и joint-native-warm-validation.json.']
    return '\n'.join(rows)+'\n'

def figures():
    import numpy as np
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from PIL import Image
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'figure.facecolor':'#f7f5ee','axes.facecolor':'#f7f5ee','axes.grid':True,'grid.alpha':.2})
    a=np.fromfile(ROOT/'tests/fixtures/joint-beam.f64',dtype='<f8').reshape(-1,4)
    fig,axes=plt.subplots(3,1,figsize=(8,6),sharex=True)
    mask=(a[:,0]>.20)&(a[:,0]<.24)
    for ax,col,label in zip(axes,[1,2,3],['Пластины X, V','Пластины Y, V','Ток луча, µA']):
        ax.plot(a[mask,0]*1000,a[mask,col]*(1e6 if col==3 else 1),color='#3e6138',lw=.8);ax.set_ylabel(label)
    axes[-1].set_xlabel('Время единой схемы, ms');fig.suptitle('Принятые адаптивные точки SPICE: электрический вход экрана',fontsize=12);fig.tight_layout();save_figure(fig,'joint-trace');plt.close(fig)
    t=np.linspace(0,.24,500);fig,ax=plt.subplots(figsize=(8,3.1));fast=(1-.047185863151480566)*np.exp(-t/.002858327788613309);slow=.047185863151480566*np.exp(-t/.020931598704111952)
    ax.semilogy(t*1000,fast+slow,label='Сумма',color='#3e6138');ax.semilogy(t*1000,fast,'--',label='2,858 ms');ax.semilogy(t*1000,slow,':',label='20,932 ms, доля 4,719%');ax.set(xlabel='Время после возбуждения, ms',ylabel='Относительная энергия',ylim=(1e-5,1));ax.legend();fig.tight_layout();save_figure(fig,'phosphor-decay');plt.close(fig)
    # A clear topology drawing; executable netlists, rather than this diagram,
    # define all component connections.
    fig,ax=plt.subplots(figsize=(8,5.3));ax.set_axis_off();ax.set(xlim=(0,10),ylim=(0,7.2))
    items=[(5,6.5,'Пульты людей / CPU','Ручка и кнопка, общие входы'),(5,5.15,'Вычислитель мяча','Банки C, интеграторы, реле и контакты'),(5,3.8,'Переключатель изображения','15 PNP: генератор, делитель, шесть ключей'),(5,2.45,'Электрическая макромодель осциллографа','Входные R/C, усиление, полюса, пластины, ток'),(5,.75,'Луч и люминофор','Гауссов интеграл woscope, время SPICE; GPU / CPU')]
    for x,y,title,sub in items:
        ax.text(x,y,title+'\n'+sub,ha='center',va='center',fontsize=10,bbox=dict(boxstyle='round,pad=.7',fc='#e1e6d7',ec='#62765a'))
    for i in range(4):ax.annotate('',xy=(5,items[i+1][1]+.45),xytext=(5,items[i][1]-.45),arrowprops=dict(arrowstyle='->',color='#3e6138',lw=1.5))
    ax.text(.1,3.9,'Одна матрица\nngspice',rotation=90,va='center',ha='center',color='#3e6138');ax.plot([.7,.7],[2.05,5.6],color='#3e6138',lw=2)
    fig.tight_layout();save_figure(fig,'joint-topology');plt.close(fig)
    # Native/WASM edge detail: the visible spike explains why a single max
    # voltage metric is insufficient at a switching event.
    ap=ROOT/'tests/results/joint-native-warm/native.dat';bp=ROOT/'tests/results/joint-native-warm/wasm.dat'
    if ap.exists() and bp.exists():
        aa=np.loadtxt(ap);bb=np.loadtxt(bp);idx=np.argmax(np.abs(aa[:,3]-bb[:,3]));center=aa[idx,0];mask=np.abs(aa[:,0]-center)<.00035
        fig,ax=plt.subplots(figsize=(8,3.4));ax.plot((aa[mask,0]-center)*1e6,aa[mask,3],label='Native 45.2',color='#3e6138');ax.plot((bb[mask,0]-center)*1e6,bb[mask,3],'--',label='WASM eval2',color='#a56338');ax.set(xlabel='Время относительно максимума расхождения, µs',ylabel='Пластины X, V');ax.legend();fig.tight_layout();save_figure(fig,'native-edge');plt.close(fig)

def make_pdf(source):
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import BaseDocTemplate,PageTemplate,Frame,Paragraph,Spacer,PageBreak,Table,TableStyle,Image,Preformatted,KeepTogether
    from reportlab.platypus.tableofcontents import TableOfContents
    def P(text,style):return Paragraph(label(text),style)
    from matplotlib import get_data_path
    fonts=Path(get_data_path())/'fonts/ttf'
    for name,file in [('Text','DejaVuSans.ttf'),('Text-Bold','DejaVuSans-Bold.ttf'),('Text-Italic','DejaVuSans.ttf'),('Mono','DejaVuSansMono.ttf')]:pdfmetrics.registerFont(TTFont(name,str(fonts/file)))
    pdfmetrics.registerFontFamily('Text',normal='Text',bold='Text-Bold',italic='Text-Italic',boldItalic='Text-Bold')
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle('BodyR',fontName='Text',fontSize=9.3,leading=14.5,spaceAfter=9,textColor=colors.HexColor('#292c25'),splitLongWords=True))
    styles.add(ParagraphStyle('H1R',parent=styles['BodyR'],fontName='Text-Bold',fontSize=22,leading=28,spaceBefore=20,spaceAfter=15,keepWithNext=True))
    styles.add(ParagraphStyle('H2R',parent=styles['BodyR'],fontName='Text-Bold',fontSize=16,leading=22,spaceBefore=20,spaceAfter=12,keepWithNext=True))
    styles.add(ParagraphStyle('H3R',parent=styles['BodyR'],fontName='Text-Bold',fontSize=11.5,leading=17,spaceBefore=12,spaceAfter=8,keepWithNext=True))
    styles.add(ParagraphStyle('CellR',parent=styles['BodyR'],fontSize=8,leading=11.7,spaceAfter=0))
    styles.add(ParagraphStyle('CaptionR',parent=styles['BodyR'],fontSize=8,leading=12,textColor=colors.HexColor('#626857'),spaceAfter=14))
    styles.add(ParagraphStyle('CodeR',fontName='Mono',fontSize=7,leading=10,spaceAfter=12))
    styles.add(ParagraphStyle('BulletR',parent=styles['BodyR'],leftIndent=12,firstLineIndent=-10))
    styles.add(ParagraphStyle('TocR',parent=styles['BodyR'],fontSize=8.1,leading=11,leftIndent=0,spaceBefore=1.5,spaceAfter=2))
    W,H=A4;left=48;right=48;top=48;bottom=48;usable=W-left-right
    class Doc(BaseDocTemplate):
        def afterFlowable(self,flowable):
            if self.page>1 and isinstance(flowable,Paragraph) and flowable.style.name in ['H1R','H2R'] and flowable.getPlainText() not in ('Как читать отчёт','How to read this report'):
                text=flowable.getPlainText();key='b'+hashlib.sha256(text.encode()).hexdigest()[:14];self.canv.bookmarkPage(key);self.canv.addOutlineEntry(text,key,0 if flowable.style.name=='H1R' else 1,False)
                # The printed contents lists chapters and the numbered main
                # report. PDF bookmarks retain all appendix subsections.
                if flowable.style.name=='H1R' or re.match(r'^\d+\.',text):self.notify('TOCEntry',(0 if flowable.style.name=='H1R' else 1,text,self.page,key))
    def page(canvas,doc):
        canvas.saveState();canvas.setStrokeColor(colors.HexColor('#bdc4ae'));canvas.setLineWidth(.5)
        if doc.page>1:
            canvas.line(left,H-31,W-right,H-31);canvas.setFont('Text',7);canvas.setFillColor(colors.HexColor('#626857'));canvas.drawString(left,H-23,label('ЛАБОРАТОРИЯ ШКОЛЫ ИМПЕРИИ / TENNIS FOR TWO / 0.8.4'))
        canvas.line(left,34,W-right,34);canvas.setFont('Text',7);canvas.setFillColor(colors.HexColor('#626857'));canvas.drawString(left,22,label('25.10.2026 · Инженерный отчёт · Параметры реконструкции объявлены'));canvas.drawRightString(W-right,22,str(doc.page));canvas.restoreState()
    doc=Doc(str(D/PDFNAME),pagesize=A4,leftMargin=left,rightMargin=right,topMargin=top,bottomMargin=bottom,title=label('Tennis for Two: схемная реконструкция и исследование 0.8.4'),author=label('Дмитрий Малыхин; при участии ChatGPT (OpenAI)'),subject=label('Источники, электрическая модель, повторное использование, численные проверки и границы точности'))
    doc.addPageTemplates(PageTemplate(id='report',frames=[Frame(left,bottom,usable,H-top-bottom,id='body',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=page))
    story=[Spacer(1,45),P('ЛАБОРАТОРИЯ ШКОЛЫ ИМПЕРИИ / ПРИБОР 001',styles['CaptionR']),P('Tennis for Two',styles['H1R']),P('Реконструкция электрического прибора',styles['H2R']),P('Источники, схемы, программный тракт, численные проверки и открытые границы точности.',styles['BodyR']),Spacer(1,20)]
    im=Image(str(figure_path('joint-topology')));im._restrictSize(usable,300);story+=[im,Spacer(1,20),P('Дмитрий Малыхин, Гремлин<br/>Разработка и исследование в диалоге с ChatGPT (OpenAI).',styles['BodyR']),P('Версия 0.8.4 / 25 октября 2026<br/>Наш код и тексты: MIT. Внешние разработки сохраняют авторов и лицензии.',styles['CaptionR']),P(project_resources(True),styles['CaptionR']),PageBreak(),P('Как читать отчёт',styles['H1R']),P('Сначала описаны исторические основания и текущий прибор. Затем приведены измерения, происхождение внешних разработок и технические приложения. Численная проверка подтверждает выбранную электрическую модель; историческое соответствие рассматривается отдельно. Веб-страница и PDF собраны из одного текста.',styles['BodyR'])]
    toc=TableOfContents();toc.levelStyles=[styles['TocR'],ParagraphStyle('TocSub',parent=styles['TocR'],leftIndent=12,fontSize=8.5)];story+=[toc,PageBreak()]
    for kind,data in blocks(source):
        if kind.startswith('h'):
            style={'h1':'H1R','h2':'H2R','h3':'H3R','h4':'H3R'}[kind]
            if (kind=='h1' or data=='Схемы и сигналы') and len(story)>12 and not isinstance(story[-1],PageBreak):story.append(PageBreak())
            named=heading_anchor(data)
            alias='<a name="'+named+'"/>' if named else ''
            story.append(P(alias+inline(data,True),styles[style]))
        elif kind=='image':
            caption,path=data;path=D/path
            if path.suffix=='.svg':continue
            im=Image(str(path));im._restrictSize(usable,510);story.append(KeepTogether([im,Spacer(1,6),P(html.escape(caption),styles['CaptionR'])]))
        elif kind=='table':
            n=max(map(len,data));widths=([.23,.28,.49] if n==3 else [.36,.64] if n==2 else [1/n]*n)
            table=Table([[P(inline(c,True),styles['CellR']) for c in row] for row in data],colWidths=[v*usable for v in widths],repeatRows=1,hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dce3d0')),('BACKGROUND',(0,1),(-1,-1),colors.HexColor('#f5f4ed')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#c3c4b6'))]));story+=[table,Spacer(1,13)]
        elif kind=='code':story.append(Preformatted(data,styles['CodeR'],maxLineLength=90,splitChars=' /'))
        else:story.append(P(('• ' if kind=='li' else '')+inline(data,True),styles['BulletR' if kind=='li' else 'BodyR']))
    doc.multiBuild(story)

def evidence_english():
    j=json.loads((D/'joint-validation.json').read_text());w=json.loads((D/'worker-validation.json').read_text());p=json.loads((D/'joint-phase-validation.json').read_text());n=json.loads((D/'joint-native-validation.json').read_text());warm=json.loads((D/'joint-native-warm-validation.json').read_text())
    rows=['## Electrical validation of profile 0.7.0','','Release 0.8.4 retains the checked 0.7.0 circuit equations. Measurements below belong to the stated Linux/Node/WASM scenarios.','','| Check | Measurement | Scope |','| --- | --- | --- |']
    def add(a,b,c):rows.append('| '+a+' | '+b+' | '+c+' |')
    add('Joined circuit',str(sum(t.get('passed',False) for t in j['tests']))+' / '+str(len(j['tests'])),'Wiring, accepted beam, state transfer, screen and CPU')
    add('Coordinate transfer',format(j['metrics']['checkpoints']['maxBallErrorV']*1e6,'.3f')+' µV','Maximum on the control trajectory')
    for key,title in [('production','Normal checkpoints'),('stress','Frequent checkpoints')]:add(title,format(p[key]['maxEdgeShift_s']*1e6,'.3f')+' µs','Maximum edge shift in the declared window')
    add('Cold-start coordinates',format(max(n['maxDifferenceV'][:2])*1e3,'.3f')+' mV','Entire 0.4 s window, including startup')
    add('Cold-start matching edges',format(n['edgeComparison']['maxShift_s']*1e6,'.3f')+' µs','20 µs post-analysis grid; original maxima retained')
    add('Cold-start settled maximum',format(max(n['settled']['maxDifferenceV']),'.3f')+' V','Explicit ±150 µs edge exclusions')
    add('Cold-start raw maximum',format(max(n['maxDifferenceV']),'.3f')+' V','Original pointwise 20 mV criterion failed')
    for t in w['tests']:add('Forced Worker transfer' if 'forcedHeapBoundBytes' in t else 'Production Worker',format(t['simulated_s'],'.3f')+' s / '+str(t.get('hits','—'))+' hits',str(t['workerRestarts'])+' transfers; peak WASM '+format(t['peakHeapBytes']/1024**2,'.2f')+' MiB')
    add('Common initial state: coordinates',format(max(warm['maxDifferenceV'][:2])*1e3,'.3f')+' mV','Native/WASM continue one accepted point after 0.25 s')
    add('Common state: edges / settled',format(warm['edgeComparison']['maxShift_s']*1e6,'.3f')+' µs / '+format(max(warm['settled']['maxDifferenceV'])*1e3,'.3f')+' mV','Reported separately from cold startup')
    rows+=['','### Interpretation','','At cold start, the bistable can choose a different initial B/C order. Same-labelled signals then differ outside edges too. The failed cold-start comparison remains in the report. A separate shared-initial-state experiment checks numerical continuation of the same accepted state. Its original pointwise 20 mV edge criterion also fails; timing and settled-voltage criteria are reported separately.','','The initial 25 µs / 10⁻⁶ profile increased direct-session memory and exposed a fresh-Worker continuation error. The production restore first establishes saved UIC state over 1 µs with the previous inputs, then applies the next controller command. No startup or serve is repeated. Original failed logs are retained.','','E1 contains 40 completed transients, two convergence failures, one timeout and two completed AC cases. These are research variants, separate from production checks.','','M1/Firefox speed and hardware WebGL are unmeasured. CPU fallback is available. Machine reports: joint-validation.json, worker-validation.json, joint-phase-validation.json, joint-native-validation.json, joint-native-warm-validation.json.']
    return '\n'.join(rows)+'\n'

def main():
    global LANG,PDFNAME
    from xml.etree import ElementTree as ET
    # Refresh current structural-diagram labels before making their English peers.
    replacements={'GREMLIN LAB / SPICE-ПРОФИЛЬ 0.3':'ЛАБОРАТОРИЯ ШКОЛЫ ИМПЕРИИ / ПРОФИЛЬ 0.8.4','50 выборок/с · напряжения и токи · последние 120 секунд':'200 выборок/с · напряжения и токи · последние 6000 отсчётов','Canvas и Web Audio показывают и озвучивают результат расчёта.':'Луч и люминофор показывают электрическую трассу; щелчки синтезированы.'}
    ET.register_namespace('','http://www.w3.org/2000/svg')
    for name in ['computing-chain','display-topology','operator-layer']:
        path=F/(name+'.svg');tree=ET.parse(path)
        for node in tree.iter():
            if node.text:node.text=node.text.replace('/ ПРОФИЛЬ 0.8.1','/ ПРОФИЛЬ 0.8.4').replace('/ ПРОФИЛЬ 0.8.2','/ ПРОФИЛЬ 0.8.4').replace('/ ПРОФИЛЬ 0.8.3','/ ПРОФИЛЬ 0.8.4')
            if node.text in replacements:node.text=replacements[node.text]
        tree.write(path,encoding='unicode')
        for node in tree.iter():
            if node.text in EN_LABELS:node.text=EN_LABELS[node.text]
        tree.write(F/(name+'.en.svg'),encoding='unicode')
    for LANG in ['ru','en']:
        suffix='.en' if LANG=='en' else '';PDFNAME='Gremlin_Tennis_Research_0.8.4'+suffix+'.pdf'
        def read(name):return (D/(name+suffix+'.md')).read_text()
        evidence=evidence_english() if LANG=='en' else evidence_markdown()
        (D/('release-results'+suffix+'.md')).write_text(evidence)
        research=read('RESEARCH');heading='## 12. Research materials' if LANG=='en' else '## 12. Материалы исследования'
        research=research.replace(heading,evidence+'\n'+heading)
        if LANG=='en':
            captions=[('Joined instrument. The middle circuit blocks share one ngspice matrix; the renderer receives accepted points.','joint-topology.en.png'),('BNL: Tennis Programming, EH1-900-1-3 A,15 October 1958. Original archival drawing.','bnl-schematic-1.jpg'),('BNL: Electronic Switch, EH1-900-2-3 A,18 November 1959. This drawing has a different date from the ball computer.','bnl-schematic-2.jpg'),('Plate X/Y voltages and beam current from accepted adaptive SPICE points.','joint-trace.en.png'),('Native/WASM continuation from a common initial point around the largest voltage discrepancy. Edge timing and pointwise voltage are separate measurements.','native-edge.en.png'),('Declared generic RCA P1 impulse model: 2.858/20.932 ms, slow fraction 4.719%, under the selected excitation assumption.','phosphor-decay.en.png')]
            visual='\n## Schematics and signals\n'
        else:
            captions=[('Тракт прибора. Схемные блоки рассчитываются одной матрицей ngspice; экран получает принятые точки.','joint-topology.png'),('Архив BNL: Tennis Programming, EH1-900-1-3 A,15.10.1958.','bnl-schematic-1.jpg'),('Архив BNL: Electronic Switch, EH1-900-2-3 A,18.11.1959.','bnl-schematic-2.jpg'),('Напряжения пластин X/Y и ток луча: принятые адаптивные точки SPICE.','joint-trace.png'),('Native/WASM из общей начальной точки около максимального расхождения. Время фронтов и поточечные напряжения рассматриваются отдельно.','native-edge.png'),('Принятая модель RCA P1: 2,858/20,932 ms, медленная доля 4,719%, при указанном условии возбуждения.','phosphor-decay.png')]
            visual='\n## Схемы и сигналы\n'
        visual+=''.join('\n!['+caption+'](figures/'+path+')\n' for caption,path in captions)
        figures();audit=read('reuse-audit');contacts=read('CONTACTS')
        full=research+visual+'\n'+audit+''.join('\n'+read(name) for name in ['METHODS','SCHEMATICS','cpu-research','NEXT-STAGE','mechanics','engine-comparison','glass-optics','continuation-recovery','demo-mode','CONTACTS'])
        (D/('PROJECT'+suffix+'.md')).write_text(full)
        (D/'research.css').write_text(CSS+'\n.brand{display:flex;align-items:center;gap:10px}.doc-language{display:flex;gap:0;margin-left:auto}.doc-language a{padding:5px 8px;border:1px solid #939a83;text-decoration:none}.doc-language a+a{border-left:0}.doc-language [aria-current="true"]{background:#292c25;color:#f6f3e9}\n')
        render_html(full,'research'+suffix+'.html','Tennis for Two: complete research' if LANG=='en' else 'Tennis for Two: полное исследование')
        render_html(audit+'\n'+contacts,'reuse-audit'+suffix+'.html','Authors and reuse' if LANG=='en' else 'Авторы и повторное использование')
        render_html(contacts,'contacts'+suffix+'.html','Author and contact' if LANG=='en' else 'Автор и связь')
        make_pdf(full);print('Built '+PDFNAME)

if __name__=='__main__':main()
