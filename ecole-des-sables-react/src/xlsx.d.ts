declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [sheet: string]: any };
  }

  export interface WorkSheet {
    [cell: string]: any;
  }

  export const utils: {
    book_new: () => WorkBook;
    json_to_sheet: (data: any[]) => WorkSheet;
    book_append_sheet: (workbook: WorkBook, worksheet: WorkSheet, name: string) => void;
  };

  export function writeFile(workbook: WorkBook, filename: string): void;
}


