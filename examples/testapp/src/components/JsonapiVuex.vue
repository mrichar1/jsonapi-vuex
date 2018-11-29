<template>
  <div id="main-div">
    <h1>JSONAPI Vuex Test App</h1>
    <div id="raw_data" style="border: 1px solid;">
      <h2>Raw Data</h2>
      <pre>{{ widgets }}</pre>
    </div>
    <div id="render_data" style="border: 1px solid;">
      <h2>Rendered Data</h2>
      <h3>Records</h3>
      <div v-for="(widget, id, index) in widgets" :key="index">
        <div>{{ id }}</div>
        <div :id='"render_" + id + "_" + index' v-for="(value, name, index) in widget" :key="index" v-if="name != '_jv'">
          <span>{{ name }}: </span>
          <span :id='"span_" + name + "_" + id'>{{ value }}</span>
        </div>
      </div>
      <h3>Related</h3>
      <div v-if="'_jv' in widget1 && 'rels' in widget1['_jv']">
        <div :id='"rels_" + name' v-for="(rel, name, index) in widget1['_jv']['rels']" :key="index">
          <span>Related: </span>
          <span :id='"relspan_relname"'>{{ name }}</span>&nbsp;
          <span :id='"relspan_name"'>{{ rel.name }}</span>&nbsp;
          <span :id='"relspan_color"'>{{ rel.color }}</span>&nbsp;
        </div>
      </div>
    </div>
    <div id="patch">
      <h2>Patch widget 1</h2>
      <div v-for="(value, name, index) in widget1" :key="index" v-if="name != '_jv'">
        <label :for='"patch_" + name'>{{ name }}</label>
        <input :id='"patch_" + name' v-model="widget1[name]"/>
      </div>
      <div>
        <button name="patch_button" @click="patchRecord(widget1)">Patch</button>
      </div>
    </div>
    <div id="post">
      <h2>Post new_widget</h2>
      <label for="post_name">Name</label>
      <input id="post_name" v-model="new_widget['name']"/>
      <label for="post_color">Color</label>
      <input id="post_color" v-model="new_widget['color']"/>
    </div>
    <div>
      <button name="post_button" @click="postRecord(new_widget)">Post</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonapiVuex',
  data: () => {
    return {
      new_widget: {
        '_jv': {
          'type': 'widget'
        }
      }
    }
  },
  computed: {
    widgets () {
      return this.$store.getters["jv/get"]('widget')
    },
    widget1 () {
      return this.$store.getters["jv/get"]('widget/1')
    }
  },
  created () {
    this.$store.dispatch("jv/get", "widget")
  },
  methods: {
    patchRecord (record) {
      this.$store.dispatch("jv/patch", record)
    },
    postRecord (record) {
      this.$store.dispatch("jv/post", record)
    }
  }
}
</script>

<style scoped>
</style>
