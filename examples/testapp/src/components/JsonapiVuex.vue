<template>
  <div class="main-div">
    <h1>JSONAPI Vuex Test App</h1>
      <div style="display: block; border: 2px solid;" v-on:mouseover="updateState">
        <pre>{{ status }}</pre>
      </div>
  </div>
</template>

<script>
export default {
  name: 'JsonapiVuex',
  data () {
    return {
      status: { "loading": null }
    }
  },
  methods: {
    updateState () {
      console.log("updateState")
      this.$store.dispatch("jv/get", "widget")
        .then(res => {
          console.log("RES", res)
          console.log(this.status)
          this.status = res
        })
    }
  }
}
</script>

<style scoped>
</style>
