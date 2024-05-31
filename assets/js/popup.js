import { createApp } from 'vue'
import popup from './components/popup.vue'

// PrimeVue and PrimeFlex
import PrimeVue from 'primevue/config';
import "primevue/resources/themes/lara-light-blue/theme.css";
import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'

// PrimeVue Components
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';


const app = createApp(popup);

app.use(PrimeVue).mount('#app')
app.component('Button', Button)
app.component('Skeleton', Skeleton)

