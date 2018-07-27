<template>
  <div class="popup-container">
    <h1>Hello <span data-i18n="appName">{{ name }}</span>!</h1>

    <p>To shut this popup down, edit the manifest file and remove the "default popup" key. To edit it, just edit
      ext/page_action/page_action.html. The CSS is there, too.</p>
  </div>
</template>

<script>
  export default {
    data () {
      return {
        app: 'Thomas Mann',
      }
    }
  }
</script>

<style lang="scss">
  .popup-container {
    padding: 10px;
    font-family: Helvetica, Ubuntu, Arial, sans-serif;

    h1 {
      font-size: 2em;
    }
  }
</style>
