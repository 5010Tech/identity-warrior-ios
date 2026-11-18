export interface FieldOperations {
  value: any;
  setValue(value: any): any;
  insertListItem(value: any, index: number): any;
  removeListItem(index: number): any;
  filterListItems(
    filterFn: (value: any, index: number, array: any[]) => unknown,
  ): any;
}
