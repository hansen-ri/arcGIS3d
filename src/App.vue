<script setup>
// import Map from './components/Map.vue';
import { computed, ref } from 'vue';

const shapes = ref([]);

// Convert to string so it can be passed as a prop
const shapesJson = computed(() => JSON.stringify(shapes.value));

function handleShapeSave(event) {
  const newShape = event.detail;
  console.log("New or updated shape:", newShape);
  shapes.value.push(newShape);

  // Optionally persist to localStorage or a backend
  // localStorage.setItem('savedShapes', JSON.stringify(shapes.value));
}

</script>

<template>
  <main>
    <!-- <Map/> -->
    <my-sketch-3d :sketch="shapesJson" @shape-save="handleShapeSave">
    </my-sketch-3d>
  </main>
</template>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

main {
  height: 100%;
  width: 100%;
}
</style>
