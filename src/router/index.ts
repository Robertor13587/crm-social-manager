import { createRouter, createWebHistory } from 'vue-router'
import { authStorage } from '@/services/authStorage'

const Dashboard = () => import('@/views/Dashboard.vue')
const WhatsAppManager = () => import('@/views/whatsapp/WhatsAppManager.vue')
const InstagramManager = () => import('@/views/instagram/InstagramManager.vue')
const InstagramContacts = () => import('@/views/InstagramContacts.vue')
const Templates = () => import('@/views/Templates.vue')
const Analytics = () => import('@/views/Analytics.vue')
const Docs = () => import('@/views/Docs.vue')
const FacebookManager = () => import('@/views/facebook/FacebookManager.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/facebook',
      name: 'facebook',
      component: FacebookManager,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true }
    },
    {
      path: '/whatsapp',
      name: 'whatsapp',
      component: WhatsAppManager,
      meta: { requiresAuth: true }
    },
    {
      path: '/instagram',
      name: 'instagram',
      component: InstagramManager,
      meta: { requiresAuth: true }
    },
    {
      path: '/instagram/contacts',
      name: 'instagram-contacts',
      component: InstagramContacts,
      meta: { requiresAuth: true }
    },
    {
      path: '/templates',
      name: 'templates',
      component: Templates,
      meta: { requiresAuth: true, roles: ['developer'] }
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: Analytics,
      meta: { requiresAuth: true }
    }
    ,{
      path: '/docs',
      name: 'docs',
      component: Docs,
      meta: { requiresAuth: true }
    }
    ,{
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/Profile.vue'),
      meta: { requiresAuth: true }
    }
    ,{
      path: '/thread',
      name: 'thread',
      component: () => import('@/views/ThreadView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

/** Accetta solo path relativi (iniziano con /) — scarta URL assoluti di altri domini */
const isSafePath = (value: string | null): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')

router.beforeEach((to, from, next) => {
  const token = authStorage.getToken()
  const role = authStorage.getRole()

  if (to.meta && (to.meta as any).public) return next()

  if (to.meta && (to.meta as any).requiresAuth && !token) {
    authStorage.setPostLoginRedirect(to.fullPath || to.path || '/')
    return next({ name: 'login' })
  }

  const roles = (to.meta as any)?.roles as string[] | undefined
  if (roles && (!role || !roles.includes(role))) return next({ name: 'dashboard' })

  const postOAuthRedirect = authStorage.getPostOAuthRedirect()
  // Scarta il valore se è un URL assoluto (es. vecchio dominio in localStorage)
  if (!isSafePath(postOAuthRedirect)) authStorage.clearPostOAuthRedirect()
  if (
    isSafePath(postOAuthRedirect) &&
    token &&
    postOAuthRedirect !== '/' &&
    to.fullPath !== postOAuthRedirect &&
    (to.name === 'dashboard' || to.name === 'login' || to.path === '/')
  ) {
    authStorage.clearPostOAuthRedirect()
    return next(postOAuthRedirect)
  }

  const postLoginRedirect = authStorage.getPostLoginRedirect()
  // Scarta il valore se è un URL assoluto (es. vecchio dominio in localStorage)
  if (!isSafePath(postLoginRedirect)) authStorage.clearPostLoginRedirect()
  if (
    isSafePath(postLoginRedirect) &&
    token &&
    postLoginRedirect !== '/' &&
    to.fullPath !== postLoginRedirect &&
    (to.name === 'dashboard' || to.name === 'login')
  ) {
    authStorage.clearPostLoginRedirect()
    return next(postLoginRedirect)
  }

  next()
})

export default router
