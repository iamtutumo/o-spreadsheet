import { Component } from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../../constants";
import { SpreadsheetChildEnv, Zone } from "../../../types";
import { css } from "../../helpers/css";

css/* scss */ `
  .o-border {
    position: absolute;
    &:hover {
      cursor: grab;
    }
  }
  .o-moving {
    cursor: grabbing;
  }
`;

type Orientation = "n" | "s" | "w" | "e";

interface Props {
  zone: Zone;
  orientation: Orientation;
  isMoving: boolean;
  onMoveHighlight: (x: number, y: number) => void;
}

export class Border extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.Border";
  get style() {
    const isTop = ["n", "w", "e"].includes(this.props.orientation);
    const isLeft = ["n", "w", "s"].includes(this.props.orientation);
    const isHorizontal = ["n", "s"].includes(this.props.orientation);
    const isVertical = ["w", "e"].includes(this.props.orientation);

    const s = this.env.model.getters.getActiveSheet();
    const z = this.props.zone;
    const margin = 2;

    const left = s.cols[z.left].start + margin;
    const right = s.cols[z.right].end - 2 * margin;
    const top = s.rows[z.top].start + margin;
    const bottom = s.rows[z.bottom].end - 2 * margin;

    const lineWidth = 4;
    const leftValue = isLeft ? left : right;
    const topValue = isTop ? top : bottom;
    const widthValue = isHorizontal ? right - left : lineWidth;
    const heightValue = isVertical ? bottom - top : lineWidth;

    const { offsetX, offsetY } = this.env.model.getters.getActiveSnappedViewport();
    return `
        left:${leftValue + HEADER_WIDTH - offsetX}px;
        top:${topValue + HEADER_HEIGHT - offsetY}px;
        width:${widthValue}px;
        height:${heightValue}px;
    `;
  }

  onMouseDown(ev: MouseEvent) {
    this.props.onMoveHighlight(ev.clientX, ev.clientY);
  }
}