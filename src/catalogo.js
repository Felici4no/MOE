export const DOMINIOS = Object.freeze({
  'FAZER ACONTECER': ['Palavra Dada', 'Mão na Massa', 'Tudo no Lugar', 'Olho Clínico'],
  'LIDAR COM GENTE': ['Ponte', 'Porto Seguro', 'Time Junto', 'Voz Firme'],
  'PENSAR E CRIAR': ['Curiosidade Viva', 'Faísca', 'Topa o Novo', 'Desatador de Nós'],
  'FORÇA INTERIOR': ['Sangue Frio', 'Volta por Cima', 'Paciência de Ouro', 'Bússola'],
});
export const CAMINHOS = Object.freeze([
  'Fazer com as mãos', 'Entender e investigar', 'Criar e expressar',
  'Cuidar e ensinar', 'Liderar e vender', 'Organizar e controlar',
]);
export const TEMA_DOMINIO = Object.freeze(Object.fromEntries(
  Object.entries(DOMINIOS).flatMap(([dominio, temas]) => temas.map(tema => [tema, dominio]))
));
export const AVISO_PADRAO = 'Este Mapa é uma ferramenta de autoconhecimento e desenvolvimento, não um teste psicológico. As decisões de carreira são suas e da sua liderança.';
