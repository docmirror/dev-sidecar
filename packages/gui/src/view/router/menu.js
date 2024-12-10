export default function createMenus (app) {
  const plugins = [
    { title: 'NPM加速', path: '/plugin/node', icon: 'like' },
    { title: 'Git.exe代理', path: '/plugin/git', icon: 'github' },
    { title: 'PIP加速', path: '/plugin/pip', icon: 'bulb' },
  ]
  const menus = [
    { title: '首页', path: '/index', icon: 'home' },
    { title: '加速服务', path: '/server', icon: 'thunderbolt' },
    { title: '系统代理', path: '/proxy', icon: 'deployment-unit' },
    { title: '设置', path: '/setting', icon: 'setting' },
    { title: '帮助中心', path: '/help', icon: 'star' },
    {
      title: '应用',
      path: '/plugin',
      icon: 'api',
      children: plugins,
    },
  ]
  if (app.$global && app.$global.setting && app.$global.setting.overwall) {
    plugins.push({ title: '增强功能', path: '/plugin/overwall', icon: 'global' })
  }
  return menus
}
