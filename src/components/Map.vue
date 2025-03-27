<template>
  <div id="viewDiv"></div>
  <div id="sketchPanel" class="esri-widget">
    <div id="sketchWidget"></div>
    <div id="edgeOperationButtons">
      Select the edge operation:
      <div class="update-options" id="edge">
        <calcite-button id="edgeNoneButton" label="none">None</calcite-button>
        <calcite-button id="edgeSplitButton" label="split">Split</calcite-button>
        <calcite-button id="edgeOffsetButton" label="offset" appearance="solid">Offset</calcite-button>
      </div>
      Select the move operation:
      <div class="update-options" id="shape">
        <calcite-button id="shapeNoneButton" label="none">None</calcite-button>
        <calcite-button id="shapeMoveButton" label="move" appearance="solid">Move</calcite-button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, onMounted } from "vue";
import WebScene from "@arcgis/core/WebScene";
import SceneView from "@arcgis/core/views/SceneView";
import Sketch from "@arcgis/core/widgets/Sketch";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Polygon from "@arcgis/core/geometry/Polygon";
import Polyline from "@arcgis/core/geometry/Polyline";
import Point from "@arcgis/core/geometry/Point";
import PolygonSymbol3D from "@arcgis/core/symbols/PolygonSymbol3D";
import LineSymbol3D from "@arcgis/core/symbols/LineSymbol3D";
import PointSymbol3D from "@arcgis/core/symbols/PointSymbol3D";
import ExtrudeSymbol3DLayer from "@arcgis/core/symbols/ExtrudeSymbol3DLayer";
import PathSymbol3DLayer from "@arcgis/core/symbols/PathSymbol3DLayer";
import ObjectSymbol3DLayer from "@arcgis/core/symbols/ObjectSymbol3DLayer";
import SolidEdges3D from "@arcgis/core/symbols/edges/SolidEdges3D";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import "@arcgis/core/assets/esri/themes/light/main.css";
import esriConfig from "@arcgis/core/config";

