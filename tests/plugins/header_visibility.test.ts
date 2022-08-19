import { CommandResult, Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toZone } from "../../src/helpers";
import {
  hideColumns,
  hideRows,
  merge,
  redo,
  setSelection,
  undo,
  unhideColumns,
  unhideRows,
} from "../test_helpers/commands_helpers";

//------------------------------------------------------------------------------
// Hide/unhide
//------------------------------------------------------------------------------

let model: Model;

describe("Hide Columns", () => {
  const sheetId = "1";
  beforeEach(() => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 6,
          rowNumber: 2,
        },
      ],
    });
  });

  test("hide single column", () => {
    hideColumns(model, ["B"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1]]);
  });

  test("hide multiple columns", () => {
    hideColumns(model, ["B", "E", "F"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1], [4, 5]]);
  });

  test("unhide columns", () => {
    hideColumns(model, ["B", "E", "F"]);
    unhideColumns(model, ["F"]);
    expect(model.getters.getHiddenColsGroups(sheetId)).toEqual([[1], [4]]);
  });

  test("Cannot hide columns on invalid sheetId", () => {
    expect(hideColumns(model, ["A"], "INVALID")).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });

  test("hide/unhide Column on small sheet", () => {
    model = new Model({
      sheets: [
        {
          colNumber: 5,
          rowNumber: 1,
        },
      ],
    });
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMaxViewportSize(sheet);
    hideColumns(model, ["B", "C", "D"], sheet.id);
    let dimensions2 = model.getters.getMaxViewportSize(sheet);
    expect(dimensions2.width).toEqual(dimensions.width - 3 * DEFAULT_CELL_WIDTH);
    unhideColumns(model, ["D"], sheet.id);
    dimensions2 = model.getters.getMaxViewportSize(sheet);
    expect(dimensions2.width).toEqual(dimensions.width - 2 * DEFAULT_CELL_WIDTH);
  });

  test("hide/ unhide Column on big sheet", () => {
    model = new Model();
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMaxViewportSize(sheet);
    hideColumns(model, ["B", "C", "D"], sheet.id);
    let dimensions2 = model.getters.getMaxViewportSize(sheet);
    expect(dimensions2.width).toEqual(dimensions.width - 3 * DEFAULT_CELL_WIDTH);
    unhideColumns(model, ["D"], sheet.id);
    dimensions2 = model.getters.getMaxViewportSize(sheet);
    expect(dimensions2.width).toEqual(dimensions.width - 2 * DEFAULT_CELL_WIDTH);
  });

  test("undo/redo hiding", () => {
    model = new Model();
    const beforeHidden = model.exportData();
    hideColumns(model, ["B"]);
    const afterHidden1 = model.exportData();
    unhideColumns(model, ["B"]);
    const afterUnhidden1 = model.exportData();
    hideColumns(model, ["D"]);
    const afterHidden2 = model.exportData();
    undo(model);
    expect(model).toExport(afterUnhidden1);
    redo(model);
    expect(model).toExport(afterHidden2);
    undo(model);
    undo(model);
    expect(model).toExport(afterHidden1);
    undo(model);
    expect(model).toExport(beforeHidden);
  });

  test("update selection when hiding one columns", () => {
    model = new Model();
    setSelection(model, ["E1:E4"]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("E1:E4"));
    hideColumns(model, ["E"]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("E1:E4"));
  });

  test("don't update selection when hiding a column within a merge", () => {
    model = new Model();
    merge(model, "A4:D4");
    setSelection(model, ["A1:A4"]);
    hideColumns(model, ["A"]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:D4")]);
  });

  test("update selection when hiding multiple columns", () => {
    model = new Model();
    setSelection(model, ["A1:A4", "E1:E4"]);
    hideColumns(model, ["A", "E"]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:A4"), toZone("E1:E4")]);
  });
});

describe("Hide Rows", () => {
  const sheetId = "2";
  beforeEach(() => {
    model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 2,
          rowNumber: 6,
        },
      ],
    });
  });

  test("hide single row", () => {
    hideRows(model, [1]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1]]);
  });

  test("hide multiple rows", () => {
    hideRows(model, [1, 4, 5]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1], [4, 5]]);
  });

  test("unhide rows", () => {
    hideRows(model, [1, 4, 5]);
    unhideRows(model, [5]);
    expect(model.getters.getHiddenRowsGroups(sheetId)).toEqual([[1], [4]]);
  });

  test("Cannot hide rows on invalid sheetId", () => {
    expect(hideRows(model, [0], "INVALID")).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });

  test("hide/unhide Row on small sheet", () => {
    model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 5,
        },
      ],
    });
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMaxViewportSize(sheet);
    hideRows(model, [1, 2, 3], sheet.id);
    let dimensions2 = model.getters.getMaxViewportSize(sheet);
    expect(dimensions2.height).toEqual(dimensions.height - 3 * DEFAULT_CELL_HEIGHT);
    unhideRows(model, [3], sheet.id);
    dimensions2 = model.getters.getMaxViewportSize(sheet);
    expect(dimensions2.height).toEqual(dimensions.height - 2 * DEFAULT_CELL_HEIGHT);
  });

  test("hide/ unhide Row on big sheet", () => {
    model = new Model();
    const sheet = model.getters.getActiveSheet();
    const dimensions = model.getters.getMaxViewportSize(sheet);
    hideRows(model, [1, 2, 3], sheet.id);
    let dimensions2 = model.getters.getMaxViewportSize(sheet);
    expect(dimensions2.height).toEqual(dimensions.height - 3 * DEFAULT_CELL_HEIGHT);
    unhideRows(model, [3], sheet.id);
    dimensions2 = model.getters.getMaxViewportSize(sheet);
    expect(dimensions2.height).toEqual(dimensions.height - 2 * DEFAULT_CELL_HEIGHT);
  });

  test("undo/redo hiding", () => {
    model = new Model();
    const beforeHidden = model.exportData();
    hideRows(model, [1]);
    const afterHidden1 = model.exportData();
    unhideRows(model, [1]);
    const afterUnhidden1 = model.exportData();
    hideRows(model, [3]);
    const afterHidden2 = model.exportData();
    undo(model);
    expect(model).toExport(afterUnhidden1);
    redo(model);
    expect(model).toExport(afterHidden2);
    undo(model);
    undo(model);
    expect(model).toExport(afterHidden1);
    undo(model);
    expect(model).toExport(beforeHidden);
  });

  test("update selection when hiding a single row", () => {
    model = new Model();
    setSelection(model, ["A3:D3"]);
    hideRows(model, [2]);
    expect(model.getters.getSelectedZone()).toEqual(toZone("A3:D3"));
  });

  test("update selection when hiding multiple rows", () => {
    model = new Model();
    const zone1 = toZone("A1:D1");
    const zone2 = toZone("A3:D3");
    setSelection(model, ["A1:D1", "A3:D3"]);
    hideRows(model, [0, 2]);
    expect(model.getters.getSelectedZones()).toEqual([zone1, zone2]);
  });

  test("don't update selection when hiding a row within a merge", () => {
    model = new Model();
    merge(model, "A4:D4");
    setSelection(model, ["A1:A4"]);
    hideRows(model, [0]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1:D4")]);
  });
});