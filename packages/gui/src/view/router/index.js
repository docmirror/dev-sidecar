import Index from '../pages/index'
import Server from '../pages/server'
import Proxy from '../pages/proxy'
import Node from '../pages/plugin/node'
import Git from '../pages/plugin/git'
import Pip from '../pages/plugin/pip'
import Overwall from '../pages/plugin/overwall'
import Setting from '../pages/setting'

const routes = [
  { path: '/', redirect: '/index' },
  { path: '/index', component: Index },
  { path: '/server', component: Server },
  { path: '/proxy', component: Proxy },
  { path: '/plugin/node', component: Node },
  { path: '/plugin/git', component: Git },
  { path: '/plugin/pip', component: Pip },
  { path: '/plugin/overwall', component: Overwall },
  { path: '/setting', component: Setting }

]

export default routes
