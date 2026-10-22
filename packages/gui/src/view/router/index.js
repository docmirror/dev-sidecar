import Index from '../pages/index'
import Git from '../pages/plugin/git'
import Node from '../pages/plugin/node'
import Overwall from '../pages/plugin/overwall'
import Pip from '../pages/plugin/pip'
import Xget from '../pages/plugin/xget.vue'
import FreeEye from '../pages/plugin/free-eye.vue'
import WebDiagnostics from '../pages/plugin/web-diagnostics.vue'
import P2p from '../pages/plugin/p2p.vue'
import Proxy from '../pages/proxy'
import Server from '../pages/server'
import ServiceGroup from '../pages/service-group.vue'
import Setting from '../pages/setting'
import Help from '../pages/help'
import Traffic from '../pages/traffic.vue'
import GithubStatus from '../pages/github-status.vue'

const routes = [
  { path: '/', redirect: '/index' },
  { path: '/index', component: Index },
  { path: '/server', component: Server },
  { path: '/service-group', component: ServiceGroup },
  { path: '/proxy', component: Proxy },
  { path: '/setting', component: Setting },
  { path: '/help', component: Help },
  { path: '/traffic', component: Traffic },
  { path: '/github-status', component: GithubStatus },
  { path: '/plugin/node', component: Node },
  { path: '/plugin/git', component: Git },
  { path: '/plugin/pip', component: Pip },
  { path: '/plugin/xget', component: Xget },
  { path: '/plugin/free-eye', component: FreeEye },
  { path: '/plugin/web-diagnostics', component: WebDiagnostics },
  { path: '/plugin/overwall', component: Overwall },
  { path: '/plugin/p2p', component: P2p },
]

export default routes
