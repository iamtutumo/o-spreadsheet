import { Color } from "chart.js";
import { SCORECARD_CHART_TITLE_FONT_SIZE } from "../../../constants";
import { DOMDimension, Pixel, PixelPosition } from "../../../types";
import { BaselineArrowDirection, ScorecardChartRuntime } from "../../../types/chart";
import { getDefaultContextFont } from "../../text_helper";
import { chartMutedFontColor } from "./chart_common";

/* Padding at the border of the chart */
const CHART_PADDING = 10;
const BOTTOM_PADDING_RATIO = 0.05;

/* Maximum font sizes of each element */
const KEY_VALUE_FONT_SIZE = 32;
const BASELINE_MAX_FONT_SIZE = 16;

type ScorecardChartElement = {
  text: string;
  style: {
    font: string;
    color: Color;
    strikethrough?: boolean;
    underline?: boolean;
  };
  position: PixelPosition;
};

export type ScorecardChartConfig = {
  canvas: {
    width: number;
    height: number;
    backgroundColor: Color;
  };
  title?: ScorecardChartElement;
  baselineArrow?: {
    direction: BaselineArrowDirection;
    style: {
      size: Pixel;
      color: Color;
    };
    position: PixelPosition;
  };
  baseline?: ScorecardChartElement;
  baselineDescr?: ScorecardChartElement[];
  key?: ScorecardChartElement;
  progressBar?: {
    position: PixelPosition;
    dimension: DOMDimension;
    style: {
      color: Color;
      backgroundColor: Color;
    };
    value: number;
  };
};

export function formatBaselineDescr(
  baselineDescr: string | undefined,
  baseline: string | undefined
): string {
  const _baselineDescr = baselineDescr || "";
  return baseline && _baselineDescr ? " " + _baselineDescr : _baselineDescr;
}

export function getScorecardConfiguration(
  { width, height }: DOMDimension,
  runtime: ScorecardChartRuntime
): ScorecardChartConfig {
  const designer = new ScorecardChartConfigBuilder({ width, height }, runtime);
  return designer.computeDesign();
}

class ScorecardChartConfigBuilder {
  private context: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor({ width, height }: DOMDimension, readonly runtime: ScorecardChartRuntime) {
    const canvas = document.createElement("canvas");
    this.width = canvas.width = width;
    this.height = canvas.height = height;
    this.context = canvas.getContext("2d")!;
  }

  computeDesign(): ScorecardChartConfig {
    const structure: ScorecardChartConfig = {
      canvas: {
        width: this.width,
        height: this.height,
        backgroundColor: this.backgroundColor,
      },
    };
    const style = this.getTextStyles();

    let titleHeight = 0;
    if (this.title) {
      let x: number, titleWidth: number;
      ({ height: titleHeight, width: titleWidth } = this.getFullTextDimensions(
        this.title,
        style.title.font
      ));
      switch (this.runtime.title.align) {
        case "center":
          x = (this.width - titleWidth) / 2;
          break;
        case "right":
          x = this.width - titleWidth - CHART_PADDING;
          break;
        case "left":
        default:
          x = CHART_PADDING;
      }
      structure.title = {
        text: this.title,
        style: style.title,
        position: {
          x,
          y: CHART_PADDING + titleHeight / 2,
        },
      };
    }

    const baselineArrowSize = style.baselineArrow?.size ?? 0;

    let { height: baselineHeight, width: baselineWidth } = this.getTextDimensions(
      this.baseline,
      style.baselineValue.font
    );
    if (!this.baseline) {
      baselineHeight = this.getTextDimensions(this.baselineDescr, style.baselineDescr.font).height;
    }
    const baselineDescrWidth = this.getTextDimensions(
      this.baselineDescr,
      style.baselineDescr.font
    ).width;

    structure.baseline = {
      text: this.baseline,
      style: style.baselineValue,
      position: {
        x: (this.width - baselineWidth - baselineDescrWidth + baselineArrowSize) / 2,
        y: this.keyValue
          ? this.height * (1 - BOTTOM_PADDING_RATIO * (this.runtime.progressBar ? 1 : 2))
          : this.height - (this.height - titleHeight - baselineHeight) / 2 - CHART_PADDING,
      },
    };

    const minimalBaselinePosition = baselineArrowSize + CHART_PADDING * 2;
    if (structure.baseline.position.x < minimalBaselinePosition) {
      structure.baseline.position.x = minimalBaselinePosition;
    }

    if (style.baselineArrow && !this.runtime.progressBar) {
      structure.baselineArrow = {
        direction: this.baselineArrow,
        style: style.baselineArrow,
        position: {
          x: structure.baseline.position.x - baselineArrowSize,
          y: structure.baseline.position.y - (baselineHeight + baselineArrowSize) / 2,
        },
      };
    }

    if (this.baselineDescr) {
      const position = {
        x: structure.baseline.position.x + baselineWidth,
        y: structure.baseline.position.y,
      };
      structure.baselineDescr = [
        {
          text: this.baselineDescr,
          style: style.baselineDescr,
          position,
        },
      ];
    }

    let progressBarHeight = 0;
    if (this.runtime.progressBar) {
      progressBarHeight = this.height * 0.05;
      structure.progressBar = {
        position: {
          x: 2 * CHART_PADDING,
          y: this.height * (1 - 2 * BOTTOM_PADDING_RATIO) - baselineHeight - progressBarHeight,
        },
        dimension: {
          height: progressBarHeight,
          width: this.width - 4 * CHART_PADDING,
        },
        value: this.runtime.progressBar.value,
        style: {
          color: this.runtime.progressBar.color,
          backgroundColor: this.secondaryFontColor,
        },
      };
    }

    const { width: keyWidth, height: keyHeight } = this.getFullTextDimensions(
      this.keyValue,
      style.keyValue.font
    );
    if (this.keyValue) {
      structure.key = {
        text: this.keyValue,
        style: style.keyValue,
        position: {
          x: Math.max(CHART_PADDING, (this.width - keyWidth) / 2),
          y:
            this.height * (0.5 - BOTTOM_PADDING_RATIO * 2) +
            CHART_PADDING / 2 +
            (titleHeight + keyHeight / 2) / 2,
        },
      };
    }
    return structure;
  }

