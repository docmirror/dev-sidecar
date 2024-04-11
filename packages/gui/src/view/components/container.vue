<template>
  <div class="ds-container">
    <div class="body-wrapper">
      <div v-if="$slots.header" class="container-header"><slot name="header"></slot></div>
      <div class="container-body"> <slot></slot></div>
      <div class="container-footer"> <slot name="footer"></slot></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ds-container'
}
</script>

<style lang="scss">
/* 暗色主题 */
$dark-logo: url("/logo/logo-lang-light.svg");
$dark-bg: #1e1f22; //背景
$dark-bg-highlight: #333; //高亮块：背景
$dark-text: #ddd; //字体颜色
$dark-menu-selected: #1890ff; //菜单选中：字体颜色
$dark-bd: #333; //边框和分隔线
$dark-bd2: #929292; //边框和分隔线
$dark-btn: #444; //按钮：边框和背景颜色
.theme-dark{
  /* 背景色和字体颜色 */
  .ds_layout, .ant-layout,
  .ds-container, .ds-container .container-header,
  .ant-layout-footer{
    background: $dark-bg;
    color: $dark-text;
  }
  div, span, label {
    color: $dark-text;
  }
  .form-help {
    color: #999
  }

  /* 高亮块：背景色和字体颜色 */
  .ant-alert-warning{
    background: $dark-bg-highlight;
    border-color: $dark-bg-highlight;
    color: $dark-text;
    /* 关闭图标颜色 */
    .ant-alert-close-icon .anticon-close {
      color: $dark-text;
    }
  }
  .ant-alert-info{
    background: $dark-bg-highlight;
    border-color: $dark-bg-highlight;
    color: $dark-text;
  }

  /* 边框和分隔线 */
  .ant-layout-has-sider,
  .ant-layout-sider-children,
  .ds-container .container-header,
  .logo,
  .footer-bar,
  .ant-layout-footer,
  .ant-tabs .ant-tabs-left-bar,
  .ant-tabs .ant-tabs-left-content{
    border-color: $dark-bd;
  }

  /* 左侧 */
  /** 背景色 **/
  .ant-layout-sider{
    background: $dark-bg;
  }
  /** Logo **/
  .logo{
    background-image: $dark-logo; /* logo使用亮色的 */
  }
  /** 菜单 **/
  .ant-menu{
    background: $dark-bg;
    color: $dark-text;
  }
  .ant-menu:not(.ant-menu-horizontal) .ant-menu-item-selected{
    background: $dark-bg-highlight;
    color: $dark-menu-selected;
    span{ color: $dark-menu-selected; }
  }

  /* 输入框、下拉框 */
  .ant-input, .ant-input-number-input, .ant-input-number, .ant-select-selection,
  .ant-input-group-addon{
    background: #777;
    border-color: #aaa;
    color: $dark-text;
    &:hover, &:focus{
      border-color: #fff;
    }
  }

  /* 卡片消息：IP测速 */
  .ant-card{
    background: #777;
    border-color: #777;
    .ant-card-head{
      border-bottom-color: $dark-bd2;
    }
  }

  /* 标签：未启用 */
  .ant-tag-red{
    background: #4f4749;
    border-color: #4f4749;
    color: #bf8285;
  }
  /* 标签：已启用 */
  .ant-tag-green{
    background: #505f5f;
    border-color: #505f5f;
    color: #90cb9f;
  }

  /* 按钮 */
  .ant-btn:not(.ant-btn-danger, .ant-btn-primary){
    background: $dark-btn;
    border-color: $dark-btn;
    color: $dark-text;
    &:hover{
      opacity: 0.8;
    }
  }

  /* 单选框：开关式 */
  .ant-switch:not(.ant-switch-checked){
    background: $dark-btn;
    border-color: $dark-btn;
    &:hover{
      opacity: 0.8;
    }
  }
  /* 单选框：按钮式 */
  .ant-radio-button-wrapper{
    background: $dark-btn;
    border-color: $dark-btn;
    color: $dark-text;
    &:hover{
      opacity: 0.8;
    }
  }

  /* JSON编辑器：应用于拦截设置 */
  .jsoneditor-vue{
    /* 头部和边框  */
    div.jsoneditor-menu, div.jsoneditor{
      background: $dark-bg;
      border-color: $dark-bd;
    }
    /* 内容区域：背景和字体颜色 */
    .ace_gutter, .ace_scroller{
      background: #555;
      color: #eee;
    }
    /* key的颜色 */
    .ace_variable, .ace_text-layer{
      color: #eee;
    }
    /* 字符串值的颜色 */
    .ace_string, .ace_cjk{
      color: #a6eaa6;
    }
    .ace_constant{
      /* 数字的颜色 */
      &.ace_numeric{
        color: #ec9999;
      }
      /* 布尔值的颜色 */
      &.ace_language{
        color: #f4c995;
      }
    }
    /* 当前行高亮样式 */
    .ace_gutter-active-line,
    .ace_marker-layer .ace_active-line{
      background: #838774;
    }
  }
}

.ds-container{
  height:100%;
  background: #fff;
  display: flex;
  position: relative;

  .body-wrapper{
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .container-header{
    padding:15px;
    border-bottom: 1px solid #EEE;
    background: #FFF;
    height:60px;
    display: flex;
    align-items: center;
    justify-content:  space-between;
  }
  .container-body{
    flex: 1;
    height: 0;
    overflow: auto;
    position: relative;
    padding:15px;
  }
}

</style>
