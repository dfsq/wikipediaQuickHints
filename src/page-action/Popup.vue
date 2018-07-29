<template>
  <div class="popup-container">
    <h1><span data-i18n="appName"></span></h1>
  </div>
</template>

<script>
  export default {
    created () {
      console.log('===== page-action:created', chrome.i18n)
    }
  }
</script>

<style lang="scss">
  .popup-container {
    padding: 10px;
    font-family: Helvetica, Ubuntu, Arial, sans-serif;
    width: 400px;
    height: 200px;

    h1 {
      font-size: 2em;
      color: #3aa2da;
    }
  }
</style>
