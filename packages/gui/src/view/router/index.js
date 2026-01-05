import Index from '../pages/index'
import Git from '../pages/plugin/git'
import Node from '../pages/plugin/node'
import Overwall from '../pages/plugin/overwall'
import Pip from '../pages/plugin/pip'
import FreeEye from '../pages/plugin/free-eye'
import Proxy from '../pages/proxy'
import Server from '../pages/server'
import Setting from '../pages/setting'
import Help from '../pages/help'

const routes = [
  { path: '/', redirect: '/index' },
  { path: '/index', component: Index },
  { path: '/server', component: Server },
  { path: '/proxy', component: Proxy },
  { path: '/setting', component: Setting },
  { path: '/help', component: Help },
  { path: '/plugin/node', component: Node },
  { path: '/plugin/git', component: Git },
  { path: '/plugin/pip', component: Pip },
  { path: '/plugin/free-eye', component: FreeEye },
  { path: '/plugin/overwall', component: Overwall },
]

export default routes
