export function imageFileFilter(allowedTypes: string[]) {
  return (
    _req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('INVALID_FILE_TYPE'), false);
      return;
    }

    cb(null, true);
  };
}
