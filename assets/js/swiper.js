import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';
import repeatingLoop from '../../gutenberg/utils/swiper-loop';

Swiper.use(repeatingLoop('vp-swiper'));
window.VisualPortfolioSwiper = Swiper;
