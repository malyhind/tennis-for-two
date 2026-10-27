// Game-mode assignments; shared by the instrument and public documentation.
export const PLAY_MODES=Object.freeze({
  opponent:Object.freeze({label:'Я и Противник',names:['Вы','Противник'],cpu:[null,null],description:'Два человека: вы играете слева, противник — справа. Оба пульта доступны мышью и клавиатурой.'}),
  together:Object.freeze({label:'Я и Лиса',names:['Вы','Лиса'],cpu:[null,'fox'],description:'Вы играете слева. Лиса справа управляется компьютером.'}),
  watch:Object.freeze({label:'Гремлин против Лисы',names:['Гремлин','Лиса'],cpu:['gremlin','fox'],description:'Оба пульта управляются компьютером. Можно смотреть розыгрыш.'})
});
