import { _t } from "../translation";
import {
  CellValue,
  CellValueType,
  CommandResult,
  EvaluatedCell,
  Position,
  SortDirection,
  SortOptions,
  SpreadsheetChildEnv,
  UID,
  Zone,
} from "../types";
import { isEqual } from "./zones";

type CellWithIndex = { index: number; type: CellValueType; value: any };

const SORT_TYPES: CellValueType[] = [
  CellValueType.number,
  CellValueType.error,
  CellValueType.text,
  CellValueType.boolean,
];

export function cellsSortingCriterion(sortingOrder: string) {
  const inverse = sortingOrder === "asc" ? 1 : -1;
  return (
    left: { type: CellValueType; value: CellValue },
    right: { type: CellValueType; value: CellValue }
  ) => {
    if (left.type === CellValueType.empty) {
      return right.type === CellValueType.empty ? 0 : 1;
    } else if (right.type === CellValueType.empty) {
      return -1;
    }
    let typeOrder = SORT_TYPES.indexOf(left.type) - SORT_TYPES.indexOf(right.type);
    if (typeOrder === 0) {
      if (left.type === CellValueType.text || left.type === CellValueType.error) {
        typeOrder = (left.value as string).localeCompare(right.value as string);
      } else {
        typeOrder = (left.value as number) - (right.value as number);
      }
    }
    return inverse * typeOrder;
  };
}

export function sortCells(
  cells: EvaluatedCell[],
  sortDirection: SortDirection,
  emptyCellAsZero: boolean
): CellWithIndex[] {
  const cellsWithIndex: CellWithIndex[] = cells.map((cell, index) => ({
    index,
    type: cell.type,
    value: cell.value,
  }));

  const cellsToSort = emptyCellAsZero
    ? cellsWithIndex.map((cell) =>
        cell.type === CellValueType.empty ? { ...cell, type: CellValueType.number, value: 0 } : cell
      )
    : cellsWithIndex;

  return cellsToSort.sort(cellsSortingCriterion(sortDirection));
}

export function interactiveSortSelection(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  anchor: Position,
  zone: Zone,
  sortDirection: SortDirection
) {
  //several columns => bypass the contiguity check
  let multiColumns: boolean = zone.right > zone.left;
  if (env.model.getters.doesIntersectMerge(sheetId, zone)) {
    multiColumns = false;
    let table: UID[];
    for (let row = zone.top; row <= zone.bottom; row++) {
      table = [];
      for (let col = zone.left; col <= zone.right; col++) {
        let merge = env.model.getters.getMerge({ sheetId, col, row });
        if (merge && !table.includes(merge.id.toString())) {
          table.push(merge.id.toString());
        }
      }
      if (table.length >= 2) {
        multiColumns = true;
        break;
      }
    }
  }

  if (multiColumns) {
    interactiveSort(env, sheetId, anchor, zone, sortDirection);
    return;
  }

  const contiguousZone = env.model.getters.getContiguousZone(sheetId, zone);
  if (isEqual(contiguousZone, zone)) {
    interactiveSort(env, sheetId, anchor, zone, sortDirection);
  } else {
    env.askConfirmation(
      _t(
        "We found data next to your selection. Since this data was not selected, it will not be sorted. Do you want to extend your selection?"
      ),
      () => interactiveSort(env, sheetId, anchor, contiguousZone, sortDirection),
      () => interactiveSort(env, sheetId, anchor, zone, sortDirection)
    );
  }
}

export function interactiveSort(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  anchor: Position,
  zone: Zone,
  sortDirection: SortDirection,
  sortOptions?: SortOptions
) {
  const result = env.model.dispatch("SORT_CELLS", {
    sheetId,
    col: anchor.col,
    row: anchor.row,
    zone,
    sortDirection,
    sortOptions,
  });
  if (result.isCancelledBecause(CommandResult.InvalidSortZone)) {
    const { col, row } = anchor;
    env.model.selection.selectZone({ cell: { col, row }, zone });
    env.raiseError(
      _t("Cannot sort. To sort, select only cells or only merges that have the same size.")
    );
  }
  if (result.isCancelledBecause(CommandResult.SortZoneWithArrayFormulas)) {
    const { col, row } = anchor;
    env.model.selection.selectZone({ cell: { col, row }, zone });
    env.raiseError(_t("Cannot sort a zone with array formulas."));
  }
}
