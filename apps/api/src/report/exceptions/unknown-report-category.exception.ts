export class UnknownReportCategoryException extends Error {
  constructor(category: string) {
    super(`No strategy found for report category: ${category}`);
    this.name = 'UnknownReportCategoryException';
  }
}
