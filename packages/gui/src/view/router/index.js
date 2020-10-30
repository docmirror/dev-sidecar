import Index from '../pages/index'
import Server from '../pages/server'
import Proxy from '../pages/proxy'
import Node from '../pages/app/node'

const routes = [
  { path: '/', redirect: '/index' },
  { path: '/index', component: Index },
  { path: '/server', component: Server },
  { path: '/proxy', component: Proxy },
  { path: '/app/node', component: Node }

]

export default routes
