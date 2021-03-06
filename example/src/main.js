import { createApp } from 'vue';
import { VueMountable } from '../../dist/index.mjs';
import App from './app.vue';


const instance = createApp(App);
instance.use(VueMountable());
instance.mount('#app');
