<template>
  <div id="main-div">
    <h1>JSONAPI Vuex Test App</h1>
    <div id="raw_data" style="border: 1px solid;">
      <h2>Raw Data</h2>
      <pre>{{ widget }}</pre>
    </div>
    <div id="render_data" style="border: 1px solid;">
      <h2>Rendered Data</h2>
      <div :id='"render_" + name' v-for="(value, name, index) in widget" :key="index" v-if="name != '_jv'">
        <span>{{ name }}: </span>
        <span :id='"span_" + name'>{{ value }}</span>
      </div>
      <div v-if="'_jv' in widget && 'rels' in widget['_jv']">
        <div :id='"rels_" + name' v-for="(rel, name, index) in widget['_jv']['rels']" :key="index">
          <span>Related: </span>
          <span :id='"relspan_relname"'>{{ name }}</span>&nbsp;
          <span :id='"relspan_name"'>{{ rel.name }}</span>&nbsp;
          <span :id='"relspan_color"'>{{ rel.color }}</span>&nbsp;
        </div>
      </div>
    </div>
    <div id="inputs">
      <h2>Inputs</h2>
      <div v-for="(value, name, index) in widget" :key="index" v-if="name != '_jv'">
        <label :for='"input_" + name'>{{ name }}</label>
        <input :id='"input_" + name' v-model="widget[name]"/>
      </div>
      <div>
        <button name="patch_button" @click="patchRecord(widget)">Patch</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonapiVuex',
  computed: {
    widget () {
      return this.$store.getters["jv/get"]('widget/1')
    }
  },
  created () {
    this.$store.dispatch("jv/get", "widget")
  },
  methods: {
    patchRecord (record) {
      this.$store.dispatch("jv/patch", record)
    }
  }
}
</script>

<style scoped>
</style>