export default defineComponent({
  name: "Sketch3DMap",
  mounted() {
    
    esriConfig.locale = navigator.language || "en";

    const scene = new WebScene({
      portalItem: {
        id: "58ac6b34ae034f1db012a8546244bf7f",
      },
    });

    const view = new SceneView({
      container: "viewDiv",
      map: scene,
      alphaCompositingEnabled: true,
      environment: {
        atmosphereEnabled: false,
        starsEnabled: false,
      },
    });

    const sketchLayer = new GraphicsLayer({
      elevationInfo: { mode: "absolute-height" },
      title: "Sketched geometries",
    });
    scene.add(sketchLayer);

    const sketch = new Sketch({
      view,
      container: "sketchWidget",
      layer: sketchLayer,
      toolbarKind: "docked",
    });
    view.ui.add("sketchPanel", "top-right");
    sketch.visibleElements = {
      createTools: {
        rectangle: false,
        circle: false,
      },
    };

    const sketchViewModel = sketch.viewModel;
    sketchViewModel.pointSymbol = createSymbology("tree");
    sketchViewModel.polylineSymbol = createSymbology("border");
    sketchViewModel.polygonSymbol = createSymbology("building");

    sketchViewModel.snappingOptions = {
      enabled: true,
      featureSources: [{ layer: sketchLayer }],
    };
    sketchViewModel.valueOptions = { directionMode: "absolute" };
    sketchViewModel.tooltipOptions = { enabled: true };
    sketchViewModel.labelOptions = { enabled: true };
    sketchViewModel.defaultUpdateOptions = {
      tool: "reshape",
      reshapeOptions: { edgeOperation: "offset", shapeOperation: "move" },
    };

    let edgeType = "offset";
    let shapeType = "move";
    const edgeOperationButtons = document.getElementById("edgeOperationButtons");
    const noneEdgeBtn = document.getElementById("edgeNoneButton");
    const splitEdgeBtn = document.getElementById("edgeSplitButton");
    const offsetEdgeBtn = document.getElementById("edgeOffsetButton");
    const noneShapeButton = document.getElementById("shapeNoneButton");
    const moveShapeButton = document.getElementById("shapeMoveButton");

    noneEdgeBtn.onclick = edgeChangedClickHandler;
    splitEdgeBtn.onclick = edgeChangedClickHandler;
    offsetEdgeBtn.onclick = edgeChangedClickHandler;
    noneShapeButton.onclick = shapeChangedClickHandler;
    moveShapeButton.onclick = shapeChangedClickHandler;

    sketchViewModel.on("create", (event) => {
      if (["polygon", "polyline"].includes(event.tool)) {
        sketchViewModel.creationMode = "update";
        if (event.state === "start") sketchViewModel.valueOptions.directionMode = "absolute";
        if (event.state === "active" && event.toolEventInfo.type === "vertex-add" && event.toolEventInfo.vertices[0].vertexIndex === 1)
          sketchViewModel.valueOptions.directionMode = "relative";
        if (["complete", "cancel"].includes(event.state)) sketchViewModel.valueOptions.directionMode = "absolute";
      } else {
        sketchViewModel.creationMode = "continuous";
      }
    });

    sketchViewModel.on("update", (event) => {
      if (event.state === "start" && ["polygon", "polyline"].includes(event.graphics[0].geometry.type)) {
        edgeOperationButtons.style.display = "inline";
      }
      if (event.state === "complete") {
        edgeOperationButtons.style.display = "none";
      }
    });

    reactiveUtils.whenOnce(() => !view.updating).then(() => {
      addGraphics(getPositions("buildings").map((ring) => ({ rings: ring })), Polygon, createSymbology("building"));
      addGraphics(getPositions("fences").map((path) => ({ paths: path })), Polyline, createSymbology("border"));
      addGraphics(getPositions("trees"), Point, createSymbology("tree"));
    });

    function edgeChangedClickHandler(event) {
      edgeType = event.target.label;
      document.querySelectorAll("#edge calcite-button").forEach((btn) => (btn.appearance = "outline"));
      event.target.appearance = "solid";
      restartUpdateMode({ reshapeOptions: { edgeOperation: edgeType, shapeOperation: shapeType } });
    }

    function shapeChangedClickHandler(event) {
      shapeType = event.target.label;
      document.querySelectorAll("#shape calcite-button").forEach((btn) => (btn.appearance = "outline"));
      event.target.appearance = "solid";
      restartUpdateMode({ reshapeOptions: { edgeOperation: edgeType, shapeOperation: shapeType } });
    }

    function restartUpdateMode(updateOptions) {
      sketchViewModel.defaultUpdateOptions = { ...sketchViewModel.defaultUpdateOptions, ...updateOptions };
      if (["transform", "move", "reshape"].includes(sketchViewModel.activeTool)) {
        sketchViewModel.update(sketchViewModel.updateGraphics.toArray(), { tool: sketchViewModel.activeTool, ...updateOptions });
      }
    }

    function addGraphics(items, GeometryType, symbol) {
      items.forEach((item) => {
        const geometry = new GeometryType({ spatialReference: { wkid: 2193 }, ...item });
        const graphic = new Graphic({ geometry, symbol });
        sketchLayer.add(graphic);
      });
    }

    function createSymbology(type) {
      switch (type) {
        case "building":
          return new PolygonSymbol3D({
            symbolLayers: [new ExtrudeSymbol3DLayer({ size: 3.5, material: { color: [255, 255, 255, 0.8] }, edges: new SolidEdges3D({ size: 1, color: [82, 82, 122, 1] }) })],
          });
        case "border":
          return new LineSymbol3D({
            symbolLayers: [new PathSymbol3DLayer({ profile: "quad", width: 0.3, height: 2.6, material: { color: "#a57e5e" }, cap: "square", profileRotation: "heading" })],
          });
        case "tree":
          return new PointSymbol3D({
            symbolLayers: [new ObjectSymbol3DLayer({ resource: { href: "https://static.arcgis.com/arcgis/styleItems/ThematicTrees/gltf/resource/PlatanusOccidentalis.glb" }, height: 10 })],
          });
        default:
          throw new Error("Invalid symbology type");
      }
    }

    function getPositions(type) {
      const positions = { /* same as provided in the original code */ };
      return positions[type] || [];
    }
  },
});
</script>

<style scoped>
#viewDiv {
  width: 100vw;
  height: 100vh;
}
#sketchPanel {
  width: 325px;
  padding: 10px;
  background-color: rgba(243, 243, 243, 0.8);
}
#edgeOperationButtons {
  display: none;
}
.update-options {
  display: flex;
  flex-direction: row;
  gap: 5px;
}
</style>
