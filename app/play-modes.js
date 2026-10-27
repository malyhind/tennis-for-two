// Presentation modes live outside the recorded CPU model. Changing the menu
// must not invalidate the unchanged operator implementation used by the demo.
export const PLAY_MODES=Object.freeze({
  opponent:Object.freeze({label:'Я и Противник',names:['Вы','Противник'],cpu:[null,'opponent'],description:'Вы играете слева. Противник справа управляется компьютером.'}),
  together:Object.freeze({label:'Я и Лиса',names:['Вы','Лиса'],cpu:[null,'fox'],description:'Вы играете слева. Лиса справа играет сама.'}),
  local:Object.freeze({label:'Два игрока',names:['Вы','Второй игрок'],cpu:[null,null],description:'Два человека: левый пульт — A/D и W, правый — стрелки. Обе ручки доступны мышью.'}),
  watch:Object.freeze({label:'Гремлин против Лисы',names:['Гремлин','Лиса'],cpu:['gremlin','fox'],description:'Оба пульта управляются компьютером. Можно смотреть розыгрыш.'})
});