  private get title(): string {
    return this.runtime.title.text ?? "";
  }

  get keyValue() {
    return this.runtime.keyValue;
  }

  get baseline() {
    return this.runtime.baselineDisplay;
  }

  get baselineDescr() {
    return formatBaselineDescr(this.runtime.baselineDescr, this.baseline);
  }

  get baselineArrow() {
    return this.runtime.baselineArrow;
  }

  private get backgroundColor() {
    return this.runtime.background;
  }

  private get secondaryFontColor() {
    return chartMutedFontColor(this.backgroundColor);
  }

  private getTextDimensions(text: string, font: string) {
    this.context.font = font;
    const measure = this.context.measureText(text);
    return {
      width: measure.width,
      height: measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent,
    };
  }

  private getFullTextDimensions(text: string, font: string) {
    this.context.font = font;
    const measure = this.context.measureText(text);
    return {
      width: measure.width,
      height: measure.fontBoundingBoxAscent + measure.fontBoundingBoxDescent,
    };
  }

  private getTextStyles() {
    let baselineValueFontSize = BASELINE_MAX_FONT_SIZE;
    const baselineDescrFontSize = Math.floor(0.9 * baselineValueFontSize);
    if (this.runtime.progressBar) {
      baselineValueFontSize /= 1.5;
    }

    return {
      title: {
        font: getDefaultContextFont(
          this.runtime.title.fontSize ?? SCORECARD_CHART_TITLE_FONT_SIZE,
          this.runtime.title.bold,
          this.runtime.title.italic
        ),
        color: this.runtime.title.color ?? this.secondaryFontColor,
      },
      keyValue: {
        color: this.runtime.keyValueStyle?.textColor || this.runtime.fontColor,
        font: getDefaultContextFont(
          KEY_VALUE_FONT_SIZE,
          this.runtime.keyValueStyle?.bold,
          this.runtime.keyValueStyle?.italic
        ),
        strikethrough: this.runtime.keyValueStyle?.strikethrough,
        underline: this.runtime.keyValueStyle?.underline,
      },
      baselineValue: {
        font: getDefaultContextFont(
          baselineValueFontSize,
          this.runtime.baselineStyle?.bold,
          this.runtime.baselineStyle?.italic
        ),
        strikethrough: this.runtime.baselineStyle?.strikethrough,
        underline: this.runtime.baselineStyle?.underline,
        color:
          this.runtime.baselineStyle?.textColor ||
          this.runtime.baselineColor ||
          this.secondaryFontColor,
      },
      baselineDescr: {
        font: getDefaultContextFont(baselineDescrFontSize),
        color: this.secondaryFontColor,
      },
      baselineArrow:
        this.baselineArrow === "neutral" || this.runtime.progressBar
          ? undefined
          : {
              size: this.keyValue ? 0.8 * baselineValueFontSize : 0,
              color: this.runtime.baselineColor || this.secondaryFontColor,
            },
    };
  }
}
