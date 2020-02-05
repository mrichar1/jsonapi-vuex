<template>
  <div id="main-div">
    <h1>JSONAPI Vuex Test App</h1>
    <div id="raw_data" style="border: 1px solid;">
      <h2>Raw Data</h2>
      <h3>Action Status</h3>
      <pre>{{ sessions }}</pre>
      <h3>API State</h3>
      <pre>{{ widgets }}</pre>
      <h3>Search</h3>
      <pre>{{ searchResult }}</pre>
    </div>
    <div id="render_data" style="border: 1px solid;">
      <h2>Rendered Data</h2>
      <h3>Records</h3>
      <div v-for="(widget, id, index) in widgets" :key="index">
        <div>{{ id }}</div>
        <div :id="'render_' + id + '_' + index" v-for="(value, name, index) in widget['_jv'].attrs" :key="index">
          <span>{{ name }}: </span>
          <span :id="'span_' + name + '_' + id">{{ value }}</span>
        </div>
      </div>
      <h3>Related</h3>
      <div v-if="'_jv' in widget1 && 'rels' in widget1['_jv']">
        <div :id="'rels_' + name" v-for="(rel, name, index) in widget1['_jv'].rels" :key="index">
          <span>Related: </span>
          <span :id="'rel_span_relname'">{{ name }}</span>
          <br />
          <span :id="'rel_span_name'">{{ rel.name }}</span>
          <br />
          <span :id="'rel_span_color'">{{ rel.color }}</span>
          <br />
        </div>
      </div>
      <h3>Search</h3>
      <div v-for="(widget, id, index) in widgets" :key="'search' + index">
        <div>{{ id }}</div>
        <div :id="'render_' + id + '_' + index" v-for="(value, name, index) in widget['_jv'].attrs" :key="index">
          <span>{{ name }}: </span>
          <span :id="'search_' + name + '_' + id">{{ value }}</span>
        </div>
      </div>
    </div>
    <div id="patch">
      <h2>Patch widget 1</h2>
      <div v-if="'_jv' in widget1 && 'rels' in widget1['_jv']">
        <div v-for="(value, name, index) in widget1['_jv'].attrs" :key="index">
          <label :for="'patch_' + name">{{ name }}</label>
          <input :id="'patch_' + name" v-model="widget1[name]" />
        </div>
      </div>
      <div>
        <button name="patch_button" @click="patchRecord(widget1)">Patch</button>
      </div>
    </div>
    <div id="post">
      <h2>Post widget</h2>
      <label for="post_name">Name</label>
      <input id="post_name" v-model="postWidget['name']" />
      <label for="post_color">Color</label>
      <input id="post_color" v-model="postWidget['color']" />
      <div>
        <button name="post_button" @click="postRecord(postWidget)">Post</button>
      </div>
    </div>
    <div id="delete">
      <h2>Delete widget</h2>
      <label for="delete_id">Widget ID</label>
      <input id="delete_id" v-model="delWidgetId" />
      <div>
        <button name="delete_button" @click="deleteRecord(delWidgetId)">
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { status, utils } from '../../../../src/jsonapi-vuex'

export default {
  name: 'JsonapiVuex',
  data: () => {
    return {
      sessions: {},
      searchResult: {},
      delWidgetId: undefined,
      postWidget: {
        _jv: {
          type: 'widget',
        },
      },
    }
  },
  computed: {
    sessions() {
      return status.status
    },
    widgets() {
      return this.$store.getters['jv/get']('widget')
    },
    widget1() {
      return utils.deepCopy(this.$store.getters['jv/get']('widget/1'))
    },
  },
  created() {
    status.run(() => this.$store.dispatch('jv/get', 'widget'))
    status
      .run(() => this.$store.dispatch('jv/get', 'widget'))
      .then((res) => {
        this.searchResult = res
      })
  },
  methods: {
    patchRecord(record) {
      this.$store.dispatch('jv/patch', record)
    },
    postRecord(record) {
      this.$store.dispatch('jv/post', record)
    },
    deleteRecord(id) {
      this.$store.dispatch('jv/delete', 'widget' + '/' + id)
    },
  },
}
</script>

<style scoped></style>
