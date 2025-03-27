import { FASTElement, html, css } from "@microsoft/fast-element";
import WebScene from "@arcgis/core/WebScene";
import SceneView from "@arcgis/core/views/SceneView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Sketch from "@arcgis/core/widgets/Sketch";
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
import esriConfig from "@arcgis/core/config.js";

const MySketch3DTemplate = html`<div id="viewDiv"></div>`;

const MySketch3DStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
  }
  #viewDiv {
    width: 100%;
    height: 100%;
  }
`;

export const MySketch3D = FASTElement.compose({
  name: "my-sketch-3d",
  baseName: "my-sketch-3d",
  template: MySketch3DTemplate,
  styles: MySketch3DStyles,
  attributes: ["shapes"],
  shadowOptions: { mode: "open" },
  members: {
    shapes: undefined,
    view: undefined,
    sketchLayer: undefined,
    connectedCallback(el) {
      FASTElement.prototype.connectedCallback.call(el);
      esriConfig.locale = navigator.language || "en";
      el.initializeScene();
    },
    async initializeScene() {
      const scene = new WebScene({
        portalItem: { id: "58ac6b34ae034f1db012a8546244bf7f" },
      });

      this.view = new SceneView({
        container: this.shadowRoot.getElementById("viewDiv"),
        map: scene,
        environment: {
          atmosphereEnabled: false,
          starsEnabled: false,
        },
      });

      this.sketchLayer = new GraphicsLayer({ elevationInfo: { mode: "absolute-height" } });
      scene.add(this.sketchLayer);

      const sketch = new Sketch({
        view: this.view,
        layer: this.sketchLayer,
        creationMode: "update",
      });

      this.view.ui.add(sketch, "top-right");

      sketch.on("create", (event) => {
        if (event.state === "complete") {
          this.saveGraphic(event.graphic);
        }
      });

      sketch.on("update", (event) => {
        if (event.state === "complete") {
          event.graphics.forEach((g) => this.saveGraphic(g));
        }
      });

      await this.view.when();

      if (this.shapes) {
        this.restoreGraphics(JSON.parse(this.shapes));
      }
    },
    saveGraphic(graphic) {
      const detail = {
        geometry: graphic.geometry.toJSON(),
        symbol: graphic.symbol.toJSON(),
      };
      this.dispatchEvent(new CustomEvent("shape-save", {
        detail,
        bubbles: true,
        composed: true,
      }));
    },
    restoreGraphics(savedShapes) {
      savedShapes.forEach(({ geometry, symbol }) => {
        const graphic = new Graphic({
          geometry: Graphic.fromJSON({ geometry }).geometry,
          symbol: Graphic.fromJSON({ symbol }).symbol,
        });
        this.sketchLayer.add(graphic);
      });
    },
  }
});

export default MySketch3D;
