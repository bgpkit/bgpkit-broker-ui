declare module "file-size" {
  interface FileSizeResult {
    human(format?: string): string;
  }
  function filesize(bytes: number): FileSizeResult;
  export default filesize;
}
