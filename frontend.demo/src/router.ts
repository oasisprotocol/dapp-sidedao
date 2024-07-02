import { createRouter, createWebHashHistory } from 'vue-router';

import HomeView from './views/HomeView.vue';
import CreatePollViewVue from './views/CreatePollView.vue';
import PollViewVue from './views/PollView.vue';
import NotFoundVue from './views/NotFound.vue';

const router = createRouter({
  strict: true,
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: `/`,
      component: HomeView,
    },
    {
      path: '/polls',
      component: CreatePollViewVue,
      name: 'createPoll',
    },
    {
      path: '/polls/:id([0-9a-fA-F]{64,64})',
      component: PollViewVue,
      props: true,
      name: 'poll',
    },
    {
      path: '/:path(.*)',
      name: 'NotFound',
      component: NotFoundVue,
    },
  ],
});

export default router;
