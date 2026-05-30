import Index from '../pages/index.vue'
import Git from '../pages/plugin/git.vue'
import Node from '../pages/plugin/node.vue'
import Overwall from '../pages/plugin/overwall.vue'
import Pip from '../pages/plugin/pip.vue'
import FreeEye from '../pages/plugin/free-eye.vue'
import Proxy from '../pages/proxy.vue'
import Server from '../pages/server.vue'
import Setting from '../pages/setting.vue'
import Help from '../pages/help.vue'

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
