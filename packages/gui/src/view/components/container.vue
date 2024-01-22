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
