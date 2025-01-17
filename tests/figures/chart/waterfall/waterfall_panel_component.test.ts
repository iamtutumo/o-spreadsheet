import { Model, SpreadsheetChildEnv, UID } from "../../../../src";
import { SidePanel } from "../../../../src/components/side_panel/side_panel/side_panel";
import { WaterfallChartDefinition } from "../../../../src/types/chart/waterfall_chart";
import {
  click,
  createTable,
  createWaterfallChart,
  getHTMLCheckboxValue,
  getHTMLInputValue,
  getHTMLRadioValue,
  setInputValueAndTrigger,
  simulateClick,
} from "../../../test_helpers";
import {
  editColorPicker,
  getColorPickerValue,
  openChartConfigSidePanel,
} from "../../../test_helpers/chart_helpers";
import { mountComponentWithPortalTarget } from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

function getWaterfallDefinition(chartId: UID): WaterfallChartDefinition {
  return model.getters.getChartDefinition(chartId) as WaterfallChartDefinition;
}

describe("Waterfall chart side panel", () => {
  beforeEach(async () => {
    model = new Model();
    createTable(model, "A1:C3");
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
  });

  describe("Config panel", () => {
    test("Waterfall config panel is correctly initialized", async () => {
      const chartId = createWaterfallChart(model, {
        dataSets: [{ dataRange: "A1:A3" }],
        labelRange: "B1:B3",
        dataSetsHaveTitle: true,
        aggregated: true,
      });
      await openChartConfigSidePanel(model, env, chartId);

      expect(getHTMLInputValue(".o-data-series input")).toEqual("A1:A3");
      expect(getHTMLInputValue(".o-data-labels input")).toEqual("B1:B3");
      expect(getHTMLCheckboxValue('input[name="aggregated"]')).toBe(true);
      expect(getHTMLCheckboxValue('input[name="dataSetsHaveTitle"]')).toBe(true);
    });

    test("Can change chart values in config side panel", async () => {
      const chartId = createWaterfallChart(model, {
        dataSets: [{ dataRange: "A1:A3" }],
        labelRange: "B1:B3",
        dataSetsHaveTitle: true,
        aggregated: true,
      });
      await openChartConfigSidePanel(model, env, chartId);

      await setInputValueAndTrigger(".o-data-labels input", "C1:C3");
      await simulateClick(".o-data-labels .o-selection-ok");
      expect(getWaterfallDefinition(chartId)?.labelRange).toEqual("C1:C3");

      await setInputValueAndTrigger(".o-data-series input", "B1:B3");
      await simulateClick(".o-data-series .o-selection-ok");
      expect(getWaterfallDefinition(chartId)?.dataSets).toEqual([{ dataRange: "B1:B3" }]);

      await simulateClick('input[name="aggregated"]');
      expect(getWaterfallDefinition(chartId)?.aggregated).toEqual(false);

      await simulateClick('input[name="dataSetsHaveTitle"]');
      expect(getWaterfallDefinition(chartId)?.dataSetsHaveTitle).toEqual(false);
    });
  });

  describe("Design panel", () => {
    test("Waterfall design panel is correctly initialized", async () => {
      const chartId = createWaterfallChart(model, {
        title: { text: "My Waterfall chart" },
        verticalAxisPosition: "right",
        legendPosition: "bottom",
        showSubTotals: true,
        showConnectorLines: true,
        positiveValuesColor: "#0000FF",
        negativeValuesColor: "#FFFF00",
        subTotalValuesColor: "#FF0000",
        background: "#00FF00",
        firstValueAsSubtotal: true,
      });
      await openChartConfigSidePanel(model, env, chartId);
      await click(fixture, ".o-panel-design");

      expect(getHTMLInputValue(".o-chart-title input")).toEqual("My Waterfall chart");
      expect(getHTMLRadioValue(".o-vertical-axis-selection")).toEqual("right");
      expect(getHTMLInputValue(".o-chart-legend-position")).toEqual("bottom");
      expect(getHTMLCheckboxValue('input[name="showSubTotals"]')).toBe(true);
      expect(getHTMLCheckboxValue('input[name="showConnectorLines"]')).toBe(true);
      expect(getHTMLCheckboxValue('input[name="firstValueAsSubtotal"]')).toBe(true);

      expect(getColorPickerValue(fixture, ".o-chart-background-color")).toEqual("#00FF00");
      expect(getColorPickerValue(fixture, ".o-waterfall-positive-color")).toEqual("#0000FF");
      expect(getColorPickerValue(fixture, ".o-waterfall-negative-color")).toEqual("#FFFF00");
      expect(getColorPickerValue(fixture, ".o-waterfall-subtotal-color")).toEqual("#FF0000");
    });

    test("Can change basic chart options", async () => {
      const chartId = createWaterfallChart(model, {});
      await openChartConfigSidePanel(model, env, chartId);
      await click(fixture, ".o-panel-design");

      await setInputValueAndTrigger(".o-chart-title input", "My Waterfall chart");
      await click(fixture, ".o-vertical-axis-selection input[value=right]");
      await setInputValueAndTrigger(".o-chart-legend-position", "bottom");

      const definition = getWaterfallDefinition(chartId);

      expect(definition?.title.text).toEqual("My Waterfall chart");
      expect(definition?.verticalAxisPosition).toEqual("right");
      expect(definition?.legendPosition).toEqual("bottom");
    });

    test("Can change waterfall-specific checkboxes", async () => {
      const chartId = createWaterfallChart(model, {
        showSubTotals: true,
        showConnectorLines: true,
        firstValueAsSubtotal: true,
      });
      await openChartConfigSidePanel(model, env, chartId);
      await click(fixture, ".o-panel-design");

      await simulateClick('input[name="showSubTotals"]');
      await simulateClick('input[name="showConnectorLines"]');
      await simulateClick('input[name="firstValueAsSubtotal"]');

      expect(getWaterfallDefinition(chartId)?.showSubTotals).toEqual(false);
      expect(getWaterfallDefinition(chartId)?.showConnectorLines).toEqual(false);
      expect(getWaterfallDefinition(chartId)?.firstValueAsSubtotal).toEqual(false);
    });

    test("Can change waterfall chart colors", async () => {
      const chartId = createWaterfallChart(model);
      await openChartConfigSidePanel(model, env, chartId);
      await click(fixture, ".o-panel-design");

      await editColorPicker(fixture, ".o-chart-background-color", "#A64D79");
      expect(getWaterfallDefinition(chartId)?.background).toEqual("#A64D79");

      await editColorPicker(fixture, ".o-waterfall-positive-color", "#BF9000");
      expect(getWaterfallDefinition(chartId)?.positiveValuesColor).toEqual("#BF9000");

      await editColorPicker(fixture, ".o-waterfall-negative-color", "#FF9900");
      expect(getWaterfallDefinition(chartId)?.negativeValuesColor).toEqual("#FF9900");

      await editColorPicker(fixture, ".o-waterfall-subtotal-color", "#0C343D");
      expect(getWaterfallDefinition(chartId)?.subTotalValuesColor).toEqual("#0C343D");
    });
  });
});
