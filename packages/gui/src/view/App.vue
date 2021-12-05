<template>
  <a-config-provider :locale="locale">
  <div class="ds_layout">
    <a-layout>
      <a-layout-sider theme="light">
        <div class="logo" >
          <img height="60px" src="/logo/logo-lang.svg">
        </div>
        <div class="aside">
          <a-menu
            mode="inline"
            :defaultSelectedKeys="[$route.fullPath]"
            :defaultOpenKeys="['/plugin']"
          >
            <template v-for="(item) of menus">
              <a-sub-menu v-if="item.children && item.children.length>0"   :key="item.path" @titleClick="titleClick(item)">
                <span slot="title"><a-icon  :type="item.icon?item.icon:'file'" /><span>{{item.title}}</span></span>
                  <a-menu-item v-for="(sub) of item.children" :key="sub.path" @click="menuClick(sub)" >
                    <a-icon  :type="sub.icon?sub.icon:'file'"/> {{ sub.title }}
                  </a-menu-item>
              </a-sub-menu>
              <a-menu-item v-else :key="item.path" @click="menuClick(item)">
                <a-icon  :type="item.icon?item.icon:'file'"/>
                <span class="nav-text">{{ item.title }}</span>
              </a-menu-item>
            </template>

          </a-menu>

        </div>

      </a-layout-sider>
      <a-layout>
<!--        <a-layout-header>Header</a-layout-header>-->
        <a-layout-content>
          <router-view></router-view>
        </a-layout-content>
        <a-layout-footer>
          <div class="footer">
            ©2020-2021 docmirror.cn by Greper  <span>{{info.version}}</span>
          </div>
        </a-layout-footer>
      </a-layout>
    </a-layout>
  </div>
  </a-config-provider>
</template>

<script>
import createMenus from '@/view/router/menu'
import zhCN from 'ant-design-vue/lib/locale-provider/zh_CN'
export default {
  name: 'App',
  components: {
  },
  data () {
    return {
      locale: zhCN,
      info: {},
      menus: undefined
    }
  },
  computed: {
  },
  created () {
    this.menus = createMenus(this)
    this.$api.info.get().then(ret => {
      this.info = ret
    })
  },
  methods: {
    handleClick (e) {
      console.log('click', e)
    },
    titleClick (e) {
      console.log('titleClick', e)
    },
    menuClick (item) {
      console.log('menu click', item)
      this.$router.replace(item.path)
    }
  }
}
</script>

<style lang="scss">
body{
  height: 100%;
}
.mt10{
  margin-top:10px;
}
.mt5{
  margin-top:5px;
}
.mt20{
  margin-top:20px;
}
.ds_layout {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100%;
  .ant-layout-has-sider{
    border:1px solid #eee;
  }
  .ant-layout-sider-children{
    border-right:1px solid #eee;
  }
  .ant-layout{
    height:100%
  }
  .logo{
    padding:5px;
    border-bottom: #eee solid 1px;
    height:60px;
    img{
      height:100%
    }
  }
  .ant-layout-footer{
    padding:10px;
    text-align: center;
    border-top:#d6d4d4 solid 1px;
  }
  .ant-menu-inline, .ant-menu-vertical, .ant-menu-vertical-left{
    border:0;
  }
}
</style>
